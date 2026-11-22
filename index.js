/* Zen bot v0.1 oleh edinst. Berdasarkan Kiyopon oleh Hady Zen'in. */
require('./src/main').start().catch(error => {
  console.error('[Zen] Gagal memulai:', error.message);
  process.exitCode = 1;
});
