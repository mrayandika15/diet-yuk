# Status implementasi

Status 8 Oktober 2026: PWA terhubung ke Supabase. Pilih Raka atau Anggun, lengkapi bio, lalu sesi perangkat dipulihkan otomatis saat dibuka lagi.

## Selesai

- Expo Router, TypeScript strict, tema, font, ikon, dan navigasi.
- Floating bottom dock dengan tombol tambah makanan utama dan halaman Catatan.
- Grafik donut, bar, dan tren berat responsif memakai Recharts.
- PWA manifest, ikon maskable, service worker Workbox, offline app shell, dan build produksi.
- Pilihan Raka/Anggun, bio, sesi Supabase anonim persisten, dan salinan profil lokal per user ID.
- Profil, target kalori, countdown, dashboard, pencatatan makanan, favorit, progres berat, streak, badge, dan settings.
- Kamera/galeri, kompresi foto, mode AI simulasi/real, validasi hasil, edit porsi, dan penyimpanan foto private.
- Skema Supabase, RLS, RPC pairing, realtime, cheers, dan tes pemisahan tiga akun di PostgreSQL lokal.
- Restricted gateway untuk Hermes dan template service VPS.
- Importer dataset nutrisi dengan metadata sumber/lisensi.

## Diverifikasi

- TypeScript typecheck.
- Unit test domain/nutrisi dan parser AI.
- Test gateway: auth wajib, endpoint terbatas, override tools/model dibuang.
- Test migrasi: pairing dua akun, penolakan akun ketiga, ownership, validasi, dan retry meal idempotent.
- Expo Doctor, TypeScript, unit test, dan build PWA produksi.
- Manifest, registrasi service worker, navigation fallback, dan precache bundle produksi diverifikasi dari hasil build.

## Verifikasi Supabase langsung (8 Oktober)

- Migrasi tabel, RPC, RLS, Storage, dan validasi bio diterapkan.
- Anonymous Sign-Ins aktif; frontend hanya memakai anon key.
- Dua sesi perangkat terpisah, pemulihan sesi, refresh token, simpan/baca bio.
- Upload foto private, signed URL, simpan/edit/hapus meal, retry idempotent.
- Berat, favorit, pairing, ringkasan pasangan, dan cheers.
- Isolasi akun sebelum pairing, larangan overwrite pasangan, dan akses publik diblokir.
- Fixture akun/foto/catatan pengujian dibersihkan. Tidak ada uji browser atau ponsel fisik pada perubahan ini.

## Integrasi tersisa

- Pasang hostname HTTPS permanen menuju gateway VPS dan isi token AI di aplikasi.
- Uji dua akun pada dua ponsel melalui PWA HTTPS: pairing, realtime, foto kamera, dan AI real.
- Impor dataset TKPI berizin; 50 makanan bawaan masih estimasi prototipe.

Sesi diingat pada browser/PWA yang sama. Menghapus data browser atau pindah perangkat tidak otomatis memulihkan akun anonim hanya dengan memilih nama; nama bukan kredensial. Pairing kedua perangkat tetap dilakukan sekali melalui kode di Pengaturan.
