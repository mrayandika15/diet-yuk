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
