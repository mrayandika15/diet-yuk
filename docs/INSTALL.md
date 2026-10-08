# Menjalankan Diet Yuk sebagai PWA

## Development

Prasyarat: Node.js 22+ dan browser modern.

    npm ci
    npm run web

Masuk dengan Google memakai salah satu dari dua email yang diizinkan. Siapkan provider dan redirect URL mengikuti [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Sesi Google diingat di browser/PWA. Kamera pada ponsel memerlukan origin HTTPS atau localhost.

## Build produksi

    npm run build:pwa
    npm run preview:pwa

Hasil produksi berada di folder `dist/`. Perintah build mengekspor Expo Web lalu membuat `sw.js` dengan Workbox. Service worker menyimpan app shell, bundle, font, dan aset utama agar aplikasi dapat dibuka kembali tanpa koneksi.

## Deploy

Upload seluruh isi `dist/` ke hosting HTTPS dengan aturan:

- Semua rute aplikasi yang tidak menunjuk file diarahkan ke `/index.html`.
- `/sw.js` disajikan dari root dengan content type JavaScript.
- Jangan mengubah nama file bundle ber-hash.
- Supabase Auth harus mengizinkan URL produksi sebagai redirect URL.
- Analisis AI memakai RPC Supabase yang sama dengan login; tidak perlu mengonfigurasi endpoint atau CORS AI terpisah.

### Vercel + GitHub

Repo sudah memiliki `vercel.json`: install `npm ci`, build `npm run build:pwa`, output `dist/`, dan fallback rute SPA. Hubungkan repo `mrayandika15/diet-yuk` ke Vercel dengan production branch `main`.

Tambahkan `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` ke environment Production (dan Preview jika diperlukan). Kedua nilai ini konfigurasi publik frontend; service key dan kredensial AI tetap hanya berada di Opencraft. Jangan upload `.env` atau menambahkan service key ke Vercel.

Daftarkan origin produksi di Supabase Auth sebagai Site URL dan `<origin>/welcome` sebagai redirect URL. Callback Google Cloud tetap menggunakan URL callback Supabase yang sudah dikonfigurasi. Deploy ulang jika environment berubah.

Setelah membuka URL produksi, pilih **Install app** atau **Tambahkan ke Layar Utama** dari menu browser.

## Checklist PWA

- Manifest tersedia di `/manifest.json`.
- Service worker aktif dan mengontrol halaman setelah reload.
- PWA terbuka dalam mode standalone.
- Mode lokal dapat dibuka kembali saat offline.
- Kamera dan galeri berfungsi pada origin HTTPS.
- Update build baru menggantikan cache lama.
- Login, pasangan otomatis, upload foto, dan AI real diuji saat kredensial tersedia.

Implementasi sebelumnya sudah diuji melalui SDK dengan sesi anonim. Setelah migrasi Google, jalankan `npm run test:supabase` untuk pemeriksaan konfigurasi provider dan akses publik (read-only). Uji login Google, pemulihan sesi, dan kedua akun mengikuti `GOOGLE_AUTH.md`.
