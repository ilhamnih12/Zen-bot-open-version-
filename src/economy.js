const fs = require('node:fs');
const path = require('node:path');

// Zcoin adalah bilangan bulat; Zdolar disimpan sebagai seperseribu (mZD).
const ADMIN = '6285867420646@s.whatsapp.net';
const MAX = 1000000000000;
const DAY = 86400000;
const JOBS = [
  { name: 'Pekerja umum', salary: 200, tax: 2, level: 0 },
  { name: 'Kurir', salary: 350, tax: 3, level: 1, skill: 'komunikasi', need: 4 },
  { name: 'Teknisi', salary: 650, tax: 4, level: 3, skill: 'teknik', need: 8 },
  { name: 'Analis', salary: 1000, tax: 5, level: 5, skill: 'logika', need: 12 }
];
const SKILLS = ['komunikasi', 'teknik', 'logika'];
const z = n => `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}`;
const day = now => Math.floor((now + 7 * 3600000) / DAY);
function fresh(now) { return { coin: 0, dollar: 0, bank: 0, bankDay: day(now), bankRemainder: 0, level: 0, exp: 0, job: null, workedDay: null, workCount: 0, trainedAt: null, skills: { komunikasi: 0, teknik: 0, logika: 0 }, loans: {}, taxCarry: {} }; }
function amount(value, currency) {
  if (typeof value !== 'string') return null;
  if (currency === 'zcoin') {
    if (!/^[1-9]\d{0,8}$/.test(value)) return null;
    return Number(value);
  }
  if (!/^(?:0|[1-9]\d{0,8})(?:[.,]\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const n = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return n > 0 && n <= MAX ? n : null;
}
function validJid(id) { return /^\d{8,15}@s\.whatsapp\.net$/.test(id || ''); }
function salary(user) { const job = JOBS[user.job]; return Math.floor(job.salary * (user.workCount >= 10 ? 140 : user.workCount >= 3 ? 120 : 100) / 100); }
function createEconomy(dataDir, { now = () => Date.now() } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'economy.json');
  let state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { version: 1, users: {}, processed: {} };
  if (state.version !== 1 || !state.users || !state.processed) throw new Error('Data ekonomi tidak valid.');
  function commit(next, key, currentTime) {
    next.processed[key] = currentTime;
    const keys = Object.keys(next.processed);
    for (const old of keys.slice(0, Math.max(0, keys.length - 20000))) delete next.processed[old];
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(tmp, file);
    state = next;
  }
  function execute(id, messageId, operation) {
    if (!validJid(id) || !messageId || typeof messageId !== 'string') return '› ID akun belum terverifikasi. Coba lagi nanti.';
    const currentTime = now();
    const next = structuredClone(state);
    const key = `${id}:${messageId}`;
    if (next.processed[key]) return null;
    const users = next.users;
    const user = users[id] ||= fresh(currentTime);
    const admin = users[ADMIN] ||= fresh(currentTime);
    const conversions = [];
    function tax(who, currency, base, pct, kind) {
      const carryKey = `${currency}:${kind}`;
      const value = base * pct + (who.taxCarry[carryKey] || 0);
      const fee = Math.floor(value / 100);
      who.taxCarry[carryKey] = value % 100;
      admin[currency] += fee;
      return fee;
    }
    function settle(who) {
      const today = day(currentTime);
      if (today < who.bankDay) throw new Error('Waktu sistem mundur.');
      while (who.bankDay < today) {
        if (who.bank > 0) {
          const raw = who.bank * 5 + who.bankRemainder;
          const interest = Math.min(Math.floor(raw / 1000), MAX - who.bank);
          who.bankRemainder = who.bank + interest === MAX ? 0 : raw % 1000;
          const fee = tax(who, 'dollar', interest, 10, 'bunga');
          who.bank += interest - fee;
          if (who.bank > MAX) throw new Error('Batas saldo bank tercapai.');
        }
        who.bankDay++;
      }
      for (const [kind, loan] of Object.entries(who.loans)) {
        if (today < loan.day) throw new Error('Waktu sistem mundur.');
        while (loan.day < today) {
          const raw = loan.owed * (kind === 'bank' ? 1 : 3) + loan.remainder;
          const interest = Math.min(Math.floor(raw / 100), loan.principal - loan.totalInterest);
          loan.remainder = interest === loan.principal - loan.totalInterest ? 0 : raw % 100;
          loan.owed += interest;
          loan.totalInterest += interest;
          loan.day++;
        }
      }
    }
    settle(user);
    function convert(who, whoId) {
      const count = Math.floor(who.coin / 1000);
      if (!count) return;
      who.coin -= count * 1000;
      const gross = count * 1000;
      const fee = tax(who, 'dollar', gross, 5, 'konversi');
      who.dollar += gross - fee;
      if (whoId === id) conversions.push(`› Konversi ${count * 1000} Zcoin → ${z(gross - fee)} Zdolar (pajak ${z(fee)}).`);
    }
    function creditCoin(who, value) { who.coin += value; }
    function experience(value) { user.exp += value; user.level += Math.floor(user.exp / 100); user.exp %= 100; }
    function fail(text) { throw new UserError(text); }
    let text;
    try {
      text = operation({ user, users, admin, now: currentTime, today: day(currentTime), tax, creditCoin, experience, fail, settle });
      for (const [whoId, who] of Object.entries(users)) {
        if (who.coin >= 1000) convert(who, whoId);
      }
      for (const who of Object.values(users)) {
        for (const field of ['coin', 'dollar', 'bank']) {
          if (!Number.isSafeInteger(who[field]) || who[field] < 0 || who[field] > MAX) throw new Error('Batas saldo tercapai.');
        }
      }
    } catch (error) {
      if (error instanceof UserError) {
        // Record a rejected request too, so a replay cannot succeed later when funds change.
        commit(structuredClone(state), key, currentTime);
        return `› ${error.message}`;
      }
      throw error;
    }
    commit(next, key, currentTime);
    return [text, ...conversions].filter(Boolean).join('\n');
  }
  return { execute };
}
class UserError extends Error {}
module.exports = { createEconomy, JOBS, SKILLS, ADMIN, z, day, amount, salary, validJid, fresh };
