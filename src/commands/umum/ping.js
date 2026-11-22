module.exports = {
  nama: 'ping',
  alias: ["p"],
  contoh: ["ping"],
  keterangan: "Menampilkan waktu aktif bot.",
  deskripsi: 'Cek bot',
  kategori: 'umum',
  async jalankan({ balas }) {
    return balas(`› Bot aktif • ${Math.floor(process.uptime())} detik`);
  }
};
