const fs = require('node:fs');
const path = require('node:path');
function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'groups.json');
  const groups = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return {
    welcome(jid) { return groups[jid]?.welcome === true; },
    setWelcome(jid, value) {
      const next = { ...groups, [jid]: { ...groups[jid], welcome: value } };
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, file);
      Object.assign(groups, next);
    }
  };
}
module.exports = { createStore };
