const { loadCommands, runCommand } = require('./command-handler');

// JID LID dan nomor telepon tidak dianggap sama tanpa pemetaan dari WhatsApp.
function normalize(jid) { return typeof jid === 'string' ? jid.replace(/:\d+(?=@)/, '') : ''; }
function ids(participant) {
  return [participant?.id, participant?.jid, participant?.lid, participant?.phoneNumber].map(normalize).filter(Boolean);
}
function findParticipant(participants, candidates) {
  const names = candidates.map(normalize).filter(Boolean);
  return participants.find(p => ids(p).some(id => names.includes(id)));
}
function unwrap(message) {
  let m = message || {};
  for (let i = 0; i < 5; i++) {
    const wrapped = m.ephemeralMessage || m.documentWithCaptionMessage;
    if (!wrapped?.message) break;
    m = wrapped.message;
  }
  return m;
}
function content(message) {
  const m = unwrap(message);
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
}
function context(message) {
  const m = unwrap(message);
  return m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || {};
}
function createBot({ sock, config, store, downloadMedia, economy, registry = loadCommands() }) {
  const interactionPrompts = new Map();
  function savePrompt(key, id, kind) {
    for (const [entry, prompt] of interactionPrompts) if (prompt.expires < Date.now()) interactionPrompts.delete(entry);
    if (interactionPrompts.size >= 5000 && !interactionPrompts.has(key)) interactionPrompts.delete(interactionPrompts.keys().next().value);
    interactionPrompts.set(key, { id, kind, expires: Date.now() + 5 * 60000 });
  }
  async function handleMessage(pesan) {
    if (!pesan?.message || !pesan.key?.remoteJid || pesan.key.fromMe || pesan.key.remoteJid === 'status@broadcast') return;
    const body = content(pesan.message).trim();
    if (!body.startsWith(config.awalan)) {
      const promptKey = `${pesan.key.remoteJid}:${pesan.key.participant || pesan.key.remoteJid}`;
      const prompt = interactionPrompts.get(promptKey);
      if (!prompt) return;
      if (Date.now() > prompt.expires) { interactionPrompts.delete(promptKey); return; }
      if (context(pesan.message).stanzaId !== prompt.id) return;
      const jid = pesan.key.remoteJid;
      const balas = text => sock.sendMessage(jid, { text }, { quoted: pesan });
      const { runEconomy } = require('./economy-command');
      const { train, pinjol } = require('./economy-actions');
      const ctx = { economy, jid, pesan, pengirim: pesan.key.participant || jid, sock, balas };
      if (prompt.kind === 'latih') {
        if (!/^[1-3]$/.test(body)) return;
        interactionPrompts.delete(promptKey);
        return runEconomy(ctx, train(body, config.awalan));
      }
      if (prompt.kind === 'pinjol-menu') {
        if (!/^[1-3]$/.test(body)) return;
        interactionPrompts.delete(promptKey);
        if (body === '1') return runEconomy(ctx, pinjol(['cek'], config.awalan));
        const kind = body === '2' ? 'pinjam' : 'bayar';
        const message = await balas(`› Balas jumlah Zdolar, contoh 1,500${kind === 'bayar' ? ', atau lunas' : ''}.`);
        if (message?.key?.id) savePrompt(promptKey, message.key.id, `pinjol-${kind}`);
        return;
      }
      if (prompt.kind === 'pinjol-pinjam' || prompt.kind === 'pinjol-bayar') {
        const { amount } = require('./economy');
        const kind = prompt.kind.slice('pinjol-'.length);
        if (!amount(body, 'zdolar') && !(kind === 'bayar' && body.toLowerCase() === 'lunas')) return balas(`› Jumlah salah. Balas contoh 1,500 atau buka ${config.awalan}pinjol lagi.`);
        interactionPrompts.delete(promptKey);
        return runEconomy(ctx, pinjol([kind, body.toLowerCase()], config.awalan));
      }
    }
    const [name, ...args] = body.slice(config.awalan.length).trim().split(/\s+/);
    if (!name) return;
    const jid = pesan.key.remoteJid;
    const balas = text => sock.sendMessage(jid, { text }, { quoted: pesan });
    const command = registry.byName.get(name.toLowerCase());
    if (!command) return balas(`› Perintah tidak ditemukan. Ketik ${config.awalan}menu.`);
    return runCommand({ command, jid, pengirim: pesan.key.participant || jid, pesan, sock, balas,
      findParticipant, args, awalan: config.awalan, store, economy, downloadMedia, unwrap,
      setInteraction: (id, kind) => savePrompt(`${jid}:${pesan.key.participant || jid}`, id, kind),
      konteks: context(pesan.message), daftarPerintah: registry.commands });
  }
  async function handleParticipants(update) {
    if (!store.welcome(update.id) || !['add', 'remove'].includes(update.action)) return;
    for (const participant of update.participants || []) {
      const jid = typeof participant === 'string' ? participant : participant.id;
      if (!jid) continue;
      const text = update.action === 'add' ? 'Selamat datang' : 'Sampai jumpa';
      await sock.sendMessage(update.id, { text: `› ${text}, @${jid.split('@')[0]}!`, mentions: [jid] });
    }
  }
  return { handleMessage, handleParticipants };
}
module.exports = { createBot, normalize, findParticipant, unwrap, content };
