const path = require('node:path');
const fs = require('node:fs');
const pino = require('pino');
const { loadConfig } = require('./config');
const { createStore } = require('./store');
const { createBot } = require('./bot');
const { createEconomy } = require('./economy');

async function start() {
  const config = loadConfig();
  const store = createStore(config.dataDir);
  const economy = createEconomy(config.dataDir);
  const baileys = await import('@whiskeysockets/baileys');
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = baileys;
  const sessionDir = path.join(config.dataDir, 'session');
  fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  let stopped = false;
  let reconnectTimer;
  let activeSocket;
  let delay = 1000;
  async function connect() {
    if (stopped) return;
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['Ubuntu', 'Chrome', '20.0.04'], syncFullHistory: false });
    activeSocket = sock;
    let pairingRequested = false;
    const bot = createBot({ sock, config, store, economy, downloadMedia: async (media, type) => {
      const stream = await downloadContentFromMessage(media, type);
      const chunks = []; let size = 0;
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > 10 * 1024 * 1024) throw new Error('Media melebihi 10 MB.');
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (sock !== activeSocket || stopped) return;
      if (qr && !state.creds.registered && !pairingRequested) {
        pairingRequested = true;
        try {
          const code = await sock.requestPairingCode(config.nomor);
          console.log(`\n[Zen] Kode pairing: ${code.match(/.{1,4}/g)?.join('-') || code}\nMasukkan di WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon. Jangan bagikan kode ini.`);
        } catch (error) {
          console.error('[Zen] Gagal meminta kode pairing:', error.message);
          pairingRequested = false;
          // A fresh connection provides a new QR event on which to retry.
          sock.end(new Error('Pairing gagal'));
        }
      }
      if (connection === 'open') { delay = 1000; console.log('[Zen] Terhubung. Ketik ' + config.awalan + 'menu di WhatsApp.'); }
      if (connection === 'close') {
        activeSocket = null;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          stopped = true;
          console.error('[Zen] Sesi keluar. Hapus data/session lalu jalankan ulang untuk pairing.');
          process.exitCode = 1;
          return;
        }
        console.log(`[Zen] Koneksi terputus. Mencoba lagi dalam ${delay / 1000} detik.`);
        reconnectTimer = setTimeout(() => connect().catch(error => { console.error('[Zen] Gagal terhubung:', error.message); process.exitCode = 1; }), delay);
        delay = Math.min(delay * 2, 30000);
      }
    });
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) bot.handleMessage(m).catch(async error => {
        console.error('[Zen] Perintah gagal:', error.message);
        try { if (m.key?.remoteJid) await sock.sendMessage(m.key.remoteJid, { text: '› Perintah gagal. Coba lagi.' }, { quoted: m }); } catch (sendError) { console.error('[Zen] Gagal mengirim respons:', sendError.message); }
      });
    });
    sock.ev.on('group-participants.update', update => bot.handleParticipants(update).catch(error => console.error('[Zen] Sambutan gagal:', error.message)));
  }
  const shutdown = () => { stopped = true; clearTimeout(reconnectTimer); activeSocket?.end(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  console.log('[Zen] Zen bot v0.1 • edinst');
  await connect();
}
module.exports = { start };
