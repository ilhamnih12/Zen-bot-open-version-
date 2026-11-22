const { runEconomy } = require('../../economy-command');
const { train, trainHelp } = require('../../economy-actions');
module.exports = {
  nama: 'latih',
  alias: ["lt"],
  contoh: ["latih", "latih 1"],
  keterangan: "Balas nomor latihan atau gunakan angkanya langsung. Jeda 6 jam.", deskripsi: 'Tingkatkan kemampuan', kategori: 'ekonomi',
  async jalankan(ctx) {
    if (ctx.args.length === 1 && /^[1-3]$/.test(ctx.args[0])) return runEconomy(ctx, train(ctx.args[0], ctx.awalan));
    const result = await ctx.balas(trainHelp(ctx.awalan));
    if (ctx.args.length === 0 && result?.key?.id) ctx.setInteraction(result.key.id, 'latih');
  }
};
