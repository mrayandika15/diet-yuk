# Backend & VPS

## Supabase

Migrasi di `supabase/migrations/` mencakup skema awal, bio/foto, Google allowlist, dan managed AI.

- `profiles`: JSON profil dengan owner UUID.
- `couples` / `couple_members`: membership terpisah dari profil. Pengguna tidak dapat mengubah membership langsung.
- `meals`: snapshot item JSON atomik, ID meal menjadi idempotency key. Trigger memeriksa porsi/nutrisi/path foto.
- `weight_logs`: unik per pengguna dan tanggal.
- `favorites`: favorit pribadi per pengguna.
- `cheers`: hanya RPC yang dapat memasukkan semangat ke pasangan.
- `meal-photos`: bucket private, JPEG maksimum 8 MiB; signed URLs berlaku satu jam.

Migrasi `202610080007_default_couple.sql` menyatukan profil dua akun Google terverifikasi secara otomatis. Trigger profil menghubungkan akun setelah onboarding, dengan advisory lock untuk simpan bersamaan. Couple dan tanggal yang sudah ada dipertahankan (prioritas Raka jika sebelumnya terpisah); akun lain tidak ikut dipindahkan. RPC undangan `create_couple`/`join_couple` tidak lagi dapat dipanggil aplikasi. `save_meal` memakai hak pemanggil dan RLS. Helper security-definer memakai search_path kosong dan tidak bisa dipanggil anon. Pasangan hanya membaca; pemilik mengubah catatannya sendiri.

Upload foto dilakukan sebelum transaksi meal. Jika jaringan putus setelah upload, retry memakai UUID dan path yang sama. Foto yang belum terhubung ke meal hanya dapat dibaca pemilik; pembersihan orphan otomatis belum dijadwalkan. Penghapusan meal diikuti penghapusan objek foto.

## AI otomatis lewat VPS

Alur aktif: PWA → RPC Supabase → antrean private → worker VPS → Hermes localhost → hasil Supabase → PWA. Tidak ada endpoint AI publik, tunnel, atau token yang harus diisi pengguna.

- `queue_food_analysis(image, request_id)`: hanya dua akun Google terverifikasi. JPEG base64 maksimum 6 juta karakter; satu pekerjaan aktif per user, retry UUID idempotent.
- `queue_food_refinement(original_job, answers, request_id)`: konfirmasi opsional terhadap hasil foto milik sendiri; hanya menerima pilihan yang terdapat dalam hasil asli. Menggunakan worker dan cleanup payload yang sama. Lihat [konfirmasi makanan](FOOD_CONFIRMATION.md).
- `queue_catalog_estimate(selection, request_id)`: estimasi per 100 g untuk menu/bahan bergambar dari API; worker memverifikasi ID dan mengambil metadata API secara mandiri. Lihat [pencarian menu](FOOD_SEARCH.md).
- `food_analysis_result(job_id)`: hanya pemilik pekerjaan; tidak menampilkan foto atau token kepada pemanggil.
- `ai_status()`: mengecek heartbeat worker, tanpa menampilkan konfigurasi server.
- Tabel `ai_analysis_jobs` dan `ai_worker_status` tidak dapat dibaca/ditulis langsung oleh anon maupun authenticated.
- RPC claim/finish/heartbeat hanya untuk `service_role`. Lease dan locking mencegah pekerjaan diproses bersamaan oleh dua worker.
- Foto sementara dibersihkan saat sukses/gagal; pekerjaan kedaluwarsa dibersihkan ketika heartbeat berjalan. Hasil pekerjaan dihapus setelah satu jam. Jika worker berhenti, pembersihan dilakukan saat worker kembali berjalan.
- Dua analisis berjalan bersamaan. Hermes tetap pada `127.0.0.1:8642`, fixed model `diet-yuk`, tanpa override tool dari aplikasi.
- Worker memvalidasi JSON/nutrisi dan mencoba ulang sekali bila format respons salah. Client menunggu maksimal 240 detik.

Service aktif pada VPS `ssh opencraft`:

```sh
systemctl --user status diet-yuk-ai-worker.service
journalctl --user -u diet-yuk-ai-worker.service -f
systemctl --user restart diet-yuk-ai-worker.service
```

Unit di `~/.config/systemd/user/diet-yuk-ai-worker.service`; source worker di `~/.local/share/diet-yuk/ai-worker.py`. Autostart aktif dan user lingering aktif.

Environment server:

- `~/.hermes/profiles/diet-yuk/.env`: `API_SERVER_KEY` untuk Hermes.
- `~/.config/diet-yuk/ai-worker.env` (mode 0600): `DIET_YUK_SUPABASE_URL`, `DIET_YUK_SUPABASE_SERVICE_KEY`. Service key hanya berada pada VPS, tidak dimasukkan `.env` frontend atau bundle.

Update worker tanpa mengubah kredensial:

```sh
bash scripts/server/deploy-ai-worker.sh opencraft
```

Untuk pemasangan pertama, set `DIET_YUK_WORKER_ENV_FILE` ke file privat berisi dua variabel server di atas. Jangan commit file tersebut.

## Verifikasi 8 Oktober 2026

Typecheck, 14 tes TypeScript, 8 tes Python (gateway lama + worker), tes SQL auth/privacy/lease/heartbeat, dan build PWA lolos. Smoke test menggunakan foto pisang public domain [Jon Sullivan](https://commons.wikimedia.org/wiki/File:Bananas_fruit_(1).jpg): hasil `Pisang hijau segar`, porsi 100 g, 89 kkal, dalam 16 detik. Foto sementara sudah null pada pekerjaan selesai; fixture analisis dihapus dan tidak membuat meal atau mengubah profil.

Smoke test administratif dapat diulang dengan `node scripts/test-ai-live.mjs`, menggunakan file privat `.local/managed-ai/ai-worker.env` dan foto `.local/managed-ai/banana.jpg`. Alur pengiriman user, isolasi antar user, dan denial akun lain diuji pada PostgreSQL lokal. Pemilihan foto dan review UI tetap perlu dicoba oleh user yang sudah login Google.

`scripts/server/gateway.py` dan template tunnel lama masih tersedia sebagai alternatif deployment; keduanya tidak diperlukan atau dijalankan untuk integrasi aktif.

## Onboarding kalori

Migrasi `202610080004_calorie_onboarding.sql` menambahkan jenis pekerjaan `calorie_plan` pada antrean yang sama. `queue_calorie_plan(profile, request_id)` menerima hanya data tubuh, aktivitas, dan bio yang dibutuhkan, memvalidasi usia/ukuran/tujuan, serta dapat dipanggil sebelum profil pertama tersimpan. Akses tetap dibatasi dua akun Google. Raw payload profil dibersihkan saat hasil selesai, gagal, atau lease kedaluwarsa.

Worker menghitung target Mifflin–St Jeor secara deterministik; Hermes hanya memberi penjelasan bio. Model tidak dapat mengubah target, faktor aktivitas, atau nutrisi lewat prompt pengguna. Jika penjelasan tidak valid/tidak tersedia, rumus tetap menghasilkan rencana dengan `explanationSource=formula`. Rincian kebijakan dan sumber: [NUTRITION](NUTRITION.md).

Smoke test onboarding langsung berhasil dalam 7 detik (target profil contoh 1.914 kkal, sumber penjelasan AI, payload dibersihkan). Dapat diulang dengan `ssh opencraft python3 - < scripts/test-calorie-live.py`; skrip membaca kredensial privat di VPS dan hanya membuat/menghapus fixture pekerjaan.
