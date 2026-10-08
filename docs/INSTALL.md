# Menjalankan Diet Yuk sebagai PWA

## Development

Prasyarat: Node.js 22+ dan browser modern.

    npm ci
    npm run web

Pilih Raka atau Anggun, isi bio, lalu simpan. Sesi Supabase diingat di browser/PWA yang sama. Nama yang dipilih bukan password untuk membuka akun perangkat lain. Kamera pada ponsel memerlukan origin HTTPS atau localhost.

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
- Reverse proxy AI harus mengizinkan origin PWA melalui CORS.

Setelah membuka URL produksi, pilih **Install app** atau **Tambahkan ke Layar Utama** dari menu browser.

## Checklist PWA

- Manifest tersedia di `/manifest.json`.
- Service worker aktif dan mengontrol halaman setelah reload.
- PWA terbuka dalam mode standalone.
- Mode lokal dapat dibuka kembali saat offline.
- Kamera dan galeri berfungsi pada origin HTTPS.
- Update build baru menggantikan cache lama.
- Login, pairing, upload foto, dan AI real diuji saat kredensial tersedia.

Supabase sudah diuji langsung melalui SDK: simpan bio, pulihkan sesi dari storage, upload foto, CRUD meal, berat, favorit, dan pairing. Jalankan kembali dengan `npm run test:supabase` setelah CLI terhubung ke project yang sama. Script membuat fixture terpisah dan membersihkannya setelah pengujian.
