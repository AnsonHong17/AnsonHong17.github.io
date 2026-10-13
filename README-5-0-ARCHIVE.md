# Kawan CBT 5.0 — Integrated Beta (4.3–4.7 in one test build)

**Ini versi ujian, belum diluluskan untuk rekod sebenar murid.** Semua fungsi baru menggunakan fail statik; tidak menggunakan API AI luaran. Ia tidak boleh memahami semua cerita seperti LLM sebenar.

## Cara buka
1. Extract ZIP. Buka folder `Kawan_CBT_5_0_Integrated_Beta` dengan VS Code.
2. Right click `index.html` → Open with Live Server.
3. **Jangan upload GitHub dahulu.** Semua ujian guna maklumat murid rekaan.
4. `supabase-config.js` sengaja dibiarkan kosong. Untuk ujian GBK sahaja, salin fail konfigurasi **publishable** dari folder ujian yang sudah berjaya; jangan salin secret/service_role key.
5. Jangan gunakan data sebenar sehingga sekolah memberi kebenaran dan ujian RLS, spam prevention, backup, retensi dan hak akses selesai.

## Yang baru
- **4.3 Smart**: ingatan fakta kategori untuk sesi ini sahaja; soalan susulan berbeza jika murid sudah mengajak kawan, cuma bermain bersama, atau guru tersalah faham. Tidak menyimpan teks murid secara baharu dan tidak mengubah laluan keselamatan.
- **4.4 Games**: Fakta atau Andaian? dan Misi Langkah Kecil, selain tiga permainan sedia ada. Tiada penghantaran rekod automatik.
- **4.5 Journey**: pilihan matlamat untuk sesi semasa dan cadangan pulau (tiada rekod automatik); tiga aktiviti asas mengemas kini meter kemajuan.
- **4.5 Kawan**: mood maskot bertukar secara ringkas mengikut perbualan; apabila keselamatan dibangkitkan, elak sambutan yang mengelirukan.
- **4.6 GBK Dashboard**: lima jumlah agregat selepas GBK diluluskan dan rekod dimuat daripada Supabase; klik status untuk tapis. Tutup Rekod memadam statistik dari UI, logout dan cache seperti sebelum ini. **Tab tersembunyi → logout; 10 minit tidak aktif dalam Rekod → logout**.
- **4.7 Accessibility**: teks besar, kontras, kurang gerakan, mod mudah dibaca. Tiada data murid disimpan daripada pilihan mod.
- **Asas 4.2.2**: typing effect, Safety Support, student voluntary submission, Supabase GBK and reset password retained.

## Ujian penting
- CBT biasa: cuba ayat kawan, guru, peperiksaan; taip sendiri; semak chat typing.
- Safety: `Saya dipukul dan tidak selamat` mesti terus ke laluan sokongan, bukan permainan fikiran positif.
- Student submit: privacy ON tidak boleh hantar; privacy OFF + persetujuan jelas boleh hantar hanya apabila Supabase dikonfigurasi.
- GBK: tanpa login tiada rekod; selepas login semak dashboard; tutup Rekod mesti logout; selepas beralih tab, mesti login semula.
- Data: mana-mana permainan tidak menghantar ke Supabase.

## Had nyata
- Pendekatan rule-based, bukan diagnosis / kaunselor sebenar. Moderator manusia diperlukan untuk risiko.
- Akses dashboard masih bergantung pada RLS sedia ada. Tiada audit pentest penuh.
- Anonymous student submissions masih memerlukan **server-side rate limit + bot protection** sebelum operasi sebenar.
- GitHub history **tidak backup database**. Sediakan polisi backup dan retensi melalui pentadbir sekolah.
- Mode membaca menggunakan CSS sahaja; bukan versi Easy Read yang ditulis semula dalam Bahasa Melayu mudah.
