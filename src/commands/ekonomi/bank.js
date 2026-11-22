const { runEconomy } = require('../../economy-command');
const { bank } = require('../../economy-actions');
module.exports = {
  nama: 'bank',
  alias: ["bnk"],
  contoh: ["bank", "bank cek", "bank bunga", "bank nabung <jumlah>", "bank ambil <jumlah>", "bank pinjam <jumlah>", "bank bayar <jumlah|lunas>"],
  keterangan: "Bank hanya menerima Zdolar.", deskripsi: 'Tabungan & pinjaman', kategori: 'ekonomi',
  async jalankan(ctx) { return runEconomy(ctx, bank(ctx.args, ctx.awalan)); }
};
