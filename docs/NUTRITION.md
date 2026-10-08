# Dataset nutrisi

`src/data/foods.ts` memuat 50 estimasi umum per 100 g, lalu mengonversinya ke porsi awal. Angka ini untuk prototipe dan harus diperiksa sebelum dipakai sebagai rujukan nutrisi. UI melabelinya sebagai estimasi referensi, bukan TKPI.

Importer menerima JSON berlisensi dengan bentuk:

```json
{
  "source": {
    "name": "Nama dataset",
    "url": "https://sumber.example/data",
    "license": "Izin penggunaan dataset"
  },
  "items": [
    {
      "code": "FOOD001",
      "name": "Nama makanan",
      "aliases": [],
      "kcal": 130,
      "protein": 2.7,
      "carbs": 28.2,
      "fat": 0.3,
      "defaultPortionG": 150
    }
  ]
}
```

Seluruh nutrisi dalam input adalah **per 100 gram**. Jalankan:

```sh
npm run import:tkpi -- /path/to/dataset.json
```

Importer memvalidasi provenance, angka, dan kode unik, lalu menulis `assets/data/tkpi.json`. Periksa izin sumber sebelum commit; label lisensi input bukan verifikasi hukum otomatis.

`src/lib/nutrition.ts` mencocokkan hasil AI dengan nama/alias normalisasi yang sama persis, kemudian menghitung ulang makro berdasarkan gram. Tidak memakai fuzzy match otomatis agar makanan dengan cara masak berbeda tidak tertukar. Tanpa padanan, estimasi AI dipertahankan. Setiap hasil tetap dapat diedit pengguna.


# Target kalori pada onboarding

Pengguna mengisi tanggal lahir, jenis kelamin untuk rumus, tinggi, berat saat ini, target berat, aktivitas, dan bio opsional. Aplikasi tidak menampilkan input kalori manual. Target disimpan setelah pengguna melihat hasil dan memilih **Gunakan target & mulai**. Profil lama tetap dapat menghitung ulang melalui pengaturan profil.

## Dasar perhitungan

Estimasi energi istirahat menggunakan **Mifflin–St Jeor**:

- Laki-laki: `10 × kg + 6,25 × cm − 5 × usia + 5`.
- Perempuan: `10 × kg + 6,25 × cm − 5 × usia − 161`.

Usia dihitung dengan ulang tahun sebenarnya pada tanggal Jakarta. Sumber primer: [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/). Angka ini merupakan prediksi energi istirahat, bukan pengukuran metabolisme individu.

Estimasi kebutuhan harian = energi istirahat × faktor aktivitas pilihan: 1,2 / 1,375 / 1,55 / 1,725. Faktor ini adalah pendekatan aktivitas umum dalam aplikasi; bukan faktor dari penelitian Mifflin dan bukan model dinamis NIH Body Weight Planner.

Kebijakan awal aplikasi:

- Target berat lebih rendah: kurangi nilai terkecil antara 350 kkal dan 15% estimasi kebutuhan harian.
- Target sama: gunakan estimasi kebutuhan harian.
- Target lebih tinggi: tambahkan 250 kkal.
- Batas bawah target otomatis: 1.500 kkal laki-laki / 1.200 kkal perempuan. Jika batas bawah menaikkan hasil di atas kebutuhan terhitung, rincian menampilkan penyesuaian aktual.
- Target akhir dibulatkan sekali. Tampilan energi dasar dan kebutuhan harian juga dibulatkan; penyesuaian tampilan = target akhir − kebutuhan harian yang ditampilkan.

Pengurangan dan tambahan tersebut merupakan **kebijakan konservatif aplikasi**, bukan keluaran AI, resep medis, atau jaminan laju perubahan berat. Sebagai konteks, [pedoman AHA/ACC/TOS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5819889/) membahas rentang kalori dan defisit yang disesuaikan individu; aplikasi tidak mengklaim menerapkan keseluruhan pedoman.

## Peran AI dan batas penggunaan

Backend Supabase mengirim pekerjaan privat ke worker Opencraft. Worker menghitung angka dengan rumus yang sama seperti frontend; AI hanya menulis penjelasan dan tanggapan atas bio. Angka keluaran model tidak pernah digunakan menggantikan hasil rumus. Jika penjelasan AI gagal, hasil rumus tetap tersedia dan UI menunjukkan sumber penjelasannya.

Usia didukung 18–100, tinggi 100–250 cm, berat 30–350 kg, target maksimum 6.000 kkal. Target penurunan yang menghasilkan BMI di bawah 18,5 ditolak. Pengguna hamil/menyusui atau yang membutuhkan rencana nutrisi medis tidak diberi target otomatis. Kondisi yang disebut dalam bio juga dapat menghentikan penerapan hasil untuk ditinjau. Pemrosesan bio tidak menggantikan penilaian tenaga kesehatan. [NIH Body Weight Planner](https://www.niddk.nih.gov/bwp) juga membatasi perencanaan umum pada dewasa dan mengecualikan kehamilan/menyusui.

Hasil tersimpan mencakup tanggal perhitungan, usia, energi dasar, kebutuhan setelah aktivitas, penyesuaian, target, metode, dan sumber penjelasan. Data tubuh/bio sementara di antrean dihapus pada penyelesaian atau kedaluwarsa pekerjaan; profil pengguna menyimpan data yang mereka konfirmasi.

Verifikasi menggunakan vektor angka bersama untuk TypeScript/Python, ulang tahun, batas bawah, tiga tujuan, penolakan input, serta tes SQL akses dan privasi sebelum profil tersimpan.
