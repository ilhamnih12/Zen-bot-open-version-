const { runEconomy } = require('../../economy-command');
const { work } = require('../../economy-actions');
module.exports = {
  nama: 'kerja',
  alias: ["kj"],
  contoh: ["kerja", "kerja daftar", "kerja info", "kerja lamar <nomor>", "kerja resign"],
  keterangan: "Kerja sekali per hari, reset 00.00 WIB.", deskripsi: 'Karier & gaji', kategori: 'ekonomi',
  async jalankan(ctx) { return runEconomy(ctx, work(ctx.args, ctx.awalan)); }
};
