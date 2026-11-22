const { convertMedia } = require('../../media');
module.exports = {
  nama: 'toimg',
  alias: ["img"],
  contoh: ["toimg"],
  keterangan: "Balas stiker statis. Maksimal 10 MB.",
  deskripsi: 'Stiker ke foto',
  kategori: 'media',
  async jalankan({ balas, jid, pesan, konteks, unwrap, downloadMedia, sock }) {
    const media = unwrap(konteks.quotedMessage || pesan.message).stickerMessage;
    if (!media) return balas('› Balas stiker.');
    const image = await convertMedia({ media, tipe: 'sticker', downloadMedia, balas });
    if (image) return sock.sendMessage(jid, { image }, { quoted: pesan });
  }
};
