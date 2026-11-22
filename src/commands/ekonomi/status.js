const { runEconomy } = require('../../economy-command');
const { status } = require('../../economy-actions');
module.exports = {
  nama: 'status',
  alias: ["st"],
  contoh: ["status"],
  keterangan: "Menampilkan saldo, level, pekerjaan, dan utang.", deskripsi: 'Saldo, level & pekerjaan', kategori: 'ekonomi',
  async jalankan(ctx) { return runEconomy(ctx, data => status({ ...data, prefix: ctx.awalan })); }
};
