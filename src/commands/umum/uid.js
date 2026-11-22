module.exports = {
  nama: 'uid',
  alias: ["id"],
  contoh: ["uid"],
  keterangan: "Menampilkan ID pengirim.",
  deskripsi: 'Lihat ID',
  kategori: 'umum',
  async jalankan({ balas, pengirim }) {
    return balas(`› ID: ${pengirim}`);
  }
};
