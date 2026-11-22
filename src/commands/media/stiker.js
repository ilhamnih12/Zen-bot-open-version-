const { convertMedia } = require('../../media');
module.exports = {
  nama: 'stiker',
  alias: ["s"],
  contoh: ["stiker"],
  keterangan: "Kirim foto dengan caption atau balas foto. Maksimal 10 MB.",
  deskripsi: 'Foto ke stiker',
  kategori: 'media',
  async jalankan({ balas, jid, pesan, konteks, unwrap, downloadMedia, sock }) {
    const media = unwrap(konteks.quotedMessage || pesan.message).imageMessage;
    if (!media) return balas('› Kirim atau balas foto.');
    const sticker = await convertMedia({ media, tipe: 'image', downloadMedia, balas });
    if (sticker) return sock.sendMessage(jid, { sticker }, { quoted: pesan });
  }
};
