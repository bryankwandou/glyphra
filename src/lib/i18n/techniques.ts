/**
 * The mechanism explanations, in Indonesian.
 *
 * The one-line summary and the paragraph under "cara kerja sandi ini" live with
 * each cipher, in English, because that is where the implementation is and the
 * two must not drift apart. There are 207 of them across 101 techniques, and
 * translating every one is a batch of work, not a line.
 *
 * So this is an overlay rather than a second copy: a technique with an entry
 * here is read in Indonesian, and one without falls back to the English that
 * the cipher file already carries. Nothing breaks while the list is partial,
 * and `verify:tongue` checks the ones a beginner actually meets.
 *
 * Covered so far: every technique in BEGINNER_POOL — the five a student sees
 * before they see anything else. The rest are still English and are the next
 * batch; that is a gap, and it is written down rather than implied away.
 */
export type TechniqueProse = { summary: string; theory: string };

export const TECHNIQUE_ID: Readonly<Record<string, TechniqueProse>> = Object.freeze({
  caesar: {
    summary: 'Setiap huruf bergeser sejumlah tempat yang tetap di sepanjang abjad.',
    theory:
      'Nomori abjad dari A=0 sampai Z=25. Penyandian adalah C = (P + k) mod 26 untuk satu geseran k, ' +
      'dan pembacaannya P = (C − k) mod 26. Hanya ada 25 kunci yang berguna, jadi mencoba semuanya ' +
      'memecahkannya dalam hitungan detik — dan justru karena itulah sandi ini yang pertama ' +
      'diperkenalkan kepada siapa pun.',
  },
  atbash: {
    summary: 'Abjadnya dibalik: A menjadi Z, B menjadi Y, dan seterusnya.',
    theory:
      'Setiap huruf dipetakan ke pasangannya dari ujung yang berlawanan, C = 25 − P. Tidak ada kunci ' +
      'sama sekali, jadi tidak ada yang perlu dicari: menyandikan dan membaca adalah tindakan yang ' +
      'sama persis, dan menerapkannya dua kali mengembalikan pesan aslinya.',
  },
  rot13: {
    summary: 'Caesar yang dikunci pada 13, jadi menyandikan dan membaca adalah operasi yang sama.',
    theory:
      'Karena 13 tepat separuh dari 26, menggeser maju 13 dan mundur 13 memberi hasil yang sama. ' +
      'Itu membuatnya nyaman, bukan aman — ia dipakai untuk menutupi jawaban teka-teki atau bocoran ' +
      'cerita agar tidak terbaca sekilas, bukan untuk menyembunyikan apa pun dari orang yang berniat.',
  },
  a1z26: {
    summary: 'Setiap huruf ditulis sebagai nomor urutnya di abjad.',
    theory:
      'A=1 sampai Z=26, dan angka-angkanya dipisahkan supaya batas antar huruf tetap jelas — tanpa ' +
      'pemisah, "1-2" dan "12" tidak bisa dibedakan. Ini bukan penyandian melainkan penggantian ' +
      'bentuk: tidak ada rahasia yang ditambahkan, hanya cara lain menuliskan huruf yang sama.',
  },
  reverse: {
    summary: 'Urutan hurufnya dibalik dari belakang ke depan.',
    theory:
      'Tidak ada huruf yang berubah; hanya posisinya yang dibalik, jadi hitungan setiap huruf tetap ' +
      'persis sama. Karena itu ia lolos dari analisis frekuensi tanpa memberi perlindungan apa pun — ' +
      'contoh sekali jalan bahwa mengacak urutan dan mengganti huruf adalah dua hal yang berbeda.',
  },
});
