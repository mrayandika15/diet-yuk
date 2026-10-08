# Backend & VPS

## Supabase

Satu migrasi: `supabase/migrations/202610060001_init.sql`.

- `profiles`: JSON profil dengan owner UUID.
- `couples` / `couple_members`: membership terpisah dari profil. Pengguna tidak dapat mengubah membership langsung.
- `meals`: snapshot item JSON atomik, ID meal menjadi idempotency key. Trigger memeriksa porsi/nutrisi/path foto.
- `weight_logs`: unik per pengguna dan tanggal.
- `favorites`: favorit pribadi per pengguna.
- `cheers`: hanya RPC yang dapat memasukkan semangat ke pasangan.
- `meal-photos`: bucket private, JPEG maksimum 8 MiB; signed URLs berlaku satu jam.

RPC `create_couple` dan `join_couple` mengunci baris profil/couple untuk mencegah race anggota ketiga. `save_meal` memakai hak pemanggil dan RLS. Helper security-definer memakai search_path kosong dan tidak bisa dipanggil anon. Pasangan hanya membaca; pemilik mengubah catatannya sendiri.

Upload foto dilakukan sebelum transaksi meal. Jika jaringan putus setelah upload, retry memakai UUID dan path yang sama. Foto yang belum terhubung ke meal hanya dapat dibaca pemilik; pembersihan orphan otomatis belum dijadwalkan. Penghapusan meal diikuti penghapusan objek foto.

## Gateway AI

Hermes tetap mendengarkan `127.0.0.1:8642`. Facade `scripts/server/gateway.py` mendengarkan `127.0.0.1:8643`:

- hanya `GET /v1/models` dan `POST /v1/chat/completions`;
- bearer token wajib, perbandingan constant-time;
- body maksimum 8 MiB, maksimal dua analisis bersamaan;
- model tetap `diet-yuk`, streaming mati, tool override tidak diteruskan;
- tidak mencatat foto, body, atau token;
- toolset Hermes harus tetap dibatasi sesuai setup profil sebelumnya.

Deploy setelah siap menghubungkan server:

```sh
bash scripts/server/deploy.sh opencraft
```

Script memasang facade saja; tidak membuka port atau menyalakan public tunnel. EnvironmentFile mengacu ke `.env` profil Hermes yang sudah berisi `API_SERVER_KEY`.

### HTTPS permanen

Konfigurasikan named Cloudflare Tunnel (atau Caddy) dengan hostname yang dipilih menuju **http://127.0.0.1:8643**, bukan langsung ke Hermes. Masukkan hostname HTTPS itu di app. Kredensial tunnel hanya berada di VPS.

### HTTPS sementara

Template `diet-yuk-tunnel.service` memakai Quick Tunnel. Setelah cloudflared tersedia, copy unit ke `~/.config/systemd/user/`, reload systemd dan start unit. URL dapat dibaca dari journal unit tersebut. [Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) ditujukan untuk development: URL sementara dan berubah saat proses tunnel dibuat ulang. Gunakan named tunnel untuk pemakaian rutin.

### Status sesi implementasi

Hermes berhasil dicek aktif lewat SSH. Binary cloudflared diunduh ke `~/.local/bin/cloudflared-diet-yuk`. Setelah pengguna meminta frontend/backend dahulu, pemasangan gateway/tunnel publik ditunda. Tidak ada token dibaca atau dicommit, dan endpoint publik belum dibuat.
