# diet yuk ♡

Aplikasi PWA penghitung kalori pribadi untuk Raka & Anggun, dengan countdown 26 September 2027.
Expo Web · TypeScript · Expo Router · Recharts · Supabase.

## Jalankan sekarang

```sh
npm ci
npm run web
```

Pilih **Raka** atau **Anggun**, lalu lengkapi bio. Supabase membuat sesi perangkat tanpa email/password dan menyimpannya di browser. Saat dibuka lagi dari browser/PWA yang sama, profilmu dipulihkan otomatis. Menghapus data browser menghapus akses sesi anonim; memilih nama saja tidak membuka data akun lain.

```sh
npm run build:pwa    # build produksi + service worker
npm run preview:pwa  # preview hasil build
```

## Yang sudah diimplementasikan

- Onboarding, profil, estimasi target kalori, dan countdown pernikahan.
- Dashboard kalori/makro dan empat kategori makan.
- Kamera/galeri, kompresi foto, AI real atau simulasi, validasi JSON, retry parse, edit porsi, simpan/edit/hapus catatan.
- Cari 50 makanan awal, tambah makanan sendiri, favorit, dan makanan terbaru.
- Grafik kalori 7/30 hari, log/tren berat, streak, dan badge berdasarkan catatan.
- Supabase email/password auth, sesi persisten, private photo storage, RLS, atomic meal RPC, pairing dua orang, realtime meals, dan cheers.
- Manifest, ikon install, dan service worker Workbox untuk instalasi PWA.
- Konfigurasi AI HTTPS + token SecureStore, tes koneksi.
- Restricted gateway Python + systemd templates untuk VPS; hanya meneruskan models/chat completions.

## Hubungkan backend (setelah kredensial tersedia)

1. Salin `.env.example` ke `.env`, isi Project URL dan **anon/publishable key** Supabase.
2. Jalankan `npx supabase login`, `npx supabase link --project-ref PROJECT_REF`, lalu `npm run db:push`.
3. Konfigurasikan Email Auth; jika konfirmasi email aktif, masukkan URL HTTPS PWA sebagai redirect URL.
4. Restart Metro setelah mengubah `.env`.
5. Buat akun, simpan profil, buat kode pasangan, lalu gabungkan akun kedua.
6. Isi endpoint HTTPS dan token AI di **Pengaturan → Server AI**, tes koneksi, matikan simulasi, simpan.

Jangan taruh token AI atau service-role key dalam `EXPO_PUBLIC_*`. Variabel tersebut masuk bundle aplikasi.

## Verifikasi

```sh
npm run typecheck
npm test
npm run test:gateway
npm run test:db       # PostgreSQL lokal, createdb + psql; memakai DB sementara
npx expo-doctor
npm run build:pwa
```

Tes SQL menggunakan stub kontrak `auth`/`storage` pada PostgreSQL lokal, menguji migrasi, pemisahan tiga akun, pairing, validasi nutrisi, serta retry meal idempotent. Tes ini tidak menggantikan pengujian Supabase Auth, Storage HTTP, dan Realtime pada project sebenarnya.

## Batas implementasi saat ini

- Supabase sudah terhubung dan diuji langsung. Endpoint AI HTTPS masih perlu dikonfigurasi.
- 50 makanan awal adalah **estimasi referensi**, bukan dataset TKPI resmi. Importer JSON disediakan; data TKPI berlisensi belum dibundel.
- Shell aplikasi dan mode lokal tersedia offline setelah PWA dibuka sekali. Mode akun tetap perlu koneksi untuk sinkronisasi.
- Badge dihitung dari riwayat (belum ledger pencapaian permanen). Tidak ada remote push; pengingat memakai notifikasi lokal.
- Kamera dan instalasi perlu diuji dari origin HTTPS pada ponsel.
- Pemakaian AI dari PWA memerlukan CORS di reverse proxy.

Lihat [INSTALL](docs/INSTALL.md), [BACKEND](docs/BACKEND.md), dan [status implementasi](docs/STATUS.md).
