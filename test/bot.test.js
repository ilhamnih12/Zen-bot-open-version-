const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBot, content, findParticipant } = require('../src/bot');
const { createStore } = require('../src/store');
const { loadConfig } = require('../src/config');

function setup({ callerAdmin = true, botAdmin = true } = {}) {
  const sent = [], updates = [];
  const participants = [
    { id: '111@lid', phoneNumber: '62811@s.whatsapp.net', admin: callerAdmin ? 'admin' : null },
    { id: '222@lid', admin: null },
    { id: '999@s.whatsapp.net', admin: botAdmin ? 'admin' : null }
  ];
  const sock = { user: { id: '999:1@s.whatsapp.net' },
    sendMessage: async (...args) => { sent.push(args); },
    groupMetadata: async () => ({ participants }),
    groupSettingUpdate: async (...args) => { updates.push(args); },
    groupParticipantsUpdate: async (...args) => { updates.push(args); return [{ status: '200' }]; }
  };
  const states = {};
  const store = { welcome: id => !!states[id], setWelcome: (id, value) => { states[id] = value; } };
  return { sent, updates, states, sock, bot: createBot({ sock, store, config: { awalan: '!' }, downloadMedia: async () => Buffer.alloc(0) }) };
}
function message(text, group = true, ctx = {}) {
  return { key: { remoteJid: group ? 'group@g.us' : '111@lid', participant: group ? '111@lid' : undefined, id: 'abc' }, message: { extendedTextMessage: { text, contextInfo: ctx } } };
}
test('config validates number and prefix', () => {
  assert.throws(() => loadConfig('/nonexistent', {}), /nomor WhatsApp/);
  assert.equal(loadConfig('/nonexistent', { ZEN_NOMOR: '+62 812-3456-7890', ZEN_AWALAN: '!' }).nomor, '6281234567890');
  assert.throws(() => loadConfig('/nonexistent', { ZEN_NOMOR: '6281234567890', ZEN_AWALAN: 'a b' }), /Awalan/);
});
test('menu uses custom prefix and handles wrapped messages', async () => {
  const { bot, sent } = setup();
  await bot.handleMessage(message('!menu', false));
  assert.match(sent[0][1].text, /!welcome on\/off/);
  assert.equal(content({ ephemeralMessage: { message: { conversation: '!ping' } } }), '!ping');
});
test('untrusted or non-group caller cannot use admin commands', async () => {
  const a = setup({ callerAdmin: false });
  await a.bot.handleMessage(message('!tutup'));
  assert.match(a.sent[0][1].text, /Hanya untuk admin/);
  assert.equal(a.updates.length, 0);
  const b = setup();
  await b.bot.handleMessage(message('!tutup', false));
  assert.match(b.sent[0][1].text, /hanya untuk grup/i);
});
test('bot admin required, group settings and kick status checked', async () => {
  const a = setup({ botAdmin: false });
  await a.bot.handleMessage(message('!tutup'));
  assert.match(a.sent[0][1].text, /Bot harus jadi admin/);
  assert.equal(a.updates.length, 0);
  const b = setup();
  await b.bot.handleMessage(message('!tutup'));
  assert.deepEqual(b.updates[0], ['group@g.us', 'announcement']);
  await b.bot.handleMessage(message('!kick', true, { mentionedJid: ['222@lid'] }));
  assert.deepEqual(b.updates[1], ['group@g.us', ['222@lid'], 'remove']);
  await b.bot.handleMessage(message('!kick', true, { mentionedJid: ['111@lid'] }));
  assert.match(b.sent.at(-1)[1].text, /admin grup/);
  b.sock.groupParticipantsUpdate = async () => [{ status: '403' }];
  await b.bot.handleMessage(message('!kick', true, { participant: '222@lid' }));
  assert.match(b.sent.at(-1)[1].text, /Gagal/);
});
test('welcome is opt-in, toggled by admin, and per group', async () => {
  const { bot, sent } = setup();
  await bot.handleParticipants({ id: 'group@g.us', action: 'add', participants: ['222@lid'] });
  assert.equal(sent.length, 0);
  await bot.handleMessage(message('!welcome on'));
  await bot.handleParticipants({ id: 'group@g.us', action: 'add', participants: ['222@lid'] });
  assert.deepEqual(sent.at(-1)[1].mentions, ['222@lid']);
  await bot.handleMessage(message('!welcome off'));
  const count = sent.length;
  await bot.handleParticipants({ id: 'group@g.us', action: 'remove', participants: ['222@lid'] });
  assert.equal(sent.length, count);
});
test('groups persist and identifiers from different domains are not conflated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-test-'));
  try {
    createStore(dir).setWelcome('a@g.us', true);
    assert.equal(createStore(dir).welcome('a@g.us'), true);
    assert.equal(findParticipant([{ id: '123@lid' }], ['123@s.whatsapp.net']), undefined);
    assert.ok(findParticipant([{ id: '123@lid', phoneNumber: '6281@s.whatsapp.net' }], ['6281@s.whatsapp.net']));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('self and non-command messages are ignored', async () => {
  const { bot, sent } = setup();
  const m = message('!menu'); m.key.fromMe = true;
  await bot.handleMessage(m);
  await bot.handleMessage(message('hello'));
  assert.equal(sent.length, 0);
});
test('image to sticker and sticker to image work with quoted media', async () => {
  const sharp = require('sharp');
  const photo = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
  const sent = [];
  const sock = { sendMessage: async (...args) => sent.push(args) };
  const bot = createBot({ sock, config: { awalan: '.' }, store: {}, downloadMedia: async () => photo });
  await bot.handleMessage(message('.stiker', false, { quotedMessage: { imageMessage: { fileLength: photo.length } } }));
  assert.equal((await sharp(sent[0][1].sticker).metadata()).format, 'webp');
  await bot.handleMessage(message('.toimg', false, { quotedMessage: { stickerMessage: { fileLength: photo.length } } }));
  assert.equal((await sharp(sent[1][1].image).metadata()).format, 'png');
  await bot.handleMessage(message('.toimg', false, { quotedMessage: { stickerMessage: { isAnimated: true } } }));
  assert.match(sent[2][1].text, /animasi/);
  await bot.handleMessage(message('.stiker', false, { quotedMessage: { viewOnceMessage: { message: { imageMessage: {} } } } }));
  assert.match(sent[3][1].text, /Kirim atau balas foto/);
});
test('status is registered while ping still works', async () => {
  const { bot, sent } = setup();
  await bot.handleMessage(message('!status', false));
  assert.match(sent[0][1].text, /Ekonomi belum tersedia/);
  await bot.handleMessage(message('!ping', false));
  assert.match(sent[1][1].text, /Bot aktif/);
});

test('commands are discovered automatically, including custom commands and menu', async () => {
  const { loadCommands } = require('../src/command-handler');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-cmd-'));
  try {
    fs.mkdirSync(path.join(dir, 'umum'));
    fs.copyFileSync(path.join(__dirname, '../src/commands/umum/menu.js'), path.join(dir, 'umum/menu.js'));
    fs.writeFileSync(path.join(dir, 'umum/halo.js'), `module.exports = { nama: 'halo', alias: ['hai'], kategori: 'umum', deskripsi: 'Sapa', async jalankan({balas}) { return balas('Halo!'); } };`);
    const registry = loadCommands(dir);
    const sent = [];
    const bot = createBot({ sock: { sendMessage: async (...args) => sent.push(args) }, config: { awalan: '!' }, store: {}, registry });
    await bot.handleMessage(message('!hai', false));
    assert.equal(sent.at(-1)[1].text, 'Halo!');
    await bot.handleMessage(message('!menu', false));
    assert.match(sent.at(-1)[1].text, /!halo \(!hai\) — Sapa/);
    await bot.handleMessage(message('!menu hai', false));
    assert.match(sent.at(-1)[1].text, /Alias: !hai/);
    assert.match(sent.at(-1)[1].text, /!halo/);
    fs.writeFileSync(path.join(dir, 'umum/duplikat.js'), `module.exports = { nama: 'hai', kategori: 'umum', deskripsi: 'Duplikat', jalankan() {} };`);
    assert.throws(() => loadCommands(dir), /duplikat/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('invalid permission declarations fail closed', () => {
  const { loadCommands } = require('../src/command-handler');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-invalid-'));
  try {
    fs.mkdirSync(path.join(dir, 'grup'));
    fs.writeFileSync(path.join(dir, 'grup/invalid.js'), `module.exports = { nama: 'invalid', kategori: 'grup', deskripsi: 'Test', admin: 'true', jalankan() {} };`);
    assert.throws(() => loadCommands(dir), /tidak valid/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('aliases, group validation and admin identity mapping remain intact', async () => {
  const { bot, sent, updates } = setup();
  await bot.handleMessage(message('!help', false));
  assert.match(sent.at(-1)[1].text, /ZEN BOT v0\.1/);
  const m = message('!buka');
  m.key.participant = '62811@s.whatsapp.net';
  await bot.handleMessage(m);
  assert.deepEqual(updates.at(-1), ['group@g.us', 'not_announcement']);
  await bot.handleMessage(message('!welcome'));
  assert.match(sent.at(-1)[1].text, /!welcome on\/off/);
});

test('media size limits are enforced before and after download', async () => {
  const sent = [];
  let downloads = 0;
  const bot = createBot({ sock: { sendMessage: async (...args) => sent.push(args) }, config: { awalan: '.' }, store: {}, downloadMedia: async () => { downloads++; return Buffer.alloc(10 * 1024 * 1024 + 1); } });
  await bot.handleMessage(message('.stiker', false, { quotedMessage: { imageMessage: { fileLength: 11 * 1024 * 1024 } } }));
  assert.equal(downloads, 0);
  assert.match(sent.at(-1)[1].text, /10 MB/);
  await bot.handleMessage(message('.stiker', false, { quotedMessage: { imageMessage: {} } }));
  assert.equal(downloads, 1);
  assert.match(sent.at(-1)[1].text, /10 MB/);
});

test('built-in messages use concise symbol decoration', async () => {
  const { bot, sent } = setup();
  await bot.handleMessage(message('!menu', false));
  assert.match(sent.at(-1)[1].text, /^〔 ZEN BOT v0\.1 〕\nby edinst/);
  assert.match(sent.at(-1)[1].text, /— GRUP \/ ADMIN —/);
  await bot.handleMessage(message('!ping', false));
  assert.match(sent.at(-1)[1].text, /^› Bot aktif/);
});

test('default prefix is slash and remains configurable', async () => {
  const config = loadConfig('/nonexistent', { ZEN_NOMOR: '6281234567890' });
  assert.equal(config.awalan, '/');
  assert.equal(loadConfig('/nonexistent', { ZEN_NOMOR: '6281234567890', ZEN_AWALAN: '!' }).awalan, '!');
  const sent = [];
  const bot = createBot({ sock: { sendMessage: async (...args) => sent.push(args) }, config, store: {} });
  await bot.handleMessage(message('/menu', false));
  assert.match(sent[0][1].text, /\/menu \(\/m\) — Daftar perintah/);
  assert.match(sent[0][1].text, /\/welcome on\/off/);
  await bot.handleMessage(message('/tidakada', false));
  assert.match(sent[1][1].text, /\/menu/);
  await bot.handleMessage(message('.menu', false));
  assert.equal(sent.length, 2);
});

test('every built-in command has unique registered aliases and usage examples', () => {
  const { loadCommands } = require('../src/command-handler');
  const { commands, byName } = loadCommands();
  for (const command of commands) {
    assert.ok(command.alias?.length, `${command.nama} has no alias`);
    assert.ok(command.contoh?.length, `${command.nama} has no usage examples`);
    for (const alias of command.alias) assert.equal(byName.get(alias), command);
  }
});

test('menu shows command information for names, aliases, prefixes and roles', async () => {
  const { bot, sent } = setup();
  await bot.handleMessage(message('!m st', false));
  assert.match(sent.at(-1)[1].text, /〔 STATUS 〕/);
  assert.match(sent.at(-1)[1].text, /Alias: !st/);
  assert.match(sent.at(-1)[1].text, /!status/);
  await bot.handleMessage(message('!menu !wc', false));
  assert.match(sent.at(-1)[1].text, /〔 WELCOME 〕/);
  assert.match(sent.at(-1)[1].text, /admin grup/);
  assert.match(sent.at(-1)[1].text, /!welcome on/);
  await bot.handleMessage(message('!menu kick', false));
  assert.match(sent.at(-1)[1].text, /bot admin/);
  await bot.handleMessage(message('!menu !bnk', false));
  assert.match(sent.at(-1)[1].text, /!bank bayar <jumlah\|lunas>/);
  await bot.handleMessage(message('!menu xyz', false));
  assert.match(sent.at(-1)[1].text, /Perintah tidak ditemukan.*!menu/);
  await bot.handleMessage(message('!menu bank extra', false));
  assert.match(sent.at(-1)[1].text, /Pakai !menu <perintah>/);
});

test('short aliases dispatch normally and retain permission checks', async () => {
  const { bot, sent, states } = setup();
  await bot.handleMessage(message('!p', false));
  assert.match(sent.at(-1)[1].text, /Bot aktif/);
  await bot.handleMessage(message('!wc on'));
  assert.equal(states['group@g.us'], true);
  const outsider = setup({ callerAdmin: false });
  await outsider.bot.handleMessage(message('!wc off'));
  assert.match(outsider.sent.at(-1)[1].text, /Hanya untuk admin/);
});
