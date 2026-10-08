# Pencarian menu dari API

Picker **Tambah makanan** kini memanggil API resmi [TheMealDB](https://www.themealdb.com/api.php), bukan memfilter `src/data/foods.ts`. Katalog lokal tetap tersedia sebagai estimasi referensi untuk penggunaan lain dan tes.

## Alur

1. Buka picker untuk bahan populer dan menu Indonesia dari API.
2. Ketik nama menu/bahan. Debounce 350 ms, batalkan request lama, timeout 15 detik. Setiap pencarian memanggil endpoint search/filter; hanya direktori bahan yang disimpan dalam memori sesi. Alias bahasa menerjemahkan pencarian seperti `tel`/`telor` menjadi bahan **Eggs** yang benar-benar ada dalam respons API.
3. Pilih hasil bergambar. Thumbnail harus berhasil dimuat sebelum hasil dapat dipilih; gambar yang gagal dihapus dari hasil. Recipe tanpa URL gambar resmi diabaikan. Tidak ada angka kalori nol pengganti nutrisi yang hilang.
4. Tinjau gambar dan tentukan cara masak untuk bahan serta gram yang dimakan.
5. **Lihat estimasi nutrisi** menggunakan AI OpenCraft. TheMealDB menyediakan menu/bahan/gambar, tidak menyediakan nilai kalori atau makro. UI melabeli angka sebagai estimasi AI. Worker menghitung untuk 100 g, lalu perubahan gram di UI menskalakan seluruh makro tanpa request tambahan.
6. **Tambahkan ke hasil** menyimpan nama, angka porsi, URL gambar, dan sumber **TheMealDB**. Gambar tampil dalam review dan Catatan makan. Tidak menambahkan makanan sebelum estimasi ditinjau.

Hasil kosong menawarkan nama bahan lain atau foto makanan. Koneksi gagal menyediakan retry. Query/pilihan dipertahankan selama retry; request yang dibatalkan tidak boleh memperbarui tampilan. Kembali atau tutup membatalkan polling estimasi; pekerjaan yang sudah dikirim tetap diselesaikan oleh worker dan dibersihkan seperti pekerjaan AI lainnya. Input manual untuk makanan tanpa ilustrasi memerlukan foto.

## Backend

Migrasi `202610080006_catalog_estimate.sql` menambah `kind=food_catalog` dan `queue_catalog_estimate(selection, request_id)`. RPC mempertahankan allowlist Google, isolasi owner, UUID idempotent, satu job aktif, dan heartbeat. Payload menerima hanya kind/id/preparation; URL, kalori atau instruksi yang disisipkan client tidak diteruskan.

Worker mengambil resep dari `lookup.php?i=...` untuk ID numerik, atau memeriksa bahan pada `list.php?i=list`. URL gambar diambil dari API/endpoint resmi, tidak dari keluaran model. Estimasi harus memuat tepat satu item untuk 100 g, dengan angka finite dalam batas yang sesuai. Payload selection dibersihkan setelah selesai/gagal/kedaluwarsa. Kunci AI tetap privat di VPS.

Pencarian langsung mengirim teks query menu ke TheMealDB. Foto pengguna dan bio tidak dikirim ke provider gambar. Artwork memakai kredit sumber; ketentuan development/app store mengikuti [TheMealDB terms](https://www.themealdb.com/terms_of_use.php). API publik key `1` digunakan untuk PWA development pribadi saat ini.

## Verifikasi 8 Oktober 2026

- 22 tes TypeScript: alias dari data nyata, gambar wajib pada hasil, URL host, metadata foto dan scaling, request search/filter, abort.
- 18 tes Python: lookup ID dan host sumber gambar, bahan harus ada di API, gambar model tidak bisa menggantikan sumber, hanya estimasi per 100 g yang diterima.
- SQL: payload palsu ditolak/dihapus, idempotency, isolasi hasil antar owner, denial anon, cleanup.
- Worker live: telur rebus selesai 9 detik (155 kkal/100 g), rendang 11 detik (estimasi 303 kkal/100 g); gambar sesuai API dan payload null. Semua job pengujian dihapus, tanpa mengubah meal/profil. Ulangi dengan `ssh opencraft python3 - < scripts/test-catalog-live.py`.
- Browser QA menggunakan API TheMealDB nyata dalam harness UI terpisah; perhitungan dalam harness adalah fixture. Request API, thumbnail, pilihan bahan, porsi 55 g, penambahan dengan gambar, kondisi kosong, serta viewport iPhone diperiksa. Seluruh 17 hasil pencarian contoh memiliki gambar yang berhasil dimuat; pergantian query cepat menjaga hasil terbaru; simulasi offline menampilkan error dan retry; viewport pendek tidak menumpuk input/hasil dan footer tetap terlihat. Safari/perangkat fisik belum diuji.
