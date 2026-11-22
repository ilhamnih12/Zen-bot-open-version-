module.exports = {
  nama: 'buka',
  alias: ["b"],
  contoh: ["buka"],
  keterangan: "Membuka chat grup untuk semua anggota.",
  deskripsi: 'Buka grup',
  kategori: 'grup',
  admin: true,
  botAdmin: true,
  async jalankan({ balas, sock, jid }) {
    await sock.groupSettingUpdate(jid, 'not_announcement');
    return balas('› Grup dibuka. Semua anggota bisa chat.');
  }
};
