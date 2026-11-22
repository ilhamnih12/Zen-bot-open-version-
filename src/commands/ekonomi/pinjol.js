module.exports = {
  nama: 'pinjol',
  alias: ["pj"],
  contoh: ["pinjol"],
  keterangan: "Balas angka di menu untuk cek, pinjam, atau bayar. Simulasi virtual.", deskripsi: 'Pinjaman berisiko', kategori: 'ekonomi',
  async jalankan(ctx) {
    const menu = `〔 PINJOL 〕\n1. Cek utang\n2. Pinjam\n3. Bayar\n› Bunga 3%/hari • pajak 5%.\n› Maks: 4 × (level + 1) Zdolar.\n› Total bunga maksimal sebesar pokok.\n› Simulasi virtual. Balas angka dalam 5 menit.`;
    const result = await ctx.balas(menu);
    if (result?.key?.id) ctx.setInteraction(result.key.id, 'pinjol-menu');
  }
};
