const fs = require('node:fs');
const path = require('node:path');

// Satu file berisi satu command. Kesalahan konfigurasi menghentikan bot,
// supaya command yang seharusnya dibatasi tidak terbuka untuk semua orang.
function loadCommands(root = path.join(__dirname, 'commands')) {
  const commands = [];
  const byName = new Map();
  for (const folder of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!folder.isDirectory()) continue;
    const directory = path.join(root, folder.name);
    for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.js')).sort()) {
      const command = require(path.join(directory, file));
      if (!command || typeof command.nama !== 'string' || !/^[a-z0-9_-]+$/.test(command.nama) ||
          typeof command.deskripsi !== 'string' || !command.deskripsi.trim() ||
          typeof command.kategori !== 'string' || !command.kategori.trim() ||
          typeof command.jalankan !== 'function' ||
          (command.alias !== undefined && (!Array.isArray(command.alias) || command.alias.some(alias => typeof alias !== 'string' || !/^[a-z0-9_-]+$/.test(alias)))) ||
          (command.pemakaian !== undefined && typeof command.pemakaian !== 'string') ||
          (command.contoh !== undefined && (!Array.isArray(command.contoh) || !command.contoh.length || command.contoh.some(value => typeof value !== 'string' || !value.trim()))) ||
          (command.keterangan !== undefined && (typeof command.keterangan !== 'string' || !command.keterangan.trim())) ||
          ['grup', 'admin', 'botAdmin'].some(key => command[key] !== undefined && typeof command[key] !== 'boolean')) {
        throw new Error(`Command tidak valid: ${folder.name}/${file}`);
      }
      for (const name of [command.nama, ...(command.alias || [])]) {
        if (byName.has(name)) throw new Error(`Nama command duplikat: ${name}`);
        byName.set(name, command);
      }
      commands.push(command);
    }
  }
  return { commands, byName };
}

async function runCommand({ command, jid, pengirim, pesan, sock, balas, findParticipant, ...rest }) {
  const needsGroup = command.grup || command.admin || command.botAdmin;
  if (needsGroup && !jid.endsWith('@g.us')) return balas('› Hanya untuk grup.');
  let participants = [];
  if (command.admin || command.botAdmin) {
    const metadata = await sock.groupMetadata(jid);
    participants = metadata.participants || [];
    if (command.admin && !findParticipant(participants, [pengirim, pesan.key.participantAlt])?.admin) return balas('› Hanya untuk admin grup.');
    if (command.botAdmin && !findParticipant(participants, [sock.user?.id, sock.user?.lid])?.admin) return balas('› Bot harus jadi admin grup.');
  }
  return command.jalankan({ jid, pengirim, pesan, sock, balas, findParticipant, participants, ...rest });
}
module.exports = { loadCommands, runCommand };
