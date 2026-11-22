const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEconomy, ADMIN, amount, z } = require('../src/economy');
const { status, work, train, bank, pinjol, transfer } = require('../src/economy-actions');
const { createBot } = require('../src/bot');
const { resolveIdentity } = require('../src/economy-identity');
const A = '628111111111@s.whatsapp.net', B = '628222222222@s.whatsapp.net';
const D = 86400000;
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-economy-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let time = Date.UTC(2026, 0, 1, 12), seq = 0;
  const econ = createEconomy(dir, { now: () => time });
  const exec = (who, action, id = `m${++seq}`) => econ.execute(who, id, action);
  const read = () => JSON.parse(fs.readFileSync(path.join(dir, 'economy.json'))).users;
  return { dir, econ, exec, read, advance: ms => { time += ms; }, time: () => time };
}
test('career cooldown, taxes, promotions, training and persistence', t => {
  const f = fixture(t), run = (args) => f.exec(A, work(args, '/'));
  assert.match(run([]), /lamar dulu/i);
  assert.match(run(['lamar', '1']), /Diterima/);
  assert.match(run([]), /196 Zcoin/);
  assert.match(run([]), /Sudah bekerja/);
  assert.equal(f.read()[A].coin, 196);
  assert.equal(f.read()[ADMIN].coin, 4);
  assert.match(f.exec(A, train('2', '/')), /teknik \+2/);
  assert.equal(f.read()[A].coin, 166);
  assert.equal(f.read()[ADMIN].coin, 7);
  assert.match(f.exec(A, train('2', '/')), /Tunggu 6 jam/);
  f.advance(D); run([]); f.advance(D); assert.match(run([]), /Gaji naik/);
  f.advance(D); assert.match(run([]), /240 Zcoin/);
  assert.equal(createEconomy(f.dir, { now: f.time }).execute(A, 'restart', status).includes('Pekerja umum'), true);
  assert.match(run(['resign']), /Resign berhasil/);
  assert.match(run(['lamar', '2']), /Syarat belum cukup/);
  assert.match(run(['lamar', '1']), /Diterima/);
  assert.match(run([]), /Sudah bekerja/);
});
test('automatic conversion is taxed and credits the real admin account', t => {
  const f = fixture(t);
  const output = f.exec(A, ({ user, creditCoin }) => { creditCoin(user, 2500); return 'ok'; });
  assert.match(output, /2000 Zcoin → 1,900 Zdolar \(pajak 0,100\)/);
  assert.equal(f.read()[A].coin, 500);
  assert.equal(f.read()[A].dollar, 1900);
  assert.equal(f.read()[ADMIN].dollar, 100);
});
test('transfer conserves value, handles carry, conversions and self protection at command level', t => {
  const f = fixture(t);
  f.exec(A, ({ user }) => { user.coin = 500; user.dollar = 5000; return 'seed'; });
  assert.match(f.exec(A, transfer(B, 'zcoin', '100', '/')), /pajak 2/);
  assert.equal(f.read()[B].coin, 98);
  assert.equal(f.read()[ADMIN].coin, 2);
  assert.match(f.exec(A, transfer(B, 'zdolar', '1,500', '/')), /pajak 0,030/);
  assert.equal(f.read()[B].dollar, 1470);
  assert.equal(f.read()[ADMIN].dollar, 30);
  assert.match(f.exec(A, transfer(B, 'zdolar', '10000', '/')), /tidak cukup/);
  assert.equal(f.read()[A].dollar, 3500);
  for (let i = 0; i < 49; i++) f.exec(A, transfer(B, 'zcoin', '1', '/'));
  assert.match(f.exec(A, transfer(B, 'zcoin', '1', '/')), /terlalu kecil/);
  f.exec(A, transfer(B, 'zcoin', '2', '/'));
  assert.equal(f.read()[ADMIN].coin, 3);
});
test('bank interest, taxes, loan interest, early repayment and restart', t => {
  const f = fixture(t);
  f.exec(A, ({ user }) => { user.dollar = 10000; return 'seed'; });
  assert.match(f.exec(A, bank(['nabung', '5'], '/')), /pajak 0,050/);
  assert.equal(f.read()[A].bank, 4950);
  f.advance(D);
  f.exec(A, bank(['cek'], '/'));
  assert.equal(f.read()[A].bank, 4972); // 24 milli gross, 2 milli tax
  assert.equal(f.read()[ADMIN].dollar, 52);
  assert.match(f.exec(A, bank(['pinjam', '2'], '/')), /Diterima 1,960/);
  f.advance(2 * D);
  assert.match(f.exec(A, bank(['cek'], '/')), /Utang bank: 2,040/);
  const result = f.exec(A, bank(['bayar', 'lunas'], '/'));
  assert.match(result, /Sisa utang: 0,000/);
  assert.equal(f.read()[A].loans.bank, undefined);
  assert.match(f.exec(A, bank(['ambil', '1'], '/')), /pajak 0,010/);
});
test('pinjol limits, debt ceiling, idempotence and rollback on failure', t => {
  const f = fixture(t);
  assert.match(f.exec(A, pinjol(['pinjam', '5'], '/')), /Batas pinjaman/);
  assert.match(f.exec(A, pinjol(['pinjam', '4'], '/'), 'unique'), /Diterima 3,800/);
  assert.equal(f.exec(A, pinjol(['pinjam', '4'], '/'), 'unique'), null);
  f.advance(1000 * D);
  f.exec(A, pinjol(['cek'], '/'));
  assert.equal(f.read()[A].loans.pinjol.owed, 8000);
  const snapshot = JSON.stringify(f.read());
  assert.match(f.exec(A, pinjol(['bayar', 'lunas'], '/')), /tidak cukup/);
  assert.equal(JSON.stringify(f.read()), snapshot);
});
test('amounts reject invalid numbers and ambiguous formats', () => {
  assert.equal(amount('1,500', 'zdolar'), 1500);
  assert.equal(z(1500), '1,500');
  for (const s of ['-1', '0', '1e4', '0,0001', '1,000,000', 'NaN', '99999999999999999999']) assert.equal(amount(s, 'zdolar'), null);
  assert.equal(amount('1,2', 'zcoin'), null);
});
test('identity resolution fails closed and maps LID to PN', async () => {
  const sock = { signalRepository: { lidMapping: { getPNForLID: async () => A } } };
  assert.equal(await resolveIdentity(sock, '123@lid'), A);
  assert.equal(await resolveIdentity({}, '123@lid'), null);
  assert.equal(await resolveIdentity({}, '123@lid', A), A);
  assert.equal(await resolveIdentity({}, '123@g.us', A), null);
});
test('command help and training reply are bound to sender and prompt', async t => {
  const f = fixture(t); let count = 0;
  const sent = [];
  const sock = { sendMessage: async (jid, content) => { sent.push({ jid, content }); return { key: { id: `out${++count}` } }; } };
  const bot = createBot({ sock, config: { awalan: '/' }, store: {}, economy: f.econ });
  let n = 0;
  const send = (text, sender = A, ctx = {}) => bot.handleMessage({ key: { remoteJid: sender, id: `in${++n}` }, message: { extendedTextMessage: { text, contextInfo: ctx } } });
  await send('/bank'); assert.match(sent.at(-1).content.text, /\/bank nabung/);
  await send('/pinjol'); assert.match(sent.at(-1).content.text, /3\. Bayar/);
  await send('/transfer'); assert.match(sent.at(-1).content.text, /\/transfer @orang/);
  await send('/kerja'); assert.match(sent.at(-1).content.text, /\/kerja lamar/);
  await send('/kerja lamar 1'); await send('/kerja');
  await send('/latih'); const prompt = sent.at(-1); assert.match(prompt.content.text, /Balas nomor/);
  const promptId = `out${count}`;
  await send('1', B, { stanzaId: promptId }); assert.equal(f.read()[B], undefined);
  await send('1', A, { stanzaId: 'wrong' }); assert.equal(f.read()[A].skills.komunikasi, 0);
  await send('1', A, { stanzaId: promptId }); assert.equal(f.read()[A].skills.komunikasi, 2);
  await send('1', A, { stanzaId: promptId }); assert.equal(f.read()[A].skills.komunikasi, 2);
});

