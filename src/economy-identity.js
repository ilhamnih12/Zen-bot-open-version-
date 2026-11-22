const { validJid } = require('./economy');
function clean(id) { return typeof id === 'string' ? id.replace(/:\d+(?=@)/, '') : ''; }
async function resolveIdentity(sock, primary, alternate) {
  const first = clean(primary), alt = clean(alternate);
  if (validJid(first)) return first;
  if (!/^\d+@lid$/.test(first)) return null;
  if (validJid(alt)) return alt; // alternative supplied by Baileys, not message text
  try {
    const mapped = clean(await sock.signalRepository?.lidMapping?.getPNForLID(first));
    return validJid(mapped) ? mapped : null;
  } catch { return null; }
}
module.exports = { resolveIdentity };
