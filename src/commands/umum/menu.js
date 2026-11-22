module.exports = {
  nama: 'menu',
  alias: ['m', 'help'],
  contoh: ['menu', 'menu <perintah>'],
  keterangan: 'Gunakan nama atau alias untuk melihat informasi.',
  deskripsi: 'Daftar perintah',
  kategori: 'umum',
  async jalankan({ balas, awalan, daftarPerintah, args }) {
    if (args.length) {
      if (args.length !== 1) return balas(`› Pakai ${awalan}menu <perintah>.`);
      const name = (args[0].startsWith(awalan) ? args[0].slice(awalan.length) : args[0]).toLowerCase();
      const command = daftarPerintah.find(item => item.nama === name || item.alias?.includes(name));
      if (!command) return balas(`› Perintah tidak ditemukan. Lihat ${awalan}menu.`);
      const examples = command.contoh || [command.pemakaian || command.nama];
      const permissions = [];
      if (command.grup || command.admin || command.botAdmin) permissions.push('grup');
      if (command.admin) permissions.push('admin grup');
      if (command.botAdmin) permissions.push('bot admin');
      const aliases = command.alias?.length ? command.alias.map(alias => `${awalan}${alias}`).join(', ') : 'tidak ada';
      return balas(`〔 ${command.nama.toUpperCase()} 〕\n› ${command.deskripsi}\n› Alias: ${aliases}\n› Akses: ${permissions.length ? permissions.join(' • ') : 'semua'}\n› Pakai:\n${examples.map(example => `  ${awalan}${example}`).join('\n')}${command.keterangan ? `\n› ${command.keterangan}` : ''}`);
    }
    const categories = new Map();
    for (const command of daftarPerintah) {
      if (!categories.has(command.kategori)) categories.set(command.kategori, []);
      const alias = command.alias?.[0] ? ` (${awalan}${command.alias[0]})` : '';
      categories.get(command.kategori).push({ command, text: `${awalan}${command.pemakaian || command.nama}${alias} — ${command.deskripsi}` });
    }
    const order = ['umum', 'ekonomi', 'media', 'grup'];
    const sorted = [...categories].sort(([a], [b]) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)));
    const sections = sorted.map(([name, lines]) => {
      const allAdmin = lines.every(line => line.command.admin);
      const entries = lines.map(line => line.text + (!allAdmin && line.command.admin ? ' • admin' : ''));
      return `— ${name.toUpperCase()}${allAdmin ? ' / ADMIN' : ''} —\n${entries.join('\n')}`;
    });
    return balas(`〔 ZEN BOT v0.1 〕\nby edinst\n\n${sections.join('\n\n')}\n\n› Info: ${awalan}menu <perintah>`);
  }
};
