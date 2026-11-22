const { JOBS, SKILLS, z, amount, salary, day } = require('./economy');
const title = text => `〔 ${text} 〕`;
const number = n => n.toLocaleString('id-ID');
function infoJob(u) {
  if (u.job === null) return '› Belum bekerja.';
  const job = JOBS[u.job], gross = salary(u);
  return `› ${job.name} • Gaji ${number(gross)} Zcoin/hari\n› Pajak ${job.tax}% • Kerja ${u.workCount} hari\n› Naik gaji: ${u.workCount < 3 ? `${u.workCount}/3 hari` : u.workCount < 10 ? `${u.workCount}/10 hari` : 'maksimal'}`;
}
function status({ user, today, prefix = '/' }) {
  const loans = ['bank', 'pinjol'].map(k => `${k}: ${z(user.loans[k]?.owed || 0)}`).join(' • ');
  return `${title('STATUS')}\n› Zcoin: ${number(user.coin)}\n› Zdolar: ${z(user.dollar)}\n› Tabungan: ${z(user.bank)} Zdolar\n› Level: ${user.level} • EXP: ${user.exp}/100\n${infoJob(user)}\n› Kerja hari ini: ${user.workedDay === today ? 'sudah' : 'belum'}\n› Komunikasi ${user.skills.komunikasi} • Teknik ${user.skills.teknik} • Logika ${user.skills.logika}\n› Utang ${loans} Zdolar
› Mulai: ${prefix}kerja daftar • Bantuan: ${prefix}bank`;
}
function workHelp(p) { return `${title('KERJA')}\n› ${p}kerja — terima gaji\n› ${p}kerja daftar — pilihan & syarat\n› ${p}kerja info — gaji & progres\n› ${p}kerja lamar <nomor>\n› ${p}kerja resign`; }
function work(args, p) { return x => {
  const { user: u, today, tax, creditCoin, experience, fail } = x;
  const sub = args[0]?.toLowerCase();
  if (sub === 'daftar' && args.length === 1) return `${title('PEKERJAAN')}\n${JOBS.map((j, i) => `${i + 1}. ${j.name} — ${j.salary} Zcoin/hari • pajak ${j.tax}%\n   Syarat: level ${j.level}${j.skill ? `, ${j.skill} ${j.need}` : ''}`).join('\n')}\n› Lamar: ${p}kerja lamar <nomor>`;
  if (sub === 'info' && args.length === 1) return `${title('KERJA')}\n${infoJob(u)}${u.job === null ? '' : `\n› Gaji bersih perkiraan: ${salary(u) - Math.floor(salary(u) * JOBS[u.job].tax / 100)} Zcoin\n› +20% setelah 3 hari, +40% setelah 10 hari.\n› Kerja hari ini: ${u.workedDay === today ? 'sudah' : 'belum'}.`}\n› ${p}kerja daftar`;
  if (sub === 'resign' && args.length === 1) { if (u.job === null) fail('Kamu belum bekerja.'); u.job = null; u.workCount = 0; return `› Resign berhasil. Pilih lagi: ${p}kerja daftar`; }
  if (sub === 'lamar' && args.length === 2 && /^[1-4]$/.test(args[1])) {
    const index = Number(args[1]) - 1, job = JOBS[index];
    if (u.job !== null) fail(`Resign dulu: ${p}kerja resign`);
    if (u.level < job.level || (job.skill && u.skills[job.skill] < job.need)) fail(`Syarat belum cukup. Lihat ${p}kerja daftar dan ${p}latih.`);
    u.job = index; u.workCount = 0; return `› Diterima sebagai ${job.name}. Mulai: ${p}kerja`;
  }
  if (args.length) return workHelp(p);
  if (u.job === null) return workHelp(p) + `\n› Belum punya pekerjaan. Lamar dulu.`;
  if (u.workedDay === today) fail('Sudah bekerja hari ini. Coba lagi setelah 00.00 WIB.');
  const job = JOBS[u.job], gross = salary(u), fee = tax(u, 'coin', gross, job.tax, 'gaji');
  creditCoin(u, gross - fee); experience(15); u.workedDay = today; u.workCount++;
  const promotion = u.workCount === 3 || u.workCount === 10 ? '\n› Gaji naik mulai kerja berikutnya.' : '';
  return `${title('GAJI')}\n› ${job.name}: ${gross} Zcoin\n› Pajak ${job.tax}%: ${fee} Zcoin\n› Diterima: ${gross - fee} Zcoin • EXP +15${promotion}`;
}; }
function train(index, p) { return ({ user: u, now, tax, experience, fail }) => {
  if (!/^[1-3]$/.test(index || '')) return null;
  if (u.trainedAt !== null && now - u.trainedAt < 6 * 3600000) fail('Latihan belum siap. Tunggu 6 jam sejak latihan terakhir.');
  if (u.coin < 30) fail(`Butuh 30 Zcoin. Dapatkan lewat ${p}kerja.`);
  u.coin -= 30; const fee = tax(u, 'coin', 30, 10, 'latih');
  const skill = SKILLS[Number(index) - 1]; u.skills[skill] += 2; u.trainedAt = now; experience(10);
  return `${title('LATIH')}\n› ${skill} +2 • EXP +10\n› Biaya 30 Zcoin (pajak ${fee}).`;
}; }
const trainHelp = p => `${title('LATIH')}\n1. Komunikasi\n2. Teknik\n3. Logika\n› 30 Zcoin termasuk pajak • +2 kemampuan, +10 EXP\n› Jeda 6 jam. Balas nomor dalam 5 menit atau ketik ${p}latih 1/2/3.`;
function bank(args, p) { return x => {
  const { user: u, today, tax, fail } = x;
  const sub = args[0]?.toLowerCase();
  const help = `${title('BANK')}\n› ${p}bank cek • saldo & utang\n› ${p}bank bunga • aturan bunga\n› ${p}bank nabung <jumlah>\n› ${p}bank ambil <jumlah>\n› ${p}bank pinjam <jumlah>\n› ${p}bank bayar <jumlah|lunas>\n› Hanya Zdolar; contoh jumlah: 1,500\n› Pajak nabung/ambil 1%, pinjam/bayar 2%.\n› Maks pinjam: 2 × (level + 1) Zdolar.`;
  if (!sub) return help;
  if (sub === 'cek' && args.length === 1) return `${title('BANK')}\n› Saku: ${z(u.dollar)} Zdolar\n› Tabungan: ${z(u.bank)} Zdolar\n› Utang bank: ${z(u.loans.bank?.owed || 0)} Zdolar\n› ${p}bank bunga`;
  if (sub === 'bunga' && args.length === 1) return `${title('BUNGA BANK')}\n› Tabungan 0,5%/hari; pajak bunga 10%.\n› Utang 1%/hari; total bunga maksimal pokok.\n› Dihitung per pergantian hari WIB.`;
  if (!['nabung', 'ambil', 'pinjam', 'bayar'].includes(sub) || args.length !== 2) return help;
  return bankOperation(x, 'bank', sub, args[1], p);
}; }
function bankOperation({ user: u, today, tax, fail }, lender, sub, value, p) {
  const rate = lender === 'bank' ? (sub === 'nabung' || sub === 'ambil' ? 1 : 2) : 5;
  let n = value === 'lunas' && sub === 'bayar' ? null : amount(value, 'zdolar');
  if (n === null && !(value === 'lunas' && sub === 'bayar')) fail(lender === 'bank' ? `Jumlah salah. Contoh: ${p}bank nabung 1,500` : `Jumlah salah. Buka ${p}pinjol lagi.`);
  const debt = u.loans[lender];
  if (sub === 'bayar') {
    if (!debt) fail('Tidak ada utang.');
    // Find the smallest gross payment whose net settles the debt, accounting for tax carry.
    if (n === null) {
      const carry = u.taxCarry[`dollar:${lender}-bayar`] || 0;
      let lo = debt.owed, hi = Math.ceil((debt.owed * 100 + 100) / (100 - rate));
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (mid - Math.floor((mid * rate + carry) / 100) >= debt.owed) hi = mid; else lo = mid + 1; }
      n = lo;
    }
    if (u.dollar < n) fail('Saldo Zdolar tidak cukup.');
    const carry = u.taxCarry[`dollar:${lender}-bayar`] || 0;
    const expected = n - Math.floor((n * rate + carry) / 100);
    if (expected > debt.owed) fail(lender === 'bank' ? `Terlalu besar. Gunakan ${p}bank bayar lunas.` : `Terlalu besar. Buka ${p}pinjol lagi dan pilih bayar lunas.`);
    if (expected <= 0) fail('Jumlah terlalu kecil setelah pajak.');
    u.dollar -= n; const fee = tax(u, 'dollar', n, rate, `${lender}-bayar`);
    debt.owed -= n - fee;
    if (!debt.owed) delete u.loans[lender];
    return `› Bayar ${z(n)} Zdolar • pajak ${z(fee)}\n› Sisa utang: ${z(u.loans[lender]?.owed || 0)} Zdolar.`;
  }
  if (sub === 'pinjam') {
    if (debt) fail('Lunasi pinjaman sebelumnya dulu.');
    const limit = (u.level + 1) * (lender === 'bank' ? 2000 : 4000);
    if (n > limit) fail(`Batas pinjaman: ${z(limit)} Zdolar di level ${u.level}.`);
    const fee = tax(u, 'dollar', n, rate, `${lender}-pinjam`);
    u.dollar += n - fee; u.loans[lender] = { principal: n, owed: n, day: today, totalInterest: 0, remainder: 0 };
    return `› Pinjam ${z(n)} Zdolar • pajak ${z(fee)}\n› Diterima ${z(n - fee)} • utang ${z(n)} Zdolar.`;
  }
  const source = sub === 'nabung' ? 'dollar' : 'bank';
  const target = sub === 'nabung' ? 'bank' : 'dollar';
  if (u[source] < n) fail('Saldo tidak cukup.');
  u[source] -= n; const fee = tax(u, 'dollar', n, rate, `bank-${sub}`); u[target] += n - fee;
  return `› ${sub === 'nabung' ? 'Nabung' : 'Ambil'} ${z(n)} Zdolar • pajak ${z(fee)}\n› Diterima ${z(n - fee)} Zdolar.`;
}
function pinjol(args, p) { return x => {
  const sub = args[0]?.toLowerCase();
  const help = `${title('PINJOL')}\n› ${p}pinjol cek\n› ${p}pinjol pinjam <jumlah>\n› ${p}pinjol bayar <jumlah|lunas>\n› Bunga 3%/hari • pajak 5% • risiko utang lebih besar.\n› Simulasi virtual, bukan pinjaman asli.`;
  if (!sub) return help;
  if (sub === 'cek' && args.length === 1) return `› Utang pinjol: ${z(x.user.loans.pinjol?.owed || 0)} Zdolar.\n› Bunga 3%/hari, maksimal sebesar pokok. ${p}pinjol untuk menu.`;
  if (!['pinjam', 'bayar'].includes(sub) || args.length !== 2) return help;
  return bankOperation(x, 'pinjol', sub, args[1], p);
}; }
function transfer(target, currency, value, p) { return ({ user: u, users, tax, fail, now, creditCoin }) => {
  if (!target) fail(`Mention atau balas pengguna: ${p}transfer @orang zcoin 100`);
  if (!['zcoin', 'zdolar'].includes(currency)) fail(`Pakai: ${p}transfer @orang zcoin 100`);
  const n = amount(value, currency);
  if (!n) fail(`Jumlah salah. Contoh: ${p}transfer @orang ${currency} ${currency === 'zcoin' ? '100' : '1,500'}`);
  const field = currency === 'zcoin' ? 'coin' : 'dollar';
  if (u[field] < n) fail(`Saldo ${currency} tidak cukup.`);
  const carry = u.taxCarry[`${field}:transfer`] || 0;
  if (n - Math.floor((n * 2 + carry) / 100) <= 0) fail('Jumlah terlalu kecil setelah pajak.');
  const { fresh } = require('./economy');
  const recipient = users[target] ||= fresh(now);
  u[field] -= n; const fee = tax(u, field, n, 2, 'transfer');
  if (field === 'coin') creditCoin(recipient, n - fee); else recipient.dollar += n - fee;
  const fmt = field === 'coin' ? number : z;
  return `› Transfer ${fmt(n)} ${currency} • pajak ${fmt(fee)}\n› Penerima mendapat ${fmt(n - fee)} ${currency}.${currency === 'zcoin' ? '\n› Zcoin penerima otomatis dikonversi jika mencapai 1.000.' : ''}`;
}; }
module.exports = { status, work, train, trainHelp, bank, pinjol, transfer };
