const fs = require('node:fs');
const path = require('node:path');

function loadConfig(root = path.join(__dirname, '..'), env = process.env) {
  const file = path.join(root, 'config.json');
  let config = {};
  if (fs.existsSync(file)) config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nomor = String(env.ZEN_NOMOR || config.nomor || '').replace(/[\s+()-]/g, '');
  const awalan = env.ZEN_AWALAN || config.awalan || '/';
  if (!/^\d{8,15}$/.test(nomor)) throw new Error('Isi nomor WhatsApp dengan kode negara (contoh 6281234567890) di config.json atau ZEN_NOMOR.');
  if (typeof awalan !== 'string' || !awalan.trim() || /\s/.test(awalan) || awalan.length > 5) throw new Error('Awalan harus 1–5 karakter tanpa spasi.');
  return { nomor, awalan, dataDir: path.join(root, 'data') };
}
module.exports = { loadConfig };
