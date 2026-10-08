# UI dan UX iPhone 12 / iPhone 15

Tema hangat dipertahankan sesuai pilihan pengguna. Target utama: iPhone 12 dan iPhone 15 standar dalam portrait. Ukuran emulasi 390 × 844 dan 393 × 852 dengan safe area contoh 47/59 di atas dan 34 di bawah. Inset aplikasi sebenarnya dibaca dari perangkat melalui react-native-safe-area-context, tidak di-hardcode berdasarkan model.

## Perubahan

- Dashboard mendahulukan kalori, sisa energi, target, makro, dan foto makanan. Countdown menjadi konteks pendek; kategori makan dikelompokkan dalam daftar.
- Navigasi bawah memiliki lima area sentuh yang konsisten, label terbaca, dan tombol foto di tengah tanpa bagian yang menonjol menutupi isi. Halaman menyediakan ruang scroll sesuai tinggi dock dan safe area.
- Onboarding dan login memakai footer tindakan tetap. Langkah onboarding kembali ke bagian atas setelah berganti. Kesalahan terlihat dekat tindakan utama.
- Pemilih tanggal browser menggantikan pengetikan YYYY-MM-DD untuk lahir, pernikahan, dan tanggal makan.
- Kontrol porsi, hapus, tutup, pilihan waktu makan, dan toggle memiliki area minimum 44. Input memakai 16 px; fokus dan status pilihan ditandai jelas.
- Form review makanan dapat di-scroll; picker tidak membuka keyboard otomatis. Perubahan edit yang belum tersimpan meminta konfirmasi sebelum ditutup.
- Catatan dikelompokkan berdasarkan hari. Pencarian dapat dibersihkan dan kondisi kosong menyediakan tindakan foto pertama.
- Grafik mengukur lebar card sebenarnya dan menghormati reduced motion. Garis target kalori selalu berada dalam domain grafik. Rata-rata memakai hari yang memiliki catatan; hari tanpa catatan tidak dianggap konsumsi nol.
- Tinggi app shell mengikuti visual viewport. Navigasi disembunyikan saat keyboard menyempitkan viewport dan field aktif dibawa ke ruang yang terlihat. Pinch zoom tetap tersedia.

Pedoman platform: [safe area WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) dan [layout Apple](https://developer.apple.com/design/human-interface-guidelines/layout).

## Verifikasi 8 Oktober 2026

- Typecheck, 16 tes TypeScript, dan build PWA produksi lolos.
- Ego Browser memeriksa tujuh halaman pada kedua viewport: 14 pemeriksaan layout, tanpa overflow horizontal atau kontrol utama di bawah 44 px.
- Data contoh mencakup nama makanan panjang, kalori, log berat, dan pasangan. Harness terpisah di localhost hanya untuk UI; tidak mengubah data Supabase atau menyediakan jalan masuk pada build produksi.
- Onboarding data tubuh → aktivitas → hasil, toggle kebutuhan khusus, serta perubahan porsi → review diuji melalui UI fixture.
- Simulasi visual viewport saat keyboard memeriksa penyusutan tinggi, navigasi hilang/muncul, dan ukuran input.
- Aksi terakhir dashboard dapat di-scroll di atas dock. Kondisi catatan kosong dan progres kosong diperiksa.
- Screenshot dan hasil pemeriksaan berada di `.local/iphone-ux/` yang tidak di-commit.
- Preview produksi diperiksa pada halaman login. Alur Google dengan sesi nyata, pemilih tanggal Safari, keyboard iOS, kamera, dan PWA standalone masih perlu verifikasi di perangkat fisik. Emulasi Chromium tidak membuktikan perilaku Safari atau hardware.
