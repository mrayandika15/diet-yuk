# Status implementasi

Status 8 Oktober 2026: login PWA diubah ke Google OAuth dengan allowlist dua email. Migrasi `202610080002_google_allowlist.sql` sudah diterapkan ke Supabase. Provider Google, Auth Hook, dan redirect URL lokal sudah dikonfigurasi. Dua email sudah terdaftar sebagai Google test users.

Review makanan terbaru: pencarian menggunakan API TheMealDB langsung dengan hasil bergambar, pemilihan cara masak/porsi, dan estimasi AI sebelum penambahan. Gambar pilihan tersimpan dalam catatan. AI foto tetap dapat mengirim pertanyaan opsional sebelum review. Migrasi `202610080005_food_confirmation.sql` dan `202610080006_catalog_estimate.sql` serta worker VPS sudah diterapkan. Estimasi katalog/konfirmasi diuji langsung; 22 tes TypeScript, 18 tes Python, tes SQL, build PWA, serta UI iPhone 12/15 lolos. Detail: [pencarian menu](FOOD_SEARCH.md) dan [konfirmasi makanan](FOOD_CONFIRMATION.md).

Verifikasi perubahan Google: typecheck, 15 unit test, SQL allowlist/RLS/RPC/Storage/hook, dan build PWA berhasil. Pemeriksaan konfigurasi Supabase live lolos; tombol login sudah membuka pemilih akun Google. Pengguna mengonfirmasi login Google berhasil.

## Pasangan otomatis

Migrasi `202610080007_default_couple.sql` sudah diterapkan. Akun Google `mrayandika.work@gmail.com` dan `anggun.rizkye@gmail.com` otomatis berada dalam pasangan yang sama setelah menyimpan profil. Tombol/kode undangan dihapus; RPC undangan lama ditutup. Profil yang sudah ada dihubungkan tanpa mengubah catatan. Jika pasangan belum onboarding, tampil status menunggu profil tanpa target contoh.

Typecheck, 22 unit test, SQL upgrade pasangan lama/onboarding kedua urutan/akses pemilik, build PWA, dan UI iPhone 12/15 berhasil. Pemeriksaan Supabase live memastikan profil Raka sudah memiliki membership otomatis; akun Google Anggun belum ada di Supabase dan akan bergabung otomatis setelah login/onboarding pertama.

## Selesai

- Expo Router, TypeScript strict, tema, font, ikon, dan navigasi.
- Floating bottom dock dengan tombol tambah makanan utama dan halaman Catatan.
- Grafik donut, bar, dan tren berat responsif memakai Recharts.
- PWA manifest, ikon maskable, service worker Workbox, offline app shell, dan build produksi.
- Login Google, pemetaan email ke profil Raka/Anggun, bio, dan sesi persisten. Akses dibatasi juga melalui RLS dan RPC.
- Profil, target kalori, countdown, dashboard, pencatatan makanan, favorit, progres berat, streak, badge, dan settings.
- Kamera/galeri, kompresi foto, AI Hermes otomatis via antrean Supabase + worker VPS, validasi hasil, edit porsi, dan penyimpanan foto private.
- Skema Supabase, RLS, pasangan otomatis, realtime, cheers, dan tes pemisahan tiga akun di PostgreSQL lokal.
- Worker AI VPS aktif dengan autostart, heartbeat, dua slot analisis, lease, dan pembersihan foto sementara.
- Importer dataset nutrisi dengan metadata sumber/lisensi.

## Diverifikasi

- TypeScript typecheck.
- Unit test domain/nutrisi dan parser AI.
- Test gateway: auth wajib, endpoint terbatas, override tools/model dibuang.
- Test migrasi: pairing dua akun, penolakan akun ketiga, ownership, validasi, dan retry meal idempotent.
- Expo Doctor, TypeScript, unit test, dan build PWA produksi.
- Manifest, registrasi service worker, navigation fallback, dan precache bundle produksi diverifikasi dari hasil build.

