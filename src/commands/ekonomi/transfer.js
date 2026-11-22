const { runEconomy } = require('../../economy-command');
const { resolveIdentity } = require('../../economy-identity');
const { transfer } = require('../../economy-actions');
module.exports = {
  nama: 'transfer',
  alias: ["tf"],
  contoh: ["transfer @orang zcoin 100", "transfer @orang zdolar 1,500", "transfer zcoin 100"],
  keterangan: "Mention penerima atau balas pesannya. Pajak 2%.", deskripsi: 'Kirim Zcoin / Zdolar', kategori: 'ekonomi',
  async jalankan(ctx) {
    const usage = `〔 TRANSFER 〕\n› ${ctx.awalan}transfer @orang zcoin 100\n› ${ctx.awalan}transfer @orang zdolar 1,500\n› Atau balas pesan: ${ctx.awalan}transfer zcoin 100\n› Pajak 2% dipotong dari jumlah.`;
    const mentioned = ctx.konteks.mentionedJid?.[0];
    const raw = mentioned || ctx.konteks.participant;
    const args = mentioned ? ctx.args.filter(a => !a.startsWith('@')) : ctx.args;
    if (!raw || args.length !== 2 || !['zcoin', 'zdolar'].includes(args[0].toLowerCase())) return ctx.balas(usage);
    const target = await resolveIdentity(ctx.sock, raw);
    const sender = await resolveIdentity(ctx.sock, ctx.pengirim, ctx.pesan.key.participantAlt || ctx.pesan.key.remoteJidAlt);
    if (!target || !sender) return ctx.balas('› ID pengirim atau penerima belum terverifikasi. Coba lagi nanti.');
    if (target === sender) return ctx.balas('› Tidak bisa transfer ke diri sendiri.');
    return runEconomy(ctx, transfer(target, args[0].toLowerCase(), args[1], ctx.awalan));
  }
};
