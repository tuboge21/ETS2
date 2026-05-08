const pengaduanForm = document.getElementById("pengaduanForm");
const suratForm = document.getElementById("suratForm");

pengaduanForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const hasil = document.getElementById("hasilPengaduan");
  hasil.innerText = "Mengirim pengaduan...";

  const formData = new FormData();
  formData.append("nama", document.getElementById("nama").value);
  formData.append("judul", document.getElementById("judul").value);
  formData.append("isi", document.getElementById("isi").value);

  const foto = document.getElementById("foto").files[0];
  if (foto) formData.append("foto", foto);

  try {
    const response = await fetch("/pengaduan", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      hasil.innerHTML = `
        <p>Pengaduan berhasil dikirim.</p>
        ${data.foto_url ? `<a href="${data.foto_url}" target="_blank">Lihat foto via CloudFront</a>` : ""}
      `;
      pengaduanForm.reset();
      loadData();
    } else {
      hasil.innerText = data.message || "Gagal mengirim pengaduan.";
    }
  } catch (err) {
    hasil.innerText = "Error: " + err.message;
  }
});

suratForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const hasil = document.getElementById("hasilSurat");
  hasil.innerText = "Mengirim pengajuan surat...";

  const payload = {
    nama: document.getElementById("namaSurat").value,
    jenis_surat: document.getElementById("jenisSurat").value,
    keperluan: document.getElementById("keperluan").value
  };

  try {
    const response = await fetch("/pengajuan-surat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      hasil.innerText = "Pengajuan surat berhasil dikirim.";
      suratForm.reset();
      loadData();
    } else {
      hasil.innerText = data.message || "Gagal mengirim pengajuan surat.";
    }
  } catch (err) {
    hasil.innerText = "Error: " + err.message;
  }
});

async function loadData() {
  const listPengaduan = document.getElementById("listPengaduan");
  const listSurat = document.getElementById("listSurat");

  listPengaduan.innerHTML = "Memuat data pengaduan...";
  listSurat.innerHTML = "Memuat data pengajuan surat...";

  try {
    const pengaduanRes = await fetch("/pengaduan");
    const pengaduan = await pengaduanRes.json();

    listPengaduan.innerHTML = pengaduan.length
      ? pengaduan.map(item => `
          <div class="item">
            <b>${item.judul}</b><br>
            Nama: ${item.nama}<br>
            Isi: ${item.isi}<br>
            Status: <b>${item.status}</b><br>
            ${item.foto_url ? `<a href="${item.foto_url}" target="_blank">Lihat Foto</a>` : ""}
          </div>
        `).join("")
      : "Belum ada pengaduan.";

    const suratRes = await fetch("/pengajuan-surat");
    const surat = await suratRes.json();

    listSurat.innerHTML = surat.length
      ? surat.map(item => `
          <div class="item">
            <b>${item.jenis_surat}</b><br>
            Nama: ${item.nama}<br>
            Keperluan: ${item.keperluan}<br>
            Status: <b>${item.status}</b>
          </div>
        `).join("")
      : "Belum ada pengajuan surat.";
  } catch (err) {
    listPengaduan.innerHTML = "Gagal memuat data.";
    listSurat.innerHTML = "Gagal memuat data.";
  }
}

loadData();