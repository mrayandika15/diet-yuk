# diet yuk ♡

Aplikasi PWA penghitung kalori pribadi untuk Raka & Anggun, dengan countdown 26 September 2027.
Expo Web · TypeScript · Expo Router · Recharts · Supabase.

## Jalankan sekarang

```sh
npm ci
npm run web
```

Masuk dengan Google. Hanya `mrayandika.work@gmail.com` (Raka) dan `anggun.rizkye@gmail.com` (Anggun) yang dapat mengakses data. Profil dipilih otomatis dari email; sesi tersimpan di browser. Lihat [setup Google OAuth](docs/GOOGLE_AUTH.md).

```sh
npm run build:pwa    # build produksi + service worker
npm run preview:pwa  # preview hasil build
```

## Yang sudah diimplementasikan

- Onboarding, profil, estimasi target kalori, dan countdown pernikahan.
- Dashboard kalori/makro dan empat kategori makan.
- UI portrait untuk iPhone 12/15: safe area, dock, kontrol sentuh, footer onboarding, date picker, dan adaptasi keyboard. Lihat [UX iPhone](docs/IPHONE_UX.md).
- Kamera/galeri, kompresi foto, AI Hermes otomatis, validasi JSON, retry parse, edit porsi, simpan/edit/hapus catatan.
- Cari 50 makanan awal, tambah makanan sendiri, favorit, dan makanan terbaru.
- Grafik kalori 7/30 hari, log/tren berat, streak, dan badge berdasarkan catatan.
- Supabase Google OAuth dengan allowlist dua email, sesi persisten, private photo storage, RLS, atomic meal RPC, pasangan otomatis Raka/Anggun, realtime meals, dan cheers.
- Manifest, ikon install, dan service worker Workbox untuk instalasi PWA.
- Analisis foto otomatis lewat Supabase dan worker VPS; cek ketersediaan tanpa memasukkan token.
- Pencarian menu memanggil API TheMealDB langsung; setiap hasil memiliki gambar, pilihan cara masak/porsi, dan estimasi AI sebelum ditambahkan. Gambar ikut tersimpan pada catatan. Lihat [pencarian menu](docs/FOOD_SEARCH.md).
- AI dapat menanyakan detail opsional sebelum review foto; jawaban memperbaiki estimasi dan semua pertanyaan bisa dilewati. Lihat [gambar dan konfirmasi makanan](docs/FOOD_CONFIRMATION.md).
- Worker Python di VPS dengan antrean private, validasi hasil, lease, dan pembersihan foto sementara.

## Hubungkan backend (setelah kredensial tersedia)

1. Salin `.env.example` ke `.env`, isi Project URL dan **anon/publishable key** Supabase.
2. Jalankan `npx supabase login`, `npx supabase link --project-ref PROJECT_REF`, lalu `npm run db:push`.
3. Konfigurasikan provider Google, redirect URL, dan hook sesuai `docs/GOOGLE_AUTH.md`.
4. Restart Metro setelah mengubah `.env`.
5. Login Google dan simpan profil. Akun Raka dan Anggun otomatis berbagi progres tanpa kode undangan.
6. Worker AI di VPS sudah aktif. Gunakan **Foto Makanan → Analisis foto**, atau cek ketersediaan di Pengaturan.

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

Tes SQL menggunakan stub kontrak `auth`/`storage` pada PostgreSQL lokal, menguji migrasi, pemisahan tiga akun, pasangan otomatis/upgrade undangan lama, validasi nutrisi, serta retry meal idempotent. Tes ini tidak menggantikan pengujian Supabase Auth, Storage HTTP, dan Realtime pada project sebenarnya.

## Batas implementasi saat ini

- Supabase dan AI Hermes sudah terhubung serta diuji langsung. Login Google dan worker VPS dipakai otomatis.
- 50 makanan awal adalah **estimasi referensi**, bukan dataset TKPI resmi. Importer JSON disediakan; data TKPI berlisensi belum dibundel.
- Shell aplikasi dan mode lokal tersedia offline setelah PWA dibuka sekali. Mode akun tetap perlu koneksi untuk sinkronisasi.
- Badge dihitung dari riwayat (belum ledger pencapaian permanen). Tidak ada remote push; pengingat memakai notifikasi lokal.
- Kamera dan instalasi perlu diuji dari origin HTTPS pada ponsel.
- Analisis foto memerlukan koneksi internet dan worker VPS aktif.

Lihat [INSTALL](docs/INSTALL.md), [BACKEND](docs/BACKEND.md), dan [status implementasi](docs/STATUS.md).