## Verifikasi Supabase langsung sebelum perubahan Google (8 Oktober)

- Migrasi tabel, RPC, RLS, Storage, dan validasi bio diterapkan.
- Anonymous Sign-Ins aktif; frontend hanya memakai anon key.
- Dua sesi perangkat terpisah, pemulihan sesi, refresh token, simpan/baca bio.
- Upload foto private, signed URL, simpan/edit/hapus meal, retry idempotent.
- Berat, favorit, pairing, ringkasan pasangan, dan cheers.
- Isolasi akun sebelum pairing, larangan overwrite pasangan, dan akses publik diblokir.
- Fixture akun/foto/catatan pengujian dibersihkan. Tidak ada uji browser atau ponsel fisik pada perubahan ini.

## Integrasi tersisa

- Uji login Google dengan kedua akun sampai kembali ke aplikasi; tambahkan redirect origin produksi saat deploy. Lihat [setup Google OAuth](GOOGLE_AUTH.md).

- AI sudah siap otomatis tanpa endpoint publik/token pengguna. Smoke test foto pisang sukses dalam 16 detik dan fixture dibersihkan.
- Uji dua akun pada dua ponsel melalui PWA HTTPS: progres bersama, realtime, foto kamera, dan alur analisis foto real.
- Impor dataset TKPI berizin; 50 makanan bawaan masih estimasi prototipe.

Sesi Google diingat pada browser/PWA yang sama. Sesi anonim lama ditolak oleh aplikasi dan database. Data lama tidak dihapus atau dipindahkan berdasarkan nama; jika diperlukan, migrasi kepemilikan harus dilakukan setelah identitas akun lama diverifikasi.

## Verifikasi managed AI

Migrasi `202610080003_managed_ai.sql` diterapkan ke Supabase. `diet-yuk-ai-worker.service` aktif di `opencraft`. Typecheck, 14 tes TypeScript, 8 tes Python, tes SQL privacy/auth/lease/heartbeat, dan build PWA berhasil. Service key hanya berada di VPS. Lihat [BACKEND](BACKEND.md).

## Onboarding kalori otomatis

Form profil menjadi tiga langkah: data tubuh, aktivitas/tujuan/bio, lalu target harian dengan rincian energi dasar dan penyesuaian. Input kalori manual dihapus. Perhitungan deterministik Mifflin–St Jeor dijalankan melalui API Supabase dan worker Opencraft; AI menjelaskan bio tanpa menetapkan angka. Data numerik pertama kali wajib diisi, tidak mengambil nilai contoh diam-diam. Lihat [dasar perhitungan](NUTRITION.md).

Migrasi onboarding sudah diterapkan dan worker VPS diperbarui. Verifikasi: 16 tes TypeScript, 12 tes Python, tes SQL onboarding/auth/privasi, typecheck, dan build PWA lolos. Smoke test langsung pada Opencraft selesai dalam 7 detik: profil contoh menghasilkan 1.914 kkal/hari dengan penjelasan AI; payload bio dibersihkan dan fixture dihapus tanpa mengubah profil pengguna. Browser memverifikasi halaman profil dilindungi login; alur onboarding UI dengan sesi Google belum diuji otomatis.

## Penyempurnaan iPhone 12 dan iPhone 15

Tema hangat dipertahankan; dashboard, dock, onboarding, catatan, grafik, dan review makanan dirapikan untuk dua ukuran layar portrait. Safe area, visual viewport/keyboard, kontrol 44 px, input 16 px, footer tindakan, date picker, fokus, dan reduced motion ditambahkan/diperbaiki. Typecheck, 16 tes TypeScript, build PWA, dan 14 pemeriksaan layout melalui Ego Browser lolos. Pengujian UI memakai fixture terpisah, termasuk onboarding, porsi, kondisi kosong, dan simulasi keyboard. Verifikasi Safari/PWA dan kamera pada iPhone fisik masih diperlukan. Rincian: [IPHONE_UX](IPHONE_UX.md).
