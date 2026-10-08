# Diet Yuk design system

## Context and scene

Raka atau Anggun membuka PWA di iPhone saat jeda makan, biasanya di ruangan terang, untuk cepat memeriksa energi hari ini atau memotret piring. Light theme yang hangat sesuai konteks dan identitas aplikasi yang sudah ada.

## Color strategy

Restrained: krem sebagai latar, putih hangat sebagai permukaan, hijau untuk tindakan/pilihan, merah muda untuk pasangan, dan warna lembut untuk makro. Warna asli berasal dari `src/components/ui.tsx`. Token disesuaikan untuk kontras teks; gunakan warna penuh untuk status dan label, hindari bayangan/gradien dekoratif.

## Typography

Nunito 600 untuk isi dan 800 untuk judul/data, mengikuti aplikasi. Hierarki: judul halaman 28–30, bagian 18–20, isi 15–16, pendukung 13–14, label navigasi 11–12. Input selalu minimum 16. Angka energi menggunakan angka tabular. Kalimat panjang membungkus tanpa memaksa lebar layar.

## Layout

Prioritas portrait iPhone 12 dan 15 standar. Halaman maksimal 430 pt di browser lebar. Gutter 20, padding card 18, gap bagian 20–24 dan gap kontrol 8–12. Konten mematuhi safe area atas dan bawah. Navigasi bawah dan footer tindakan tidak menutupi isi; ruang bawah berasal dari token bersama.

## Components

Card radius 22, tombol utama radius 16 dengan tinggi minimum 52, input radius 14 dan tinggi minimum 52, chip dan tombol ikon minimum 44. Fokus/pressed/disabled/loading konsisten. Tombol kamera menjadi tindakan utama di dock; tab yang aktif memiliki label dan indikator, tidak hanya warna.

## Forms and motion

Form memiliki label tetap, urutan keyboard yang masuk akal, dan kesalahan yang memberi tindakan perbaikan. Onboarding menyimpan hanya setelah hasil ditinjau. Footer tindakan tersedia saat scroll dan menyesuaikan keyboard. Grafik merespons lebar card sebenarnya dan menghormati reduced motion. Tidak ada animasi dekoratif atau hover sebagai prasyarat.
