## Rencana Perubahan

### 1. Peminjaman buku — tambah tanggal
- `BookLoans.tsx`: tambah input **tanggal pinjam** (date picker) saat menambah peminjaman, sebelumnya otomatis `now()`. Default tetap hari ini.
- Tampilkan kolom tanggal pinjam & kembali di tabel.

### 2. Mahasiswa dikelompokkan per prodi
- `Users.tsx`: ubah dari list datar menjadi **accordion / section per `program_studi`**. Header tiap grup: nama prodi + jumlah mahasiswa. Mahasiswa tanpa prodi masuk grup "Lainnya".

### 3. Layar sukses absen (full screen card)
- `Attend.tsx`: setelah match sukses, **sembunyikan kamera besar** dan tampilkan card besar berisi: foto, nama, NIM, prodi, jam masuk. Kamera dikecilkan ke pojok (thumbnail) tetap berjalan untuk siap user berikutnya. Card hilang otomatis setelah ~5 detik → kembali ke mode kamera.

### 4. Export CSV/Excel
- Tambah tombol **Export CSV** di Dashboard admin (untuk `attendance_logs` join `users`) dan di `BookLoans.tsx`. Pakai util sederhana → blob CSV. Excel pakai format CSV (kompatibel Excel).

### 5. Tombol mata password admin
- `AdminGate.tsx`: tambah icon `Eye/EyeOff` di input password untuk toggle show/hide.

### 6. Sorotan bulan ini
- `MonthlyTopStudents.tsx`:
  - Tiap kategori tampil **top 3** (sudah ada).
  - **Hapus** kategori "Paling Konsisten Hadir".
  - **Ganti** dengan card **"Hari Terpadat"**: tampilkan tanggal-tanggal dengan jumlah kunjungan terbanyak bulan ini (top 3 hari + jumlah orang unik yang hadir hari itu).

### 7 & 8. Anti double-absen & deteksi hanya saat wajah dekat
- `Attend.tsx`:
  - **Threshold ukuran wajah**: hanya proses match bila bounding box wajah ≥ ~30% lebar frame (artinya user betul-betul mendekat). Orang lewat di belakang akan diabaikan.
  - **One-shot per sesi**: setelah berhasil absen, hentikan deteksi sampai (a) timer 5 detik habis DAN (b) wajah hilang dari frame (no detection ≥ 2 frame), baru aktifkan lagi. Ini memastikan user yang sama tidak terabsen 2x walaupun masih di depan kamera.
  - Cooldown 30 detik per user_id tetap dipertahankan sebagai pengaman kedua.

### 9. Tema warna merah-putih kalem
- `index.css` & `tailwind.config.ts`: ubah token semantic:
  - `--primary`: merah kalem (mis. `0 65% 50%` → seperti `#D14545`)
  - `--primary-glow`: merah muda lembut
  - `--background`: putih gading (`0 0% 99%`)
  - `--accent`: merah lebih lembut / coral muted
  - Gradient & shadow disesuaikan ke tone merah.
- Berlaku ke seluruh halaman (Landing, Admin, Attend) karena memakai token.

### 10. Ganti gambar hero landing
- Upload gambar ITSB yang dilampirkan user via `lovable-assets` → ganti `src/assets/itsb-campus.jpg` di `Landing.tsx` (bagian "live scan / hero kanan"). Hapus file lama.

---

### File yang akan diubah
- `src/pages/Attend.tsx` (3, 7, 8)
- `src/pages/BookLoans.tsx` (1, 4)
- `src/pages/Users.tsx` (2)
- `src/pages/Dashboard.tsx` (4 — tombol export)
- `src/components/AdminGate.tsx` (5)
- `src/components/MonthlyTopStudents.tsx` (6)
- `src/index.css`, `tailwind.config.ts` (9)
- `src/pages/Landing.tsx` + asset baru (10)
- `src/lib/exportCsv.ts` (baru, util kecil)

Tidak ada perubahan skema database (semua field sudah ada).
