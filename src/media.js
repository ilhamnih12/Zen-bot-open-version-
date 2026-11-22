const sharp = require('sharp');
const LIMIT = 10 * 1024 * 1024;

async function convertMedia({ media, tipe, downloadMedia, balas }) {
  if (media.isAnimated) { await balas('› Stiker animasi belum didukung.'); return null; }
  if (Number(media.fileLength || 0) > LIMIT) { await balas('› Maksimal 10 MB.'); return null; }
  const buffer = await downloadMedia(media, tipe);
  if (buffer.length > LIMIT) { await balas('› Maksimal 10 MB.'); return null; }
  const image = sharp(buffer, { limitInputPixels: 25000000 });
  return tipe === 'image'
    ? image.resize(512, 512, { fit: 'contain', background: '#00000000' }).webp().toBuffer()
    : image.png().toBuffer();
}
module.exports = { convertMedia };
