const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
  });

  await connection.query("CREATE DATABASE IF NOT EXISTS lapordesa");
  console.log("Database lapordesa berhasil dibuat");

  await connection.end();
}

main().catch((err) => {
  console.error("Gagal membuat database:", err.message);
});