# Zen bot v0.1

Bot WhatsApp minimalis yang dikembangkan oleh **edinst**, berdasarkan proyek Kiyopon oleh **Hady Zen'in**. Hak cipta dipertahankan di [HakCipta.txt](HakCipta.txt). Zen bot adalah pengembangan terpisah, bukan versi resmi Kiyopon.

## Persiapan

- Node.js 20.9 atau lebih baru dan npm.
- Akun WhatsApp dan koneksi internet. Bot memakai Baileys (tidak resmi); penggunaan otomatisasi dapat memiliki risiko terhadap akun WhatsApp.
- Nomor bot dalam format internasional, tanpa angka nol awal. Jangan masukkan nomor orang lain tanpa izin.

```sh
npm install
cp config.example.json config.json
```

Ubah `nomor` di `config.json`, misalnya `6281234567890`. Awalan bawaan adalah `/`; jika sudah punya `config.json`, ubah `awalan` menjadi `/`. Atau gunakan variabel lingkungan `ZEN_NOMOR` dan `ZEN_AWALAN`; variabel lingkungan didahulukan dari isi file.

```sh
npm start
```

Saat kode pairing muncul di terminal, buka WhatsApp → **Perangkat tertaut** → **Tautkan perangkat** → **Tautkan dengan nomor telepon**, lalu masukkan kodenya. Jangan bagikan kode pairing atau folder `data/session`: keduanya memberikan akses ke akun. Sesi tersimpan di `data/session`; jika sesi keluar, hapus folder tersebut dan jalankan ulang untuk pairing. Gunakan `Ctrl+C` untuk menghentikan bot.

## Perintah

Contoh memakai awalan bawaan `/`. Ketik `/menu` atau `/m` untuk melihat command beserta alias singkatnya. Ketik `/menu bank`, `/m bnk`, atau `/menu /bnk` untuk melihat contoh pemakaian, alias, dan izin. Bot hanya memproses pesan masuk baru, bukan pesan yang dikirim oleh akun bot sendiri.

| Perintah | Keterangan |
| --- | --- |
| `/menu` | Daftar perintah |
| `/ping` | Status dan waktu aktif |
| `/uid` | ID pengirim |
| `/status` | Saldo, level, kemampuan, pekerjaan, dan utang |
| `/kerja` | Kerja harian; ketik `/kerja` untuk petunjuk karier |
| `/latih` | Latih kemampuan dengan membalas nomor atau `/latih 1` |
| `/bank` | Menu tabungan, bunga, pinjaman, dan pembayaran |
| `/transfer` | Bantuan transfer Zcoin atau Zdolar |
| `/pinjol` | Menu pinjaman virtual berisiko |
| `/stiker` | Kirim foto dengan caption atau balas foto untuk membuat stiker statis |
| `/toimg` | Balas stiker statis untuk mengubahnya menjadi PNG |
| `/welcome on` / `/welcome off` | Aktif/nonaktifkan sambutan masuk dan keluar (admin grup) |
| `/buka` / `/tutup` | Izinkan semua anggota atau hanya admin mengirim pesan (admin grup dan bot harus admin) |
| `/kick @anggota` | Mention atau balas anggota yang akan dikeluarkan (admin grup dan bot harus admin) |

Sambutan awalnya nonaktif dan pengaturannya disimpan per grup di `data/groups.json`. Fitur stiker hanya mendukung foto dan stiker statis, dengan batas media 10 MB; video dan stiker animasi belum didukung. Perintah shell, AI otomatis, dan sistem poin lama tidak dimuat dalam versi ini. File lama tetap disimpan sebagai referensi dan tidak dipakai oleh entry point baru; plugin format lama belum kompatibel.

## Ekonomi dan karier

Ekonomi ini **virtual**, bukan uang atau pinjaman sungguhan. Awali dengan `/kerja daftar`, lalu `/kerja lamar 1` dan `/kerja`. Setiap command menyediakan bantuan singkat. Kerja sekali per hari, direset pukul 00.00 WIB; resign tidak menghapus batas harian. Kerja memberi 15 EXP. Setiap 100 EXP naik satu level, sisanya tetap tersimpan.

| Pekerjaan | Syarat | Gaji awal (Zcoin/hari) | Pajak gaji |
| --- | --- | ---: | ---: |
| Pekerja umum | Tidak ada | 200 | 2% |
| Kurir | Level 1, komunikasi 4 | 350 | 3% |
| Teknisi | Level 3, teknik 8 | 650 | 4% |
| Analis | Level 5, logika 12 | 1.000 | 5% |

Gaji naik 20% setelah 3 hari kerja dan menjadi 40% di atas gaji awal setelah 10 hari; gaji baru berlaku mulai kerja berikutnya. Resign mereset progres pada pekerjaan itu. `/latih` meningkatkan komunikasi, teknik, atau logika sebanyak 2 poin dan memberi 10 EXP; biayanya 30 Zcoin termasuk pajak 10%, dengan jeda 6 jam. Balas pesan menu dengan angka dalam 5 menit atau pakai `/latih 1`, `/latih 2`, atau `/latih 3`.

Setiap 1.000 Zcoin yang masuk otomatis dikonversi menjadi 1,000 Zdolar **sebelum** pajak konversi 5%, sehingga diterima 0,950 Zdolar. Sisa Zcoin tetap di saku. Nilai Zdolar memakai tiga angka desimal: `1,500` berarti satu setengah Zdolar, bukan seribu lima ratus. Input Zdolar juga menerima titik desimal (`1.500`); jangan pakai pemisah ribuan. Zcoin harus bilangan bulat.

`/transfer @orang zcoin 100` atau `/transfer @orang zdolar 1,500`; bisa juga balas pesan orangnya dengan `/transfer zcoin 100`. Pajak transfer 2% dipotong dari jumlah yang dikirim. Identitas nomor penerima harus bisa dipetakan oleh WhatsApp; bila belum tersedia bot menolak transaksi agar saldo tidak salah akun. Transfer ke diri sendiri tidak bisa.

### Bank dan pinjol

Bank hanya memakai Zdolar. `/bank` menampilkan bantuan untuk `cek`, `bunga`, `nabung`, `ambil`, `pinjam`, dan `bayar`; contoh `/bank nabung 1,500` atau `/bank bayar lunas`. Jumlah transaksi sudah termasuk pajak: nabung/ambil 1%, pinjam/bayar 2%. Utang dicatat sebesar jumlah pinjaman sebelum pajak; pembayaran mengurangi utang sebesar jumlah setelah pajak.

Bunga tabungan **0,5% per hari**, pajak bunga 10%. Bunga utang bank **1% per hari**, dan batas pinjaman bank `2 × (level + 1)` Zdolar. `/pinjol` menampilkan menu balasan: cek, pinjam, atau bayar. Bunga pinjol **3% per hari**, pajak pinjam/bayar 5%, dan batas `4 × (level + 1)` Zdolar. Total bunga setiap pinjaman dibatasi sebesar pokok awalnya. Satu pinjaman aktif per penyedia; bank dan pinjol dapat aktif bersamaan. Bayar lunas membutuhkan pokok/bunga terutang ditambah pajak pembayaran. Tidak ada penagihan atau kontak nyata.

Bunga dihitung untuk setiap pergantian hari WIB saat akun berikutnya menggunakan command ekonomi, termasuk hari saat bot mati. Bunga tabungan dikapitalisasi harian; bunga utang dihitung atas utang yang tersisa. Pecahan bunga dan pajak yang belum mencapai unit terkecil disimpan untuk perhitungan berikutnya; pembulatan menggunakan bilangan bulat, bukan floating point. Pajak masuk ke akun virtual nomor **085867420646** (`6285867420646@s.whatsapp.net`); kredit pajak itu sendiri tidak dipajaki lagi.

Data ekonomi disimpan di `data/economy.json`, terpisah dari sesi. Cadangkan folder `data` secara aman dan jalankan **satu proses bot saja** pada folder data yang sama. Pesan yang sudah diproses dicatat untuk mencegah pengiriman ulang dihitung dua kali (20.000 pesan terbaru). Menu balasan `/latih` dan `/pinjol` berlaku 5 menit dan hilang saat bot restart; buka menu lagi bila kedaluwarsa. Data ekonomi Kiyopon lama tidak otomatis dimigrasikan.

## Membuat command

Command aktif berada di `src/commands/`, dikelompokkan ke folder `umum`, `ekonomi`, `media`, dan `grup`. Satu file untuk satu command. Misalnya, buat `src/commands/umum/halo.js`:

```js
module.exports = {
  nama: 'halo',
  alias: ['hai'],
  contoh: ['halo'],
  keterangan: 'Kirim salam singkat.',
  deskripsi: 'Menyapa',
  kategori: 'umum',
  async jalankan({ balas }) {
    return balas('Halo!');
  }
};
```

Jalankan ulang bot setelah menambah atau mengubah file. Command akan dimuat dan muncul di menu secara otomatis. Nama harus memakai huruf kecil, angka, `-`, atau `_`, dan tidak boleh sama dengan nama atau alias command lain. Untuk menambah command, pilih nama yang belum digunakan.

Pengaturan tambahan yang bisa ditaruh dalam objek command:

- `alias: ['hai']` — nama alternatif; alias pertama tampil di menu, seluruh alias tampil di info command.
- `contoh: ['halo', 'halo <nama>']` — contoh pemakaian di info command, tanpa awalan (ditambahkan otomatis). Jika tidak ada, info memakai `pemakaian` atau nama command.
- `keterangan: 'Kirim salam singkat.'` — penjelasan tambahan di info command.
- `pemakaian: 'halo <nama>'` — contoh singkat yang tampil di menu; awalan ditambahkan otomatis.
- `grup: true` — hanya bisa dipakai di grup.
- `admin: true` — hanya untuk admin grup (otomatis hanya di grup).
- `botAdmin: true` — bot harus menjadi admin (otomatis hanya di grup). Untuk command admin seperti kick, gunakan **keduanya**: `admin: true` dan `botAdmin: true`.

Tanpa pembatasan di atas, command dapat dipakai semua orang di grup maupun chat pribadi. Izin diperiksa oleh `src/command-handler.js` sebelum `jalankan` dipanggil. Kesalahan format command atau nama duplikat menghentikan bot dengan pesan kesalahan.

Fungsi `jalankan` juga menerima `args` (array kata setelah nama command), `awalan`, `pengirim`, `jid`, `pesan`, `konteks`, `sock`, dan `store`. Lihat contoh di folder command untuk fitur media dan grup. File lama di `perintah/` hanya referensi; folder itu tidak dimuat.

## Pengujian

```sh
npm test
```

Tes tidak memerlukan akun WhatsApp. Pengujian koneksi dan pairing langsung tetap memerlukan akun dan jaringan WhatsApp.
