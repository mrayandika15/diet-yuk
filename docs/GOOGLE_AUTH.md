# Google login untuk Raka & Anggun

Allowlist hardcoded:

- `mrayandika.work@gmail.com` → Raka
- `anggun.rizkye@gmail.com` → Anggun

Frontend: `src/lib/auth.ts`. Backend: `202610080002_google_allowlist.sql`.
Backend memeriksa email terverifikasi dan provider Google dari `auth.users`, bukan metadata yang dapat diedit pengguna. Restrictive RLS melindungi tabel aplikasi dan bucket `meal-photos`; RPC SECURITY DEFINER memiliki guard tambahan. Hook pendaftaran menolak akun lain sebelum dibuat setelah diaktifkan di dashboard.

## Status setup

Setup aktif pada 8 Oktober 2026:

- Migrasi sudah diterapkan ke Supabase `ascesqvizkvkxoihxzeo`.
- OAuth client `Diet Yuk — Supabase Google Login` dibuat di Google Cloud `opencraft-gcp` melalui Ego Browser, memakai akun Open Craft.
- Kedua email tercantum sebagai test users (Google menampilkan `Anggun.rizkye@gmail.com`; pencocokan allowlist tidak membedakan huruf besar/kecil).
- Provider Google aktif, anonymous/email auth nonaktif, dan Before User Created hook aktif melalui Supabase CLI.
- Redirect lokal port 8081, 3000, dan 4173 sudah diizinkan.
- Typecheck, 15 unit test, SQL akses, build PWA, dan pemeriksaan konfigurasi Supabase live lolos.
- Pemeriksaan tambahan fungsi hook langsung via `db query` dihentikan karena CLI tertahan saat inisialisasi login role; fungsi hook sudah lolos tes PostgreSQL lokal dan aktivasi remote berhasil.
- Tombol login sudah diuji di browser hingga halaman pemilihan akun Google. Login hingga kembali ke aplikasi perlu pengguna masuk dengan salah satu email yang diizinkan.

Client Secret disimpan di Supabase. Google consent memakai branding project `opencraft-gcp` yang sudah ada; client aplikasi lain tidak diubah. Origin PWA produksi belum dikonfigurasi karena belum ada URL deployment.

## Google Cloud

1. Pilih/buat project khusus Diet Yuk dan konfigurasi Google Auth Platform: nama aplikasi `Diet Yuk`, audience External. Gunakan email pemilik project sebagai support/contact.
2. Jika status Testing, tambahkan dua email allowlist sebagai test users.
3. Buat OAuth client dengan application type Web application.
4. Authorized redirect URI: `https://ascesqvizkvkxoihxzeo.supabase.co/auth/v1/callback`.
5. Simpan Client ID dan Client Secret ke provider Google pada Supabase. Jangan taruh Client Secret di source code atau `EXPO_PUBLIC_*`.

## Supabase dashboard

1. Authentication → Sign In / Providers → Google: aktifkan, isi Client ID dan Client Secret.
2. Nonaktifkan Anonymous Sign-Ins dan provider Email. Tetap izinkan signup global agar kedua akun dapat dibuat melalui Google.
3. Authentication → Auth Hooks → Before User Created: pilih fungsi Postgres `public.before_user_created` dan aktifkan.
4. URL Configuration: Site URL sesuai alamat PWA. Tambahkan redirect URL persis:
   - `http://localhost:8081/welcome` (Expo dev)
   - `http://localhost:3000/welcome` (preview default)
   - `http://localhost:4173/welcome` (jika preview memakai port ini)
   - `https://HOST-PWA/welcome` saat sudah deploy.

Aplikasi memakai `signInWithOAuth` dan kembali ke `/welcome` pada origin yang sedang dibuka. Supabase JS menangani sesi callback untuk aplikasi web client-side. Native OAuth belum diimplementasikan; login ini untuk PWA/browser.

## Pengujian

- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build:pwa`.
- `npm run test:supabase`: cek konfigurasi Auth publik dan blokir akses anonim, tanpa membuat fixture akun.
- Browser: login Raka → bio Raka → simpan profil → refresh → sesi tetap aktif → logout.
- Browser/perangkat lain: login Anggun → bio Anggun → progres bersama otomatis, tanpa kode.
- Login email ketiga: ditolak; jika hook belum aktif, aplikasi tetap menolak sesi dan RLS memblokir data.
- Batalkan consent Google: halaman login tetap bisa dicoba lagi.
- Sesi anonim/local lama: diminta masuk Google dan tidak membuka data akun lain.

Data anonim lama tetap tersimpan, tetapi tidak otomatis menjadi milik akun Google. Jangan memindahkan data hanya dari nama profil.

Referensi: [Google OAuth Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).
