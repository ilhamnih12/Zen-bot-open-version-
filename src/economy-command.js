const { resolveIdentity } = require('./economy-identity');
async function runEconomy(ctx, action) {
  if (!ctx.economy) return ctx.balas('› Ekonomi belum tersedia.');
  if (!ctx.pesan.key.id) return ctx.balas('› ID pesan tidak tersedia. Coba lagi.');
  const alt = ctx.pesan.key.participantAlt || ctx.pesan.key.remoteJidAlt;
  const id = await resolveIdentity(ctx.sock, ctx.pengirim, alt);
  if (!id) return ctx.balas('› ID akun belum terverifikasi. Coba lagi nanti.');
  const result = ctx.economy.execute(id, `${ctx.jid}:${ctx.pesan.key.id || ''}`, action);
  if (result) return ctx.balas(result);
}
module.exports = { runEconomy };
