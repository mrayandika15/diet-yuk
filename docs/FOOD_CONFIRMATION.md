# Gambar dan konfirmasi makanan

Pada langkah kedua, AI boleh mengirim `questions: []` atau hingga tiga pertanyaan tentang detail yang belum jelas dari foto: jenis telur, cara masak, atau bahan tambahan. Pertanyaan muncul sebelum review hanya ketika AI mengirimkannya. Semua opsional: pengguna dapat menjawab sebagian, memilih **Tidak tahu / lewati**, atau **Lewati, pakai estimasi awal**. Hasil tanpa pertanyaan dan catatan lama langsung masuk review.

Jawaban yang dipilih dikirim melalui `queue_food_refinement(original_job, answers, request_id)`. Supabase mengambil hasil asli milik akun tersebut dan menerima hanya ID pertanyaan/pilihan yang sudah ada. Worker OpenCraft menyesuaikan estimasi melalui Hermes; tanpa jawaban, tidak ada permintaan AI tambahan. Jika layanan gagal atau hasil awal sudah kedaluwarsa, pengguna tetap bisa memakai estimasi awal.

Worker mempertahankan jumlah, urutan, dan gram makanan. Item tanpa jawaban tetap sama. Jawaban `egg_type` saja tidak boleh mengubah kalori/makro: telur omega tidak dapat diidentifikasi dari gambar dan jenis omega bukan pengganti label gizi. Jawaban tentang cara memasak atau bahan tambahan dapat mengubah estimasi. Hasil konfirmasi tidak dicocokkan ulang ke nama TKPI generik agar perubahan resep tidak hilang.

Antrean menggunakan `kind=food_refinement` dan kolom payload privat yang sama dengan onboarding. Jawaban/payload dihapus saat selesai/gagal/kedaluwarsa, hasil sementara dihapus setelah satu jam. Tidak ada credential atau endpoint AI baru di frontend. Makanan tersimpan tetap snapshot biasa, tanpa menyimpan jawaban mentah.

## Ilustrasi dari API

30 gambar bahan/menu diambil melalui endpoint resmi [TheMealDB](https://www.themealdb.com/api.php), dengan katalog bahan serta pencarian **Beef Rendang**. Sumber dan URL tercatat di `src/data/food-images.json`; file berada di `public/food-images/`. Sinkronisasi ulang: `node scripts/sync-food-images.mjs` (memerlukan curl). Thumbnail tampil pada review dan pencarian; label **Ilustrasi bahan/menu · TheMealDB** menautkan sumber. Angka nutrisi tetap berasal dari data nutrisi/analisis aplikasi, bukan API gambar. Menu tanpa padanan memakai foto unggahan bila tersedia, atau ikon netral; daun singkong tidak memakai gambar umbi singkong.

Gambar cache lokal masuk precache PWA untuk fallback review. Pencarian menu sekarang mengambil hasil dan gambar dari API secara langsung, lalu menyimpan gambar pilihan pada item makanan; lihat [alur pencarian terbaru](FOOD_SEARCH.md). TheMealDB menerima teks query menu, bukan foto pengguna atau bio. Kunci development publik `1` digunakan untuk API/sinkronisasi. [Ketentuan TheMealDB](https://www.themealdb.com/terms_of_use.php) mengizinkan artwork API untuk development; publikasi ke app store membutuhkan langganan supporter.

## Verifikasi 8 Oktober 2026

- TypeScript: validasi pertanyaan opsional, indeks makanan dan pilihan unik, keberadaan file dan URL sumber gambar.
- Python: pertanyaan rusak tidak membatalkan hasil foto; omega mempertahankan angka; item tanpa jawaban tidak berubah; perubahan jumlah/porsi ditolak.
- SQL: kepemilikan hasil asli, pilihan valid, idempotency, denial anon/akses langsung, pembersihan payload selesai/kedaluwarsa.
- Worker nyata di VPS: foto API dikenali dalam 40 detik dengan satu pertanyaan; konfirmasi omega selesai dalam 5 detik; cara masak selesai dalam 7 detik dan meningkatkan estimasi telur. Payload dibersihkan dan semua fixture dihapus tanpa mengubah meal/profil pengguna.
- Smoke test dapat diulang setelah menyalin `public/food-images/rendang.jpg` ke `/tmp/diet-yuk-food-test.jpg` di VPS, lalu `ssh opencraft python3 - < scripts/test-food-confirmation-live.py`.
- Ego Browser menggunakan fixture terpisah untuk ukuran iPhone 12/15, gambar, jawaban, skip, dan pencarian. Kolom pencarian memiliki tinggi intrinsik; hasil pertama berada di bawah input, termasuk viewport pendek untuk simulasi keyboard. Ini tidak menggantikan pengujian Safari/keyboard pada perangkat fisik.
- Jalur tanpa pertanyaan langsung masuk review; saat refinement gagal, pesan tampil dan skip tetap bekerja. Enam field form tambahan manual berada dalam lebar viewport setelah pemeriksaan regresi.