test('pinjol menu reply grants a loan only to the requesting user', async t => {
  const f = fixture(t); let n = 0, msg = 0; const sent = [];
  const sock = { sendMessage: async (_jid, content) => { sent.push(content.text); return { key: { id: `out${++msg}` } }; } };
  const bot = createBot({ sock, config: { awalan: '/' }, store: {}, economy: f.econ });
  const send = (text, who = A, quoted = '') => bot.handleMessage({ key: { remoteJid: who, id: `msg${++n}` }, message: { extendedTextMessage: { text, contextInfo: { stanzaId: quoted } } } });
  await send('/pinjol'); assert.match(sent.at(-1), /Balas angka/);
  await send('2', B, 'out1'); assert.equal(msg, 1);
  await send('2', A, 'out1'); assert.match(sent.at(-1), /Balas jumlah/);
  await send('2', A, 'out2');
  assert.match(sent.at(-1), /Diterima 1,900/);
  assert.equal(f.read()[A].loans.pinjol.owed, 2000);
  await send('2', A, 'out2'); assert.equal(f.read()[A].loans.pinjol.owed, 2000);
});

test('experience rolls over and career requirements are enforced', t => {
  const f = fixture(t);
  f.exec(A, ({ user }) => { user.exp = 95; user.coin = 90; return 'seed'; });
  assert.match(f.exec(A, train('1', '/')), /EXP \+10/);
  assert.equal(f.read()[A].level, 1);
  assert.equal(f.read()[A].exp, 5);
  assert.match(f.exec(A, work(['lamar', '2'], '/')), /Syarat belum cukup/);
  f.advance(6 * 3600000);
  f.exec(A, train('1', '/'));
  assert.match(f.exec(A, work(['lamar', '2'], '/')), /Kurir/);
});

