const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pengaduan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama VARCHAR(100) NOT NULL,
      judul VARCHAR(150) NOT NULL,
      isi TEXT NOT NULL,
      foto_url TEXT,
      status VARCHAR(50) DEFAULT 'Diajukan',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS pengajuan_surat (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama VARCHAR(100) NOT NULL,
      jenis_surat VARCHAR(100) NOT NULL,
      keperluan TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Diproses',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/health", (req, res) => {
  res.json({ status: "OK", app: "LaporDesa" });
});

app.get("/pengaduan", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pengaduan ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database belum terkoneksi" });
  }
});

app.post("/pengaduan", upload.single("foto"), async (req, res) => {
  try {
    const { nama, judul, isi } = req.body;
    let fotoUrl = null;

    if (!nama || !isi) {
      return res.status(400).json({
        success: false,
        message: "Nama dan isi pengaduan wajib diisi",
      });
    }

    if (req.file) {
      const fileKey = `pengaduan/${crypto.randomUUID()}-${req.file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: fileKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      fotoUrl = `${process.env.CLOUDFRONT_URL}/${fileKey}`;
    }

    const [result] = await db.query(
      "INSERT INTO pengaduan (nama, judul, isi, foto_url) VALUES (?, ?, ?, ?)",
      [nama, judul || "Pengaduan Masyarakat", isi, fotoUrl]
    );

    res.json({
      success: true,
      message: "Pengaduan berhasil dibuat",
      id: result.insertId,
      foto_url: fotoUrl,
    });
  } catch (err) {
    console.error("Error pengaduan:", err.message);

    res.status(500).json({
      success: false,
      message: "Gagal menyimpan pengaduan",
      error: err.message,
    });
  }
});

app.get("/pengajuan-surat", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pengajuan_surat ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database belum terkoneksi" });
  }
});

app.post("/pengajuan-surat", async (req, res) => {
  try {
    const { nama, jenis_surat, keperluan } = req.body;

    if (!nama || !jenis_surat || !keperluan) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    const [result] = await db.query(
      "INSERT INTO pengajuan_surat (nama, jenis_surat, keperluan) VALUES (?, ?, ?)",
      [nama, jenis_surat, keperluan]
    );

    res.json({
      success: true,
      message: "Pengajuan surat berhasil dibuat",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Error pengajuan surat:", err.message);

    res.status(500).json({
      success: false,
      message: "Gagal menyimpan pengajuan surat",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.error("Database belum terkoneksi, app tetap jalan:", err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`LaporDesa running on port ${PORT}`);
    });
  });