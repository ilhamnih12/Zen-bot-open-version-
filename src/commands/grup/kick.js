module.exports = {
  nama: 'kick',
  alias: ["k"],
  contoh: ["kick @anggota", "kick"],
  keterangan: "Mention atau balas pesan anggota.",
  pemakaian: 'kick @anggota',
  deskripsi: 'Keluarkan anggota',
  kategori: 'grup',
  admin: true,
  botAdmin: true,
  async jalankan({ balas, awalan, konteks, participants, findParticipant, sock, jid }) {
    const targetId = konteks.mentionedJid?.[0] || konteks.participant;
    if (!targetId) return balas(`› Mention atau balas anggota: ${awalan}kick @anggota`);
    const target = findParticipant(participants, [targetId]);
    if (!target) return balas('› Anggota tidak ditemukan.');
    if (target.admin) return balas('› Tidak bisa mengeluarkan admin grup.');
    const result = await sock.groupParticipantsUpdate(jid, [target.id], 'remove');
    if (!Array.isArray(result) || !result.length || result.some(item => String(item.status) !== '200')) return balas('› Gagal mengeluarkan anggota.');
    return balas('› Anggota dikeluarkan.');
  }
};