test('failed disk write leaves balances and transaction id uncommitted', t => {
  const f = fixture(t);
  f.exec(A, ({ user }) => { user.coin = 100; return 'seed'; });
  const rename = fs.renameSync;
  try {
    fs.renameSync = () => { throw new Error('disk error'); };
    assert.throws(() => f.exec(A, train('1', '/'), 'retry'), /disk error/);
  } finally { fs.renameSync = rename; }
  assert.equal(f.read()[A].coin, 100);
  assert.match(f.exec(A, train('1', '/'), 'retry'), /komunikasi \+2/);
  assert.equal(f.read()[A].coin, 70);
});

test('transfer command blocks self and resolves mapped LIDs', async t => {
  const f = fixture(t); let n = 0; const sent = [];
  const sock = { signalRepository: { lidMapping: { getPNForLID: async id => id === '111@lid' ? A : B } }, sendMessage: async (_, c) => { sent.push(c.text); } };
  const bot = createBot({ sock, config: { awalan: '/' }, store: {}, economy: f.econ });
  f.exec(A, ({ user }) => { user.coin = 200; return 'seed'; });
  const send = target => bot.handleMessage({ key: { remoteJid: 'group@g.us', participant: '111@lid', id: `i${++n}` }, message: { extendedTextMessage: { text: `/transfer @${target.split('@')[0]} zcoin 100`, contextInfo: { mentionedJid: [target] } } } });
  await send('111@lid'); assert.match(sent.at(-1), /diri sendiri/);
  await send('222@lid'); assert.match(sent.at(-1), /mendapat 98 zcoin/);
  assert.equal(f.read()[B].coin, 98);
});

test('a rejected transaction cannot be replayed after the balance changes', t => {
  const f = fixture(t);
  assert.match(f.exec(A, transfer(B, 'zcoin', '100', '/'), 'rejected'), /tidak cukup/);
  f.exec(A, ({ user }) => { user.coin = 200; return 'seed'; });
  assert.equal(f.exec(A, transfer(B, 'zcoin', '100', '/'), 'rejected'), null);
  assert.equal(f.read()[A].coin, 200);
  assert.equal(f.read()[B], undefined);
});

test('economy aliases dispatch with arguments and keep transaction rules', async t => {
  const f = fixture(t); let msg = 0; const sent = [];
  const sock = { sendMessage: async (_, c) => sent.push(c.text) };
  const bot = createBot({ sock, config: { awalan: '/' }, store: {}, economy: f.econ });
  const send = text => bot.handleMessage({ key: { remoteJid: A, id: `alias${++msg}` }, message: { conversation: text } });
  await send('/kj lamar 1'); assert.match(sent.at(-1), /Diterima/);
  await send('/kj'); assert.match(sent.at(-1), /196 Zcoin/);
  await send('/lt 1'); assert.match(sent.at(-1), /komunikasi \+2/);
  await send('/st'); assert.match(sent.at(-1), /Pekerja umum/);
  await send('/bnk'); assert.match(sent.at(-1), /\/bank cek/);
});
