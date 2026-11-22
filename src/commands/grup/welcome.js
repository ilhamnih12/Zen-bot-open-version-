module.exports = {
  nama: 'welcome',
  alias: ["wc"],
  contoh: ["welcome on", "welcome off"],
  keterangan: "Mengatur sambutan masuk dan keluar.",
  pemakaian: 'welcome on/off',
  deskripsi: 'Atur sambutan',
  kategori: 'grup',
  admin: true,
  async jalankan({ balas, args, awalan, jid, store }) {
    if (!['on', 'off'].includes(args[0]?.toLowerCase()) || args.length !== 1) return balas(`› Pakai ${awalan}welcome on/off`);
    const aktif = args[0].toLowerCase() === 'on';
    store.setWelcome(jid, aktif);
    return balas(`› Sambutan ${aktif ? 'aktif' : 'nonaktif'}.`);
  }
};
