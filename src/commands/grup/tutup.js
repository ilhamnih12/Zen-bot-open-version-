module.exports = {
  nama: 'tutup',
  alias: ["t"],
  contoh: ["tutup"],
  keterangan: "Membatasi chat grup hanya untuk admin.",
  deskripsi: 'Tutup grup',
  kategori: 'grup',
  admin: true,
  botAdmin: true,
  async jalankan({ balas, sock, jid }) {
    await sock.groupSettingUpdate(jid, 'announcement');
    return balas('› Grup ditutup. Hanya admin bisa chat.');
  }
};
