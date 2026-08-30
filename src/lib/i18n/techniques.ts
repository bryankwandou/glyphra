/**
 * The mechanism explanations, in Indonesian.
 *
 * The one-line summary and the paragraph under "cara kerja sandi ini" live with
 * each cipher, in English, because that is where the implementation is and the
 * two must not drift apart. There are 202 of them across 101 techniques.
 *
 * So this is an overlay rather than a second copy: a technique is read from the
 * entry here, and falls back to the English beside its implementation if it has
 * none. All 101 are covered, and `verify:language` fails the build if a
 * technique is ever added without one — a half-translated catalogue is how a
 * student ends up reading the wrong method in the right language.
 *
 * Translated by hand, not run through a translator. A summary that is merely
 * word-for-word teaches nothing: the terms are fixed deliberately and used the
 * same way throughout — teks asli, cipherteks, kunci, geseran, abjad, sandi
 * arus, sandi blok — so a student meeting them in one entry recognises them in
 * the next.
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

  // ------------------------------------------------------- substitusi satu abjad
  rot5: {
    summary: 'Pasangan ROT13 yang hanya bekerja pada angka: tiap digit bergeser lima tempat.',
    theory:
      'Digit 0-9 membentuk lingkaran sepuluh, dan lima adalah separuh dari sepuluh, jadi menggeser ' +
      'lima tempat membalikkan dirinya sendiri persis seperti ROT13 pada huruf. Hurufnya sendiri ' +
      'dilewatkan tanpa disentuh.',
  },
  rot18: {
    summary: 'ROT13 untuk hurufnya dan ROT5 untuk angkanya, dijalankan bersamaan.',
    theory:
      'Kedua bagiannya membalikkan dirinya sendiri, jadi gabungannya pun begitu. Ia ada karena ' +
      'ROT13 sendirian membiarkan angka tetap terbaca, dan angka itulah yang sering membocorkan isi ' +
      'yang seharusnya ditutupi.',
  },
  rot47: {
    summary: 'Berputar pada 94 karakter ASCII yang tercetak, bukan hanya pada 26 huruf.',
    theory:
      'Rentang ASCII tercetak 33-126 memuat 94 karakter. Menambah 47 — separuh dari 94 — berputar ' +
      'di dalam rentang itu dan membalikkan dirinya sendiri. Berbeda dari ROT13, ia mengacak tanda ' +
      'baca dan angka juga, sehingga hasilnya tampak jauh lebih asing tanpa menjadi lebih sulit ' +
      'dipecahkan sedikit pun.',
  },
  affine: {
    summary: 'Kalikan nomor hurufnya, lalu tambahkan sebuah pergeseran, semuanya modulo 26.',
    theory:
      'C = (a·P + b) mod 26. Pengali a harus koprima dengan 26 atau pemetaannya runtuh dan tidak ' +
      'mungkin dibalik lagi, sehingga tersisa dua belas nilai sah untuk a dan dua puluh enam untuk ' +
      'b — 312 kunci seluruhnya. Pembacaannya memerlukan invers modular dari a: P = a⁻¹·(C − b) mod ' +
      '26. Caesar adalah kasus khusus a = 1.',
  },
  multiplicative: {
    summary: 'Sandi afin dengan pergeseran dikunci pada nol — perkalian murni.',
    theory:
      'C = (a·P) mod 26 dengan a koprima terhadap 26. Huruf A selalu tetap, sebab 0 dikali apa pun ' +
      'tetap 0. Satu sifat tetap itu saja sudah membocorkan sandinya kepada siapa pun yang ' +
      'melakukan analisis frekuensi.',
  },
  keyword: {
    summary: 'Sebuah kata kunci membuka abjad campuran, dan huruf sisanya menyusul berurutan.',
    theory:
      'Tulis kata kuncinya dengan pengulangan dibuang, lalu lanjutkan dengan huruf yang belum ' +
      'terpakai menurut urutan abjad. Hasilnya adalah abjad substitusi utuh yang bisa dihafal ' +
      'seseorang dari satu kata saja, tanpa membawa tabel tertulis — keunggulan praktis yang ' +
      'membuatnya bertahan di lapangan selama berabad-abad. Kelemahannya, ekor abjadnya tetap ' +
      'berurutan, dan justru itulah yang dimanfaatkan para kriptanalis.',
  },
  'simple-substitution': {
    summary: 'Pemetaan satu-satu yang sepenuhnya bebas atas seluruh abjad.',
    theory:
      'Kuncinya adalah satu permutasi lengkap abjad, memberi 26! ≈ 4×10²⁶ kemungkinan — jauh di ' +
      'luar jangkauan pencarian menyeluruh. Ia tetap jatuh oleh analisis frekuensi, karena sidik ' +
      'jari statistik bahasanya selamat melewati penggantian itu tanpa berubah. Al-Kindi ' +
      'menuliskan serangan ini pada abad kesembilan.',
  },
  baconian: {
    summary: 'Tiap huruf menjadi kelompok lima simbol yang diambil dari dua simbol saja.',
    theory:
      'Francis Bacon menyandikan setiap huruf sebagai lima tanda biner — abjad "biliteral" miliknya, ' +
      'dan pada dasarnya sebuah kode biner lima bit tiga abad sebelum Baudot. Tujuannya penyamaran, ' +
      'bukan kerahasiaan: kedua simbol itu bisa disembunyikan sebagai dua jenis huruf cetak di ' +
      'dalam tulisan yang tampak biasa, sehingga pesannya tak terlihat, bukan sekadar tak terbaca. ' +
      'Versi di sini memakai varian 26 huruf agar setiap huruf berbeda.',
  },
  pigpen: {
    summary: 'Huruf diganti oleh potongan kisi yang mengurungnya.',
    theory:
      'Huruf ditata ke dalam dua kisi tic-tac-toe dan dua kisi X; setiap huruf digambar sebagai ' +
      'garis-garis yang mengelilingi selnya, dengan sebuah titik menandai kisi kedua dari tiap ' +
      'pasangan. Dipakai kaum Freemason dan kemudian oleh tawanan pihak Union dalam Perang Saudara ' +
      'Amerika. Secara kriptografis ia hanyalah substitusi satu abjad biasa — bentuk huruf yang ' +
      'asing adalah satu-satunya penghalang, dan itu pun bukan penghalang yang berarti.',
  },
  polybius: {
    summary: 'Tiap huruf menjadi nomor baris dan kolomnya dalam kisi 5×5.',
    theory:
      'Dua puluh lima sel memuat abjad dengan I dan J berbagi satu sel, sehingga setiap huruf ' +
      'menjadi sepasang angka dari 1 sampai 5. Polybius merancangnya untuk memberi isyarat dengan ' +
      'obor — dua kelompok obor terangkat untuk tiap huruf. Arti pentingnya justru datang belakangan: ' +
      'mengubah huruf menjadi pasangan koordinat adalah langkah pertama pada Bifid, Nihilist dan ' +
      'ADFGVX, dan itulah sebabnya kisi ini terus muncul kembali.',
  },
  'keyed-caesar': {
    summary: 'Sebuah kata kunci mencampur abjadnya, lalu geseran Caesar diterapkan di atasnya.',
    theory:
      'Menggabungkan keduanya menghapus ekor berurutan yang membocorkan sandi kata kunci biasa, ' +
      'tanpa menuntut operatornya menghafal satu permutasi acak penuh. Kuncinya adalah sebuah kata ' +
      'ditambah sebuah angka.',
  },
  chaocipher: {
    summary: 'Dua abjad yang menyusun ulang dirinya sendiri setelah setiap satu huruf.',
    theory:
      'John F. Byrne membangunnya di atas dua cakram berputar — abjad kiri untuk cipherteks dan ' +
      'abjad kanan untuk teks asli. Setelah tiap huruf kedua cakram berpermutasi: huruf yang ' +
      'terpakai diayun ke puncak, lalu satu huruf diangkat keluar dan disisipkan kembali di posisi ' +
      'keempat belas. Karena keadaannya berubah setiap karakter, huruf asli yang sama hampir tidak ' +
      'pernah tersandikan dengan cara yang sama dua kali. Byrne menawarkan hadiah bagi yang bisa ' +
      'memecahkannya dan wafat tanpa pernah mengungkap metodenya; mekanismenya baru terbuka pada 2010.',
  },

  // ------------------------------------------------------ substitusi banyak abjad
  vigenere: {
    summary: 'Kata kunci yang berulang memasok geseran Caesar yang berbeda untuk tiap posisi.',
    theory:
      'Tiap huruf kunci memilih satu dari dua puluh enam abjad tergeser, jadi satu huruf asli ' +
      'tersandikan berbeda tergantung di mana ia jatuh. Itu meratakan sebaran frekuensinya dan ' +
      'mengalahkan analisis biasa selama tiga abad, sampai ia dijuluki "le chiffre indéchiffrable". ' +
      'Kejatuhannya ada pada pengulangan: pemeriksaan Kasiski mengukur jarak antar potongan ' +
      'cipherteks yang berulang untuk memulihkan panjang kuncinya, dan setelah itu pesannya pecah ' +
      'menjadi sekian buah sandi Caesar biasa.',
  },
  beaufort: {
    summary: 'Teks aslinya dikurangkan dari kunci, bukan ditambahkan kepadanya.',
    theory:
      'C = (K − P) mod 26. Mengurangkan dengan urutan itu membuat sandinya timbal balik: ' +
      'menjalankan prosedur yang sama pada cipherteks mengembalikan teks aslinya, jadi satu ' +
      'pengaturan mesin melayani kedua arah. Francis Beaufort — perwira yang sama dengan skala ' +
      'angin itu — dianggap penemunya, dan sifat itu cukup berharga sampai mesin rotor Hagelin ' +
      'memakai susunan yang sama hingga jauh di abad kedua puluh.',
  },
  'variant-beaufort': {
    summary: 'Kuncinya dikurangkan dari teks asli — pembacaan Vigenère dipakai sebagai penyandian.',
    theory:
      'C = (P − K) mod 26. Ia adalah kebalikan persis dari Vigenère, yang berarti sebuah mesin ' +
      'Vigenère dapat menghasilkannya hanya dengan menjalankan pengaturan pembacaan. Tidak timbal ' +
      'balik, dan tidak lebih kuat daripada Vigenère.',
  },
  gronsfeld: {
    summary: 'Vigenère dengan kunci berupa angka, sehingga geserannya hanya 0 sampai 9.',
    theory:
      'Count Gronsfeld mengganti kata kuncinya dengan digit, yang membuat kunci mudah diingat dan ' +
      'mudah disampaikan secara lisan. Ongkosnya berat: hanya sepuluh dari dua puluh enam abjad ' +
      'yang pernah terpakai, jadi sebaran frekuensinya tetap benjol dan sandinya jatuh jauh lebih ' +
      'cepat daripada Vigenère sejati.',
  },
  trithemius: {
    summary: 'Geserannya maju satu di setiap posisi — tanpa kunci sama sekali.',
    theory:
      'Johannes Trithemius menerbitkan tabula recta, kisi 26×26 berisi abjad-abjad tergeser yang ' +
      'kelak diberi kunci oleh Vigenère. Dalam rancangan aslinya huruf pertama bergeser 0, yang ' +
      'kedua bergeser 1, dan seterusnya menurun di tabel. Ia leluhur setiap sandi banyak abjad, dan ' +
      'sama sekali tanpa kunci — mengetahui metodenya berarti mengetahui pesannya.',
  },
  autokey: {
    summary: 'Kunci pendek menyalakan arus kuncinya, lalu teks aslinya sendiri yang meneruskan.',
    theory:
      'Arus kuncinya adalah kata kunci disusul pesannya sendiri. Karena tidak ada yang berulang, ' +
      'pemeriksaan Kasiski tidak menemukan keberkalaan apa pun — cacat yang membunuh Vigenère biasa ' +
      'sekadar tidak ada di sini. Vigenère menganggap inilah sumbangan sejatinya, dan ia memang ' +
      'benar-benar lebih kuat. Ia masih menyerah pada serangan kata terduga: tebak satu potongan ' +
      'yang lazim, geser sepanjang cipherteks, dan tebakan yang benar menghasilkan teks terbaca ' +
      'yang kemudian memperpanjang kuncinya sendiri ke depan.',
  },
  'running-key': {
    summary: 'Kuncinya adalah bacaan panjang biasa, bukan satu kata yang diulang.',
    theory:
      'Kedua pihak menyepakati sebuah buku, halaman dan baris awal; teks itulah yang menjadi kunci. ' +
      'Tidak ada pengulangan, jadi serangan keberkalaan gagal. Kelemahannya, kuncinya adalah bahasa ' +
      'dan bukan acak — pesan dan kunci sama-sama membawa statistik bahasanya, dan seorang ' +
      'kriptanalis dapat menarik keduanya terpisah dengan menguji potongan kata yang masuk akal ' +
      'satu terhadap yang lain sampai kedua sisinya terbaca wajar.',
  },
  'one-time-pad': {
    summary: 'Kunci yang benar-benar acak, sepanjang pesannya, dipakai sekali lalu dimusnahkan.',
    theory:
      'Shannon membuktikan pada 1949 bahwa hanya inilah sandi dengan kerahasiaan sempurna: bila ' +
      'kuncinya acak, sepanjang teks aslinya dan tidak pernah dipakai ulang, setiap pesan yang ' +
      'mungkin dengan panjang itu sama-sama konsisten dengan cipherteksnya, sehingga menyadapnya ' +
      'tidak menyampaikan apa-apa. Teorinya rapat dan urusan logistiknya kejam — Anda harus ' +
      'mengedarkan bahan kunci sebanyak semua yang akan pernah Anda kirim. Memakai ulang satu pad ' +
      'menghancurkan jaminannya sepenuhnya, dan persis begitulah proyek Venona membaca lalu lintas ' +
      'Soviet bertahun-tahun.',
  },
  porta: {
    summary: 'Tiga belas abjad timbal balik, masing-masing dipakai bersama oleh sepasang huruf kunci.',
    theory:
      'Giovanni Battista della Porta membelah abjadnya menjadi dua. Tiga belas huruf pertama ' +
      'menempati baris atas; tiga belas berikutnya menempati baris bawah, diputar menurut huruf ' +
      'kuncinya. Menyandikan berarti menukar huruf antar kedua belahan, dan itulah yang membuat ' +
      'setiap abjadnya timbal balik — tabel yang sama juga membaca. Huruf kunci berpasangan (A dan ' +
      'B memilih baris yang sama, C dan D baris berikutnya), sehingga ruang kunci efektifnya ' +
      'separuh dari Vigenère.',
  },
  alberti: {
    summary: 'Dua cakram sepusat, dengan cakram dalam diputar satu takik pada selang yang tetap.',
    theory:
      'Leon Battista Alberti membangun sandi banyak abjad mekanis yang pertama: cincin luar yang ' +
      'tetap dan cincin dalam yang dapat berputar membawa abjad campuran. Setelah sejumlah huruf ' +
      'yang disepakati, cakram dalam berputar dan berpindah ke abjad baru di tengah pesan. Inilah ' +
      'putusnya hubungan dengan sandi satu abjad, hampir seabad mendahului Vigenère, dan karena ' +
      'itulah Alberti biasa disebut bapak kriptografi Barat.',
  },
  'quagmire-1': {
    summary: 'Sandi berkala yang dibangun dari abjad teks asli berkunci melawan abjad cipherteks lurus.',
    theory:
      'Keluarga Quagmire memperluas Vigenère dengan membolehkan abjad teks asli dan abjad ' +
      'cipherteks dicampur secara terpisah. Varian ini memakai abjad teks asli berkunci melawan ' +
      'abjad cipherteks lurus, digerakkan oleh kunci penunjuk tersendiri yang memilih baris mana ' +
      'yang berlaku di tiap posisi. Memecahkannya menuntut pemulihan periodenya dulu, baru ' +
      'abjadnya — jauh lebih banyak kerja daripada Vigenère, dan itulah sebabnya ACA menggolongkan ' +
      'keluarga ini sebagai konstruksi lanjutan. Kesepakatan penjajaran di sini: abjad cipherteks ' +
      'diputar sehingga huruf kuncinya duduk tepat di bawah huruf pertama abjad teks asli.',
  },
  'quagmire-2': {
    summary: 'Sandi berkala yang dibangun dari abjad teks asli lurus melawan abjad cipherteks berkunci.',
    theory:
      'Keluarga Quagmire memperluas Vigenère dengan membolehkan abjad teks asli dan abjad ' +
      'cipherteks dicampur secara terpisah. Varian ini memakai abjad teks asli lurus melawan abjad ' +
      'cipherteks berkunci, digerakkan oleh kunci penunjuk tersendiri yang memilih baris mana yang ' +
      'berlaku di tiap posisi. Memecahkannya menuntut pemulihan periodenya dulu, baru abjadnya — ' +
      'jauh lebih banyak kerja daripada Vigenère, dan itulah sebabnya ACA menggolongkan keluarga ' +
      'ini sebagai konstruksi lanjutan. Kesepakatan penjajaran di sini: abjad cipherteks diputar ' +
      'sehingga huruf kuncinya duduk tepat di bawah huruf pertama abjad teks asli.',
  },
  'quagmire-3': {
    summary: 'Sandi berkala yang dibangun dari abjad berkunci yang sama di kedua sisinya.',
    theory:
      'Keluarga Quagmire memperluas Vigenère dengan membolehkan abjad teks asli dan abjad ' +
      'cipherteks dicampur secara terpisah. Varian ini memakai abjad berkunci yang sama di kedua ' +
      'sisi, digerakkan oleh kunci penunjuk tersendiri yang memilih baris mana yang berlaku di tiap ' +
      'posisi. Memecahkannya menuntut pemulihan periodenya dulu, baru abjadnya — jauh lebih banyak ' +
      'kerja daripada Vigenère, dan itulah sebabnya ACA menggolongkan keluarga ini sebagai ' +
      'konstruksi lanjutan. Kesepakatan penjajaran di sini: abjad cipherteks diputar sehingga huruf ' +
      'kuncinya duduk tepat di bawah huruf pertama abjad teks asli.',
  },
  'quagmire-4': {
    summary: 'Sandi berkala yang dibangun dari dua abjad berkunci yang berbeda, satu di tiap sisi.',
    theory:
      'Keluarga Quagmire memperluas Vigenère dengan membolehkan abjad teks asli dan abjad ' +
      'cipherteks dicampur secara terpisah. Varian ini memakai dua abjad berkunci yang berbeda, ' +
      'satu di tiap sisi, digerakkan oleh kunci penunjuk tersendiri yang memilih baris mana yang ' +
      'berlaku di tiap posisi. Memecahkannya menuntut pemulihan periodenya dulu, baru abjadnya — ' +
      'jauh lebih banyak kerja daripada Vigenère, dan itulah sebabnya ACA menggolongkan keluarga ' +
      'ini sebagai konstruksi lanjutan. Kesepakatan penjajaran di sini: abjad cipherteks diputar ' +
      'sehingga huruf kuncinya duduk tepat di bawah huruf pertama abjad teks asli.',
  },
  enigma: {
    summary: 'Cakram berkabel yang berputar dan sebuah reflektor menghasilkan abjad baru tiap ketukan tombol.',
    theory:
      'Arus listrik melewati tiga rotor, membentur reflektor, dan kembali melewati ketiganya lewat ' +
      'jalur yang berbeda. Rotor paling kanan melangkah setiap ketukan dan yang lain maju pada ' +
      'takiknya, sehingga abjad penggantinya berubah tiap huruf dan tidak berulang selama 16.900 ' +
      'ketukan. Reflektornya membuat mesin itu timbal balik — pengaturan yang sama menyandikan dan ' +
      'membaca — tetapi ia juga menjamin tidak ada huruf yang pernah dipetakan ke dirinya sendiri, ' +
      'dan satu kebocoran struktural itulah baji yang dipakai Rejewski dan kemudian Bletchley Park ' +
      'untuk menembusnya. Model ini menerapkan rotor sejarah I–V dan reflektor B dengan setelan ' +
      'cincin dipatok di A. Papan sambungnya tidak diterapkan: papan itu menyumbang sebagian besar ' +
      'ruang kunci mesin yang sebenarnya, jadi yang Anda lihat di sini jelas jauh lebih lemah ' +
      'daripada aslinya di masa perang.',
  },

  // ------------------------------------------------------- substitusi berkelompok
  playfair: {
    summary: 'Huruf disandikan dua-dua memakai posisinya di dalam sebuah kisi 5×5.',
    theory:
      'Charles Wheatstone yang menemukannya; Lord Playfair yang mendorongnya masuk ke pemakaian ' +
      'pemerintah, dan namanyalah yang melekat. Pasangan huruf dicari di dalam kisi 5×5 berkunci ' +
      'lalu diganti menurut tiga aturan — sebaris, sekolom, atau sudut berseberangan dari persegi ' +
      'panjang yang dibentuknya. Karena ia bekerja pada 676 pasangan huruf dan bukan pada 26 huruf, ' +
      'analisis frekuensi huruf tunggal tidak berguna melawannya. Inggris memakainya dalam Perang ' +
      'Boer dan kedua perang dunia untuk lalu lintas taktis yang hanya perlu tetap rahasia beberapa jam.',
  },
  'two-square': {
    summary: 'Dua kisi 5×5 bertumpuk menyandikan sepasang huruf dengan menukar kolomnya.',
    theory:
      'Huruf pertama dicari di kisi atas dan yang kedua di kisi bawah, lalu kolomnya dipertukarkan. ' +
      'Operasinya timbal balik, jadi satu prosedur menyandikan sekaligus membaca. Ia membawa satu ' +
      'cacat yang sudah dikenal: ketika kedua hurufnya jatuh di kolom yang sama, pasangan itu ' +
      'lewat tanpa berubah, dan kira-kira satu dari lima pasangan melakukan tepat itu — menyerahkan ' +
      'teks asli cuma-cuma kepada penganalisisnya.',
  },
  'four-square': {
    summary: 'Dua kisi polos dan dua kisi berkunci, disusun dalam blok 2×2.',
    theory:
      'Félix Delastelle menata empat kisi 5×5: dua di diagonalnya memuat abjad berurutan dan ' +
      'membawa teks asli, sementara dua di luar diagonal diberi kunci dan membawa cipherteksnya. ' +
      'Sepasang huruf dicari di kisi polos dan dibaca keluar dari kisi sandi di sudut yang ' +
      'berseberangan. Tidak seperti sandi dua-kisi ia tidak punya pasangan yang lewat bening, dan ' +
      'tidak seperti Playfair ia tidak perlu aturan untuk huruf kembar — konstruksi yang lebih ' +
      'bersih pada kedua hitungan itu.',
  },
  'hill-2x2': {
    summary: 'Blok berisi 2 huruf dikalikan dengan sebuah matriks 2×2 modulo 26.',
    theory:
      'Lester Hill memperlakukan satu blok huruf sebagai vektor dan mengalikannya dengan matriks ' +
      'kunci atas Z26. Inilah sandi pertama yang menerapkan aljabar linear secara langsung, dan ia ' +
      'menyebarkan tiap huruf asli ke seluruh 2 huruf blok keluarannya, yang mematahkan analisis ' +
      'frekuensi pada setiap orde di bawah 2. Matriksnya harus dapat dibalik modulo 26, artinya ' +
      'determinannya harus koprima dengan 26. Sifatnya yang murni linear juga yang menjatuhkannya: ' +
      'serangan teks-asli-diketahui memulihkan matriksnya dengan memecahkan sistem persamaan ' +
      'linear, jadi segenggam blok yang berpasangan sudah membobolnya sama sekali.',
  },
  'hill-3x3': {
    summary: 'Blok berisi 3 huruf dikalikan dengan sebuah matriks 3×3 modulo 26.',
    theory:
      'Lester Hill memperlakukan satu blok huruf sebagai vektor dan mengalikannya dengan matriks ' +
      'kunci atas Z26. Inilah sandi pertama yang menerapkan aljabar linear secara langsung, dan ia ' +
      'menyebarkan tiap huruf asli ke seluruh 3 huruf blok keluarannya, yang mematahkan analisis ' +
      'frekuensi pada setiap orde di bawah 3. Matriksnya harus dapat dibalik modulo 26, artinya ' +
      'determinannya harus koprima dengan 26. Sifatnya yang murni linear juga yang menjatuhkannya: ' +
      'serangan teks-asli-diketahui memulihkan matriksnya dengan memecahkan sistem persamaan ' +
      'linear, jadi segenggam blok yang berpasangan sudah membobolnya sama sekali.',
  },

  // ------------------------------------------------------------------ transposisi
  'rail-fence': {
    summary: 'Huruf ditulis zigzag melintasi beberapa baris, lalu dibaca baris demi baris.',
    theory:
      'Tulis pesannya menurun dan menaik secara diagonal melintasi sejumlah rel yang tetap, lalu ' +
      'baca tiap rel dari kiri ke kanan. Tidak ada yang diganti — hurufnya sama, hanya urutannya ' +
      'yang berubah, jadi frekuensi hurufnya utuh dan langsung membongkar permainannya. Dengan ' +
      'hanya segelintir jumlah rel yang masuk akal, pencarian menyeluruh menuntaskannya seketika.',
  },
  redefence: {
    summary: 'Rail fence yang relnya dibaca menurut urutan berkunci, bukan dari atas ke bawah.',
    theory:
      'Zigzagnya sama persis dengan rail fence, tetapi sebuah kata kunci menentukan urutan ' +
      'pengiriman relnya. Itu menghapus petunjuk cuma-cuma bahwa rel pertama selalu dimulai dengan ' +
      'huruf pertama pesannya, dan menambahkan satu permutasi rel ke ruang kuncinya.',
  },
  columnar: {
    summary: 'Pesan mengisi kisi baris demi baris dan keluar kolom demi kolom, menurut urutan kata kunci.',
    theory:
      'Tulis pesannya melintang pada kisi selebar panjang kata kuncinya. Beri peringkat huruf kata ' +
      'kuncinya menurut abjad, lalu baca kolomnya keluar menurut peringkat itu. Karena baris ' +
      'terakhirnya biasanya tidak penuh, tinggi kolomnya tidak sama, dan menentukan kolom mana yang ' +
      'pendek adalah tugas pertama yang dihadapi seorang kriptanalis. Inilah sandi lapangan andalan ' +
      'kedua perang dunia — cukup sederhana untuk dikerjakan dengan pensil dan kertas di bawah ' +
      'tekanan, dan sungguh merepotkan bila kuncinya panjang.',
  },
  'double-columnar': {
    summary: 'Transposisi kolom yang dijalankan dua kali, dengan dua kata kunci berbeda.',
    theory:
      'Menjalankan transposisinya kedua kali dengan kunci yang berbeda mencerai-beraikan ' +
      'ketetanggaan yang selamat dari satu lintasan, dan itu mematahkan serangan penataan ulang ' +
      'yang membobol transposisi kolom tunggal. Angkatan darat Jerman memakainya dengan nama ' +
      'Doppelwürfel dan pihak Sekutu menilainya cukup sulit untuk pantas digarap dengan sungguh- ' +
      'sungguh. Reputasinya beralasan: bila dipakai benar, dengan kunci tak berkaitan yang panjangnya ' +
      'berbeda, ia tetap tak terpecahkan di lapangan untuk waktu yang lama.',
  },
  myszkowski: {
    summary: 'Sandi kolom yang huruf kunci berulangnya berbagi peringkat sehingga kolomnya berselang-seling.',
    theory:
      'Émile Myszkowski mengusulkan pemakaian kata kunci dengan pengulangan yang disengaja. Kolom ' +
      'yang dikepalai huruf yang sama mendapat peringkat yang sama, dan alih-alih dibaca satu demi ' +
      'satu, kolom-kolom itu dibaca bersamaan dari kiri ke kanan di sepanjang tiap baris. ' +
      'Penyelangan itu memecah blok kolom rapi yang dihasilkan sandi kolom biasa, dan justru itulah ' +
      'yang membuat serangan pencocokan kolom yang lazim lebih sulit diterapkan.',
  },
  scytale: {
    summary: 'Selembar pita dililitkan pada tongkat: membacanya sepanjang tongkat mengacak urutannya.',
    theory:
      'Panglima Sparta melilitkan pita kulit pada tongkat kayu dan menulis melintasi lilitannya. ' +
      'Setelah dilepas, hurufnya kacau urutan; dililitkan kembali pada tongkat dengan ketebalan ' +
      'yang cocok, pesannya muncul lagi. Garis tengah tongkat itulah seluruh kuncinya. Ia perangkat ' +
      'sandi militer tertua yang tercatat, dan secara matematis ia hanyalah transposisi kolom ' +
      'dengan kolomnya diambil menurut urutan alaminya.',
  },
  'route-spiral': {
    summary: 'Isi sebuah persegi panjang baris demi baris, lalu bacalah keluar mengikuti jalur spiral.',
    theory:
      'Angkatan darat Union memakai sandi jalur secara besar-besaran: pesannya masuk ke sebuah kisi ' +
      'dan keluar mengikuti jalur yang disepakati — spiral, ular, diagonal. Jalur itulah kuncinya. ' +
      'Yang dipakai di sini adalah spiral ke dalam mulai dari sudut kiri atas. Sandi jalur lemah ' +
      'bila berdiri sendiri, sebab kriptanalis yang berhasil menebak ukuran kisinya dapat mencoba ' +
      'sejumlah kecil jalur yang masuk akal dengan tangan.',
  },
  'block-rotation': {
    summary: 'Teksnya dipotong menjadi blok tetap dan tiap blok diputar sejauh yang sama.',
    theory:
      'Belah pesannya menjadi blok berukuran tetap dan putar huruf di dalam tiap blok. Karena ' +
      'permutasinya sama di setiap blok, menemukan batas bloknya adalah seluruh serangannya — satu ' +
      'potongan tebakan pendek biasanya sudah cukup. Ia kebanyakan muncul sebagai lapisan dalam ' +
      'pada teka-teki bersusun.',
  },
  amsco: {
    summary: 'Kisi kolom yang selnya memuat satu atau dua huruf menurut pola berselang-seling.',
    theory:
      'Alih-alih satu huruf per sel, AMSCO menyelang-nyelingkan huruf tunggal dan pasangan, dan ' +
      'polanya bergeser di tiap baris. Karena itu kolomnya memuat jumlah huruf yang berbeda bahkan ' +
      'ketika kisinya penuh, dan itu menghancurkan panjang kolom rapi yang membuat transposisi ' +
      'kolom biasa dapat digarap. Penyerangnya harus memecahkan pola selnya dan permutasi kuncinya ' +
      'sekaligus.',
  },
  'disrupted-columnar': {
    summary: 'Kisi kolom yang diisi dua lintasan, meninggalkan lalu menutup celah bertingkat di tiap baris.',
    theory:
      'Kisi kolom biasa mempertahankan hubungan diagonal yang dimanfaatkan serangan penataan ulang. ' +
      'Penggangguan menghapusnya: pada lintasan pertama tiap baris hanya diisi mulai dari titik ' +
      'awal yang ditentukan kuncinya, dan sel yang dilewati diisi pada lintasan kedua. Tidak ada ' +
      'yang berubah pada hurufnya, tetapi keteraturan posisi yang menjadi sandaran penyerang sudah ' +
      'hilang. Varian cara ini adalah kelaziman dalam sistem sandi tangan masa perang ketika mesin ' +
      'tidak tersedia.',
  },

  // ------------------------------------------------------------- pemecahan huruf
  bifid: {
    summary: 'Huruf dipecah menjadi koordinat, koordinatnya diaduk, lalu disatukan lagi menjadi huruf baru.',
    theory:
      'Gagasan Delastelle adalah memecah tiap huruf menjadi dua bagian yang saling bebas lalu ' +
      'mencampur bagian-bagian itu sebelum menyusunnya kembali. Setiap huruf menjadi satu baris dan ' +
      'satu kolom dalam kisi 5×5; di dalam tiap blok semua barisnya ditulis lebih dulu dan semua ' +
      'kolomnya menyusul, lalu arus angka yang dihasilkan dibaca kembali dua-dua. Karena itu satu ' +
      'huruf asli memengaruhi dua huruf cipherteks yang terpisah, dan dua huruf asli menyumbang ke ' +
      'satu huruf cipherteks. Itulah difusi yang sesungguhnya, berpuluh tahun sebelum istilahnya ' +
      'ada, dan itulah yang membuat Bifid jauh lebih sulit daripada apa pun yang murni substitusi.',
  },
  trifid: {
    summary: 'Gagasan yang sama dengan Bifid, tetapi tiap huruf pecah menjadi tiga koordinat, bukan dua.',
    theory:
      'Dua puluh tujuh sel — kubus 3×3×3 yang memuat abjad ditambah satu pengisi — memberi tiap ' +
      'huruf tiga koordinat dalam rentang 1 sampai 3. Di dalam tiap blok semua koordinat pertama ' +
      'ditulis, lalu semua yang kedua, lalu semua yang ketiga, dan arusnya dibaca kembali tiga-tiga. ' +
      'Memecah menjadi tiga bagian dan bukan dua menyebarkan tiap huruf asli ke bagian keluaran ' +
      'yang lebih luas lagi, dan Delastelle memang memaksudkannya sebagai saudara Bifid yang lebih ' +
      'kuat. Memecahkannya dengan tangan adalah pekerjaan yang sungguh berat.',
  },
  adfgx: {
    summary: 'Kisi 5×5 mengubah tiap karakter menjadi dua dari huruf A, D, F, G, X, lalu transposisi kolom mengacaknya.',
    theory:
      'Angkatan darat Jerman menurunkannya pada musim semi 1918. Huruf yang dipilih sebagai ' +
      'koordinat dipilih justru karena bunyinya sama sekali tidak mirip dalam Morse, sehingga ' +
      'kesalahan pengiriman berkurang. Memecah huruf lebih dulu dan mentransposisi kemudian adalah ' +
      'bagian yang penting: transposisinya memisahkan kedua belahan tiap karakter dan menyerakkannya ' +
      'ke seluruh pesan, sehingga penyerang bahkan tidak dapat mengenali simbol mana yang saling ' +
      'berpasangan. Georges Painvin memecahkannya pada 1918 di bawah tekanan luar biasa dan ' +
      'kehilangan berat badan cukup banyak karenanya — ia tetap salah satu prestasi kriptanalisis ' +
      'tangan yang paling dikenang.',
  },
  adfgvx: {
    summary: 'Kisi 6×6 mengubah tiap karakter menjadi dua dari huruf A, D, F, G, V, X, lalu transposisi kolom mengacaknya.',
    theory:
      'Angkatan darat Jerman menurunkannya pada musim semi 1918. Huruf yang dipilih sebagai ' +
      'koordinat dipilih justru karena bunyinya sama sekali tidak mirip dalam Morse, sehingga ' +
      'kesalahan pengiriman berkurang. Memecah huruf lebih dulu dan mentransposisi kemudian adalah ' +
      'bagian yang penting: transposisinya memisahkan kedua belahan tiap karakter dan menyerakkannya ' +
      'ke seluruh pesan, sehingga penyerang bahkan tidak dapat mengenali simbol mana yang saling ' +
      'berpasangan. Georges Painvin memecahkannya pada 1918 di bawah tekanan luar biasa dan ' +
      'kehilangan berat badan cukup banyak karenanya — ia tetap salah satu prestasi kriptanalisis ' +
      'tangan yang paling dikenang. Versi enam-kali-enam menambahkan angka, yang tidak dapat dibawa ' +
      'oleh versi lima-kali-lima yang asli.',
  },
  nihilist: {
    summary: 'Teks asli dan kunci sama-sama diubah menjadi koordinat kisi, lalu dijumlahkan sebagai angka.',
    theory:
      'Kaum revolusioner Rusia memakainya melawan polisi Tsar. Baik pesannya maupun kunci yang ' +
      'berulang diubah menjadi koordinat Polybius dua digit, dan pasangannya dijumlahkan sebagai ' +
      'angka biasa tanpa pengurangan simpanan — sehingga jumlahnya berkisar dari 22 sampai 110. Ia ' +
      'sebenarnya sandi Vigenère yang bekerja pada koordinat dan bukan pada huruf, dan ia mewarisi ' +
      'keberkalaan yang sama fatalnya: temukan panjang kuncinya dan pesannya berantakan menjadi ' +
      'kolom-kolom penjumlahan sederhana.',
  },
  'straddling-checkerboard': {
    summary: 'Huruf yang lazim menjadi satu digit, yang jarang menjadi dua — kode panjang berubah yang dikerjakan tangan.',
    theory:
      'Delapan huruf yang sering muncul duduk di baris atas dan berharga satu digit. Dua digit yang ' +
      'tidak terpakai menjadi gerbang menuju baris kedua dan ketiga, tempat huruf sisanya berharga ' +
      'dua digit masing-masing. Hasilnya memampatkan pesannya dan, yang lebih penting, ' +
      'menghancurkan batas karakter yang tetap — penyadap tidak dapat mengetahui di mana satu huruf ' +
      'berakhir dan huruf berikutnya mulai tanpa papannya. Intelijen Soviet membangun sandi VIC di ' +
      'atasnya, dan gabungan itu bertahan melawan FBI bertahun-tahun.',
  },

  // -------------------------------------------------- penyandian dan representasi
  base64: {
    summary: 'Tiga byte dikemas ulang menjadi empat karakter tercetak.',
    theory:
      'Dua puluh empat bit terbagi rata menjadi empat kelompok enam bit, dan 64 simbol menutupi ' +
      'setiap nilai enam bit. Ia ada karena sistem surat elektronik awal merusak apa pun yang bukan ' +
      'teks tercetak, sehingga data biner harus diselundupkan lewat sebagai huruf. Ia penyandian, ' +
      'bukan sandi — tidak ada kunci dan tidak ada kerahasiaan, meski ia terus-menerus dikira ' +
      'demikian. Tanda = di ekornya adalah pengisi sampai batas empat karakter.',
  },
  base32: {
    summary: 'Lima byte dikemas ulang menjadi delapan karakter, memakai abjad tanpa bentuk yang rancu.',
    theory:
      'Abjadnya sengaja membuang 0, 1 dan 8 supaya tidak tertukar dengan O, I dan B ketika seseorang ' +
      'membacakan sebuah kode atau mengetiknya ulang dari kertas. Itu membuatnya lebih gemuk ' +
      'daripada Base64 tetapi jauh lebih tahan banting di tangan manusia, dan karena itulah ia ' +
      'muncul pada kode pemulihan, alamat onion dan rahasia TOTP.',
  },
  base16: {
    summary: 'Tiap byte ditulis sebagai dua digit heksadesimal.',
    theory:
      'Basis 16 sejajar sempurna dengan biner — satu digit heks tepat empat bit — jadi satu byte ' +
      'selalu dua karakter dan batasnya tidak pernah bergeser. Ia melipatduakan ukuran datanya, dan ' +
      'karena itu ia dipakai untuk menampilkan dan menelusuri kesalahan, bukan untuk mengangkut.',
  },
  base58: {
    summary: 'Basis 62 dengan karakter yang rancu secara penglihatan dibuang.',
    theory:
      'Satoshi Nakamoto membuang 0, O, I dan l dari abjadnya supaya sebuah alamat dapat dibacakan, ' +
      'ditulis tangan, atau diketik ulang tanpa kesalahan yang mahal, dan membuang + serta / supaya ' +
      'satu klik ganda memilih seluruh untaiannya. Karena 58 bukan pangkat dua, ia tidak dapat ' +
      'dikerjakan dengan penggeseran bit sederhana — seluruh masukannya diperlakukan sebagai satu ' +
      'bilangan bulat besar dan diubah lewat pembagian berulang. Byte nol di depan disimpan ' +
      'terpisah, sebab aritmetika akan menelannya.',
  },
  base36: {
    summary: 'Angka dan huruf kecil, memperlakukan masukannya sebagai satu bilangan bulat.',
    theory:
      'Tiga puluh enam simbol adalah abjad terbesar yang selamat dari penyeragaman besar-kecil ' +
      'huruf, dan itu penting di mana pun nilainya mungkin melewati sistem yang membesarkan huruf. ' +
      'Pengenal pendek dan potongan URL memakainya tepat karena alasan itu.',
  },
  base62: {
    summary: 'Angka ditambah kedua bentuk huruf — penyandian alfanumerik murni yang paling padat.',
    theory:
      'Enam puluh dua simbol adalah segala yang alfanumerik dan tidak lebih, sehingga keluarannya ' +
      'selamat melewati URL, nama berkas dan argumen shell tanpa disentuh. Pemendek tautan ' +
      'memakainya untuk memeras pencacah terbesar ke dalam karakter paling sedikit tanpa perlu ' +
      'melarikan apa pun.',
  },
  ascii85: {
    summary: 'Empat byte menjadi lima karakter, memakai 85 simbol tercetak.',
    theory:
      'Delapan puluh lima adalah basis terkecil yang lima karakternya dapat membawa empat byte, ' +
      'sebab 85⁵ tepat melampaui 2³². Itu memberi kelebihan sekitar 25% melawan 33% milik Base64, ' +
      'yang berarti ketika PostScript dan PDF perlu menyisipkan gambar sebagai teks. Abjadnya yang ' +
      'lebih padat memuat tanda baca, jadi keluarannya ringkas tetapi merepotkan di lingkungan yang ' +
      'memperlakukan karakter itu secara khusus.',
  },
  binary: {
    summary: 'Tiap karakter ditulis sebagai delapan bit.',
    theory:
      'Pandangan paling langsung tentang apa sebenarnya sebuah karakter di dalam memori. Delapan ' +
      'bit per karakter berarti keluarannya delapan kali lebih panjang daripada masukannya, yang ' +
      'membuatnya tak berguna untuk penyimpanan dan sempurna untuk mengajar. Mengenali pola ' +
      '010xxxxx sebagai huruf besar dan 011xxxxx sebagai huruf kecil adalah gerak refleks yang ' +
      'sungguh berguna.',
  },
  octal: {
    summary: 'Tiap karakter ditulis sebagai tiga digit oktal.',
    theory:
      'Basis 8 mengelompokkan bit bertiga-tiga, yang cocok untuk mesin berkata 12, 24 atau 36 bit. ' +
      'Heksadesimal menggesernya begitu byte 8 bit menang, tetapi ia bertahan pada izin berkas Unix ' +
      'dan pada urutan pelarian.',
  },
  'decimal-ascii': {
    summary: 'Tiap karakter ditulis sebagai titik kodenya dalam desimal.',
    theory:
      'Representasi angka yang paling polos. Nilainya dalam teka-teki adalah bahwa angka 65-90 dan ' +
      '97-122 dikenali sekilas sebagai huruf besar dan huruf kecil, sehingga pembacaan sebagian ' +
      'mungkin dilakukan dengan mata.',
  },
  'url-encoding': {
    summary: 'Karakter yang dicadangkan diganti oleh tanda persen dan dua digit heks.',
    theory:
      'URL memberi makna khusus kepada karakter seperti /, ? dan &, jadi karakter itu harus ' +
      'dilarikan bila muncul sebagai data. Aturannya sederhana, tetapi melapisinya — menyandikan ' +
      'untaian yang sudah tersandikan — adalah sumber berulang bagi kutu program sekaligus ' +
      'penghindaran saringan yang disengaja, dan karena itu ia begitu sering muncul dalam kerja ' +
      'keamanan.',
  },
  'html-entities': {
    summary: 'Tiap karakter ditulis sebagai &#nnn; memakai titik kodenya.',
    theory:
      'HTML memperbolehkan karakter apa pun ditulis sebagai rujukan angka. Ia ada supaya <, > dan & ' +
      'dapat muncul sebagai teks alih-alih sebagai markah, tetapi karena setiap karakter dapat ' +
      'ditulis begitu, ia juga muslihat baku untuk menyelinap melewati saringan naif yang hanya ' +
      'mencari karakter harfiahnya.',
  },
  'quoted-printable': {
    summary: 'Teks yang sebagian besar terbaca, dengan byte yang canggung dilarikan sebagai =XX.',
    theory:
      'Dirancang untuk surel yang membawa teks yang nyaris seluruhnya ASCII dengan sesekali huruf ' +
      'beraksen. Tidak seperti Base64 ia membiarkan bagian yang terbaca tetap terbaca, sehingga ' +
      'pesannya tetap terbaca bahkan oleh perangkat lunak yang tidak membacanya kembali. Karakter ' +
      'pelariannya adalah =, yang dengan sendirinya harus dilarikan sebagai =3D.',
  },
  morse: {
    summary: 'Huruf menjadi rangkaian tanda pendek dan panjang.',
    theory:
      'Samuel Morse dan Alfred Vail memberikan rangkaian terpendek kepada huruf Inggris yang paling ' +
      'sering muncul — E satu titik, T satu garis — dan itu menjadikannya salah satu pemakaian ' +
      'frekuensi yang paling awal dan disengaja untuk memampatkan pesan. Ia kode untuk pengiriman, ' +
      'bukan untuk penyembunyian; siapa pun yang mengetahuinya membacanya langsung. Ia bertahan ' +
      'karena telinga manusia dapat membacanya menembus derau yang akan mengalahkan hampir apa pun ' +
      'yang lain.',
  },
  'tap-code': {
    summary: 'Tiap huruf menjadi dua kelompok ketukan: baris, jeda, kolom.',
    theory:
      'Tawanan Amerika di Vietnam memakainya untuk berbicara menembus dinding sel — Kapten Carlyle ' +
      'Harris mengajarkannya setelah mendengarnya dari seorang instruktur, dan ia menyebar ke ' +
      'seluruh kamp. Kisi 5×5 dengan K dilipat ke C berarti setiap huruf adalah dua angka kecil, ' +
      'dan ketukan merambat lewat beton ketika suara tidak. Ia tidak memerlukan peralatan, tidak ' +
      'memerlukan cahaya, dan tidak memerlukan rahasia bersama apa pun selain kisinya sendiri.',
  },
  'nato-phonetic': {
    summary: 'Tiap huruf diucapkan sebagai satu kata yang khas.',
    theory:
      'Kata-katanya dipilih setelah bertahun-tahun pengujian kejelasan lintas bahasa dan lewat ' +
      'sambungan radio yang buruk: tidak ada dua yang terdengar mirip, dan masing-masing selamat ' +
      'dari cacat suara yang berat. Juliett membawa dua huruf T dan Alfa membuang PH supaya penutur ' +
      'bahasa lain tidak salah melafalkannya. Ia tidak menyembunyikan apa pun — seluruh tujuannya ' +
      'justru kebalikannya.',
  },
  leetspeak: {
    summary: 'Huruf tertentu diganti oleh angka yang bentuknya menyerupainya.',
    theory:
      'Ia tumbuh di papan buletin, sebagian sebagai penanda kelompok dan sebagian untuk menyelipkan ' +
      'kata melewati saringan kata kunci yang kasar — muslihat penggantian yang sama masih muncul ' +
      'pada spam dan pada usaha menghindari moderasi. Hanya huruf yang bentuknya menyerupai yang ' +
      'dipetakan di sini, dan itulah yang menjaga penggantiannya tetap dapat dibalik.',
  },
  braille: {
    summary: 'Tiap huruf menjadi pola titik timbul dalam sel berisi enam posisi.',
    theory:
      'Louis Braille berumur lima belas tahun ketika ia merampungkannya, menyadur sistem tulisan ' +
      'malam militer yang terbukti terlalu rumit bagi para prajurit. Enam posisi titik memberi 64 ' +
      'kombinasi, cukup untuk abjadnya dengan ruang tersisa bagi tanda baca dan singkatan. Blok ' +
      'Unicode yang dipakai di sini memetakan tiap sel ke satu karakter, sehingga polanya selamat ' +
      'sebagai teks.',
  },
  'gray-code': {
    summary: 'Tiap byte ditulis ulang sehingga nilai yang berurutan berbeda tepat pada satu bit.',
    theory:
      'Frank Gray merancangnya untuk modulasi kode pulsa, tetapi sifat yang membuatnya termasyhur ' +
      'bersifat mekanis: pada sebuah pengode putar, biner biasa dapat menunjukkan pembacaan yang ' +
      'sangat keliru di tengah peralihan ketika beberapa bit berubah sekaligus. Kode Gray mengubah ' +
      'satu bit pada satu waktu, jadi salah baca terburuknya meleset satu. Transformasinya adalah ' +
      'g = n XOR (n >> 1), dan membalikkannya menuntut penumpukan XOR dari bit teratas ke bawah.',
  },

  // ------------------------------------------------------------- simetris modern
  'xor-single': {
    summary: 'Tiap byte dipadukan dengan satu byte tetap memakai exclusive-or.',
    theory:
      'XOR adalah invers dirinya sendiri, jadi penyandian dan pembacaan adalah operasi yang sama. ' +
      'Dengan hanya 256 kunci yang mungkin, pencarian menyeluruh berlangsung seketika — serangan ' +
      'bakunya mencoba seluruh 256 dan menilai tiap hasilnya menurut seberapa dekat frekuensi ' +
      'hurufnya dengan bahasa Inggris. Ia muncul terus-menerus dalam perangkat perusak dan dalam ' +
      'soal capture-the-flag untuk pemula justru karena ia sepele diterapkan dan sepele dipecahkan.',
  },
  'xor-repeating': {
    summary: 'Kunci pendek diputar sepanjang pesannya dan di-XOR byte demi byte.',
    theory:
      'Ini Vigenère yang bekerja pada byte alih-alih pada huruf, dan ia gagal karena alasan yang ' +
      'sama. Panjang kuncinya dipulihkan dengan mencari geseran yang memperkecil jarak Hamming ' +
      'antara blok bertetangga, dan setelah itu pesannya pecah menjadi sekian soal XOR satu byte, ' +
      'masing-masing dipecahkan dengan analisis frekuensi. Inilah latihan klasik untuk mempelajari ' +
      'bagaimana pengulangan menghancurkan sandi arus.',
  },
  rc4: {
    summary: 'Sandi arus yang mengaduk tabel 256 byte dan meng-XOR keluarannya terhadap pesan.',
    theory:
      'Ron Rivest merancang RC4 sebagai rahasia dagang; seseorang mengirimkannya secara anonim ke ' +
      'sebuah milis pada 1994 dan ia menjadi sandi arus yang paling luas terpasang di dunia, ' +
      'menopang SSL dan WEP bertahun-tahun. Ia luar biasa ringkas — seluruh algoritmanya muat dalam ' +
      'beberapa baris. Ia juga rusak parah: byte-byte pertama arus kuncinya berat sebelah secara ' +
      'terukur, dan kemiringan itu cukup untuk membobol WEP sama sekali dan kemudian mengancam TLS. ' +
      'Ia dilarang dalam TLS sejak 2015 dan sepatutnya diperlakukan sebagai barang museum, bukan ' +
      'sebagai perkakas.',
  },
  chacha20: {
    summary: 'Sandi arus modern yang dibangun dari penjumlahan, perputaran dan exclusive-or.',
    theory:
      'Daniel Bernstein menyaring Salsa20 buatannya sendiri menjadi ChaCha20. Keadaannya adalah ' +
      'enam belas kata 32 bit — empat tetapan, kuncinya, sebuah pencacah blok dan sebuah nonce — ' +
      'yang diaduk oleh dua puluh putaran fungsi seperempat-putaran yang hanya menjumlah, memutar ' +
      'dan meng-XOR. Karena tidak memakai tabel pencarian, tidak ada akses memori yang bergantung ' +
      'pada data, dan itu menghapus saluran samping waktu-singgahan yang mengganggu penerapan AES ' +
      'berbasis tabel. Ia cepat dalam perangkat lunak tanpa perangkat keras khusus, dan itulah ' +
      'sebabnya TLS, WireGuard dan SSH sama-sama memakainya. Perhatikan bahwa yang ini sandi ' +
      'mentahnya: penerapan sungguhan memasangkannya dengan Poly1305 supaya cipherteksnya tidak ' +
      'dapat diutak-atik tanpa ketahuan.',
  },
  tea: {
    summary: 'Sandi blok 64 bit yang cukup kecil untuk dihafal, dibangun dari penjumlahan, penggeseran dan XOR.',
    theory:
      'Wheeler dan Needham menulis TEA sesingkat yang mungkin bagi sandi blok sungguhan — beberapa ' +
      'baris, tanpa tabel, tanpa jadwal kunci yang pantas disebut begitu. Ia menjalankan 32 putaran ' +
      'Feistel memakai sebuah tetapan yang diturunkan dari rasio emas untuk memecah kesetangkupan ' +
      'antar putaran. Ia punya cacat sungguhan: setiap kunci setara dengan tiga kunci lain, yang ' +
      'memangkas ruang kunci efektifnya menjadi 126 bit dan menjadikannya jalan masuk serangan ' +
      'terhadap Xbox yang pertama. XTEA ditulis untuk memperbaikinya.',
  },
  'aes-128-ecb': {
    summary: 'AES yang diterapkan pada tiap blok 16 byte secara terpisah.',
    theory:
      'Rijndael, karya Daemen dan Rijmen, memenangi sayembara terbuka NIST dan menjadi AES pada ' +
      '2001. Tiap putarannya menerapkan empat langkah: penggantian per byte lewat S-box yang ' +
      'dibangun dari pembalikan di GF(2⁸), penggeseran baris, pencampuran kolom yang berupa ' +
      'perkalian matriks di medan yang sama, dan XOR dengan kunci putaran. AES-128 menjalankan ' +
      'sepuluh putaran semacam itu. Setelah lebih dari dua dasawarsa serangan terbuka, pembobolan ' +
      'terbaik yang diketahui atas sandi utuhnya nyaris tidak lebih baik daripada pencarian ' +
      'menyeluruh. Mode electronic codebook menyandikan tiap blok secara terpisah, sehingga blok ' +
      'teks asli yang sama memberi cipherteks yang sama. Struktur sebuah gambar yang disandikan ' +
      'begini tetap terlihat jelas — inilah peragaan baku mengapa ECB tidak boleh dipakai untuk ' +
      'data sungguhan. Ia disajikan di sini untuk dikenali, bukan untuk dipakai.',
  },
  'aes-128-cbc': {
    summary: 'AES dengan tiap blok di-XOR terhadap blok cipherteks sebelumnya sebelum disandikan.',
    theory:
      'Rijndael, karya Daemen dan Rijmen, memenangi sayembara terbuka NIST dan menjadi AES pada ' +
      '2001. Tiap putarannya menerapkan empat langkah: penggantian per byte lewat S-box yang ' +
      'dibangun dari pembalikan di GF(2⁸), penggeseran baris, pencampuran kolom yang berupa ' +
      'perkalian matriks di medan yang sama, dan XOR dengan kunci putaran. AES-128 menjalankan ' +
      'sepuluh putaran semacam itu. Setelah lebih dari dua dasawarsa serangan terbuka, pembobolan ' +
      'terbaik yang diketahui atas sandi utuhnya nyaris tidak lebih baik daripada pencarian ' +
      'menyeluruh. Perantaian blok sandi mengumpankan tiap blok cipherteks ke masukan blok ' +
      'berikutnya, sehingga blok teks asli yang sama tidak lagi menghasilkan cipherteks yang sama. ' +
      'Ia memerlukan vektor awal yang baru dan tak tertebak untuk setiap pesan, dan dengan ' +
      'sendirinya ia tetap tidak memberi perlindungan apa pun terhadap pengutak-atikan.',
  },

  // ----------------------------------------------------------- hash dan keutuhan
  sha256: {
    summary: 'Hash kriptografis andalan masa kini, menghasilkan ringkasan 256 bit.',
    theory:
      'Dirancang NSA dan diterbitkan NIST, SHA-256 mengolah pesannya dalam blok 512 bit melewati 64 ' +
      'putaran fungsi pemampat yang dibangun dari perputaran, penggeseran dan penjumlahan modular. ' +
      'Tidak ada serangan tumbukan atau prabayangan yang praktis diketahui. Ia menopang Bitcoin, ' +
      'penandatanganan kode, rantai sertifikat dan pada dasarnya setiap pemeriksaan keutuhan dalam ' +
      'komputasi modern. Kecepatannya justru menjadi beban untuk satu pekerjaan tertentu — ' +
      'penyimpanan kata sandi — dan itulah sebabnya bcrypt, scrypt dan Argon2 ada sebagai gantinya.',
  },
  sha1: {
    summary: 'Hash 160 bit, kini rusak untuk ketahanan terhadap tumbukan.',
    theory:
      'SHA-1 bertahan dua dasawarsa sebelum teori menyusulnya. Google dan CWI memperagakan tumbukan ' +
      'praktis yang pertama pada 2017 lewat serangan SHAttered, menghasilkan dua PDF berbeda dengan ' +
      'ringkasan yang sama, dan serangan SHAmbles pada 2020 membuat tumbukan berawalan pilihan ' +
      'menjadi terjangkau. Ia mati untuk tanda tangan dan sertifikat. Ia bertahan pada penamaan ' +
      'objek Git, tempat ketahanan tumbukan memang tidak pernah menjadi sifat yang diandalkan — ' +
      'meski Git tetap berpindah menjauh darinya.',
  },
  md5: {
    summary: 'Hash 128 bit, rusak menyeluruh dan masih sering dijumpai.',
    theory:
      'Tumbukan pada MD5 dapat dihasilkan dalam hitungan detik di perangkat keras biasa. Wang dan ' +
      'Yu membobolnya pada 2004, dan pada 2008 peneliti memakai tumbukan berawalan pilihan untuk ' +
      'memalsukan sertifikat otoritas sertifikat; perangkat perusak Flame memakai serangan sekelas ' +
      'itu terhadap Windows Update pada 2012. Ia hanya masih dapat diterima sebagai penjumlah ' +
      'pemeriksa tanpa lawan — mendeteksi kerusakan yang tidak disengaja — dan tidak boleh sekali ' +
      'pun dipakai di tempat seseorang mungkin menyusun masukannya dengan sengaja.',
  },
  crc32: {
    summary: 'Penjumlah pemeriksa 32 bit dari pembagian polinomial, bukan hash kriptografis.',
    theory:
      'CRC-32 memperlakukan pesannya sebagai polinomial atas GF(2) dan mengambil sisanya setelah ' +
      'dibagi oleh sebuah pembangkit tetap. Ia sangat baik untuk apa yang dirancangnya — menangkap ' +
      'galat beruntun pada sambungan berderau atau di dalam berkas yang rusak — dan dipakai oleh ' +
      'Ethernet, PNG dan ZIP. Ia sama sekali tidak memberi keamanan: fungsinya linear, jadi siapa ' +
      'pun dapat mengubah sebuah pesan dan menyetelnya agar penjumlah pemeriksanya tetap sama.',
  },
  crc16: {
    summary: 'Penjumlah pemeriksa polinomial 16 bit yang dipakai pada protokol serial.',
    theory:
      'Gagasan pembagian polinomial yang sama dengan CRC-32 dengan register yang lebih pendek dan ' +
      'pembangkit 0x1021. Ia muncul pada XMODEM, Bluetooth dan protokol tertanam yang tak ' +
      'terhitung, di mana enam belas bit deteksi galat sudah memadai dan tiap byte tambahan berharga.',
  },
  adler32: {
    summary: 'Dua jumlah berjalan yang digabungkan menjadi penjumlah pemeriksa 32 bit.',
    theory:
      'Mark Adler merancangnya untuk zlib sebagai pengganti CRC-32 yang lebih cepat. Satu penumpuk ' +
      'menjumlahkan byte-nya dan yang lain menjumlahkan penumpuk itu, keduanya modulo 65521. Ia ' +
      'menghitung dengan cepat tetapi mendeteksi galat kurang andal daripada CRC-32, dan ia ' +
      'terutama lemah pada masukan pendek ketika jumlahnya hampir tidak punya ruang untuk bergerak.',
  },
  fnv1a: {
    summary: 'Hash non-kriptografis yang cepat, dipakai untuk tabel pencarian.',
    theory:
      'Fowler, Noll dan Vo membangunnya untuk tabel hash: XOR-kan tiap byte ke dalam penumpuknya, ' +
      'lalu kalikan dengan sebuah bilangan prima besar. Ia menyebarkan kunci dengan baik dan nyaris ' +
      'tidak berbiaya untuk dihitung. Ia sepele dibalik dan sepele ditumbukkan dengan sengaja, dan ' +
      'itu memungkinkan serangan banjir hash terhadap kerangka kerja web sampai mereka berpindah ke ' +
      'hash berkunci seperti SipHash.',
  },

  // -------------------------------------------------- asimetris dan teori bilangan
  'rsa-textbook': {
    summary: 'Penyandian dengan memangkatkan tiap nilai ke eksponen publik modulo hasil kali dua prima.',
    theory:
      'Rivest, Shamir dan Adleman membangun sistem sandi kunci publik yang pertama dan praktis. ' +
      'Pilih dua prima p dan q, misalkan n = pq, dan pilih e yang koprima dengan (p−1)(q−1). ' +
      'Eksponen pribadi d adalah invers modular dari e. Penyandiannya c = mᵉ mod n dan pembacaannya ' +
      'm = c^d mod n; keduanya saling membatalkan menurut teorema Euler. Keamanannya bersandar pada ' +
      'sulitnya memfaktorkan n, dan itu memang sulit untuk bilangan berukuran nyata. Yang ' +
      'ditampilkan di sini adalah RSA buku teks dengan prima kecil: ia deterministik, jadi karakter ' +
      'yang sama memberi cipherteks yang sama, dan menyandikan karakter demi karakter membocorkan ' +
      'struktur pesannya sepenuhnya. RSA sungguhan memakai pengisi OAEP dan menyandikan sebuah ' +
      'kunci simetris, bukan pesannya sendiri.',
  },
  'exponentiation-cipher': {
    summary: 'Tiap nilai dipangkatkan ke sebuah eksponen rahasia modulo sebuah prima.',
    theory:
      'Pohlig dan Hellman mengusulkan penyandian c = mᵉ mod p untuk sebuah prima p, dengan ' +
      'pembacaan m = c^d mod p di mana d adalah invers dari e modulo p−1. Tidak seperti RSA, kedua ' +
      'eksponennya rahasia, jadi ini sandi simetris meski memakai perkakas teori bilangan — ia ' +
      'mendahului RSA dan jelas memengaruhinya. Keamanannya bersandar pada masalah logaritma ' +
      'diskret, bukan pada pemfaktoran.',
  },
  elgamal: {
    summary: 'Penyandian kunci publik yang keamanannya bersandar pada masalah logaritma diskret.',
    theory:
      'Taher ElGamal membangun skema penyandian di atas persetujuan kunci Diffie-Hellman. Kunci ' +
      'pribadinya adalah x dan kunci publiknya y = gˣ mod p. Untuk menyandikan, pilih sebuah k ' +
      'sesaat dan kirim pasangan (gᵏ, m·yᵏ). Penerimanya memulihkan m dengan membagi dengan (gᵏ)ˣ, ' +
      'yang hanya dapat dihitung olehnya. Cipherteksnya dua kali ukuran teks aslinya, dan memakai ' +
      'ulang k antar pesan berakibat fatal — kesalahan sekelas itulah yang membuka kunci ' +
      'penandatanganan PlayStation 3 milik Sony. DSA adalah keturunan langsung konstruksi ini. Di ' +
      'sini k diturunkan dari posisi karakternya supaya contohnya terulang persis; penerapan ' +
      'sungguhan harus mengambilnya baru dan acak setiap kali.',
  },
  'diffie-hellman': {
    summary: 'Dua pihak menurunkan rahasia bersama lewat saluran terbuka, lalu memakainya sebagai arus kunci.',
    theory:
      'Diffie dan Hellman menunjukkan bahwa dua orang dapat menyepakati sebuah rahasia sementara ' +
      'penyadap menyaksikan setiap pesannya. Kedua pihak menerbitkan gᵃ dan gᵇ modulo sebuah prima; ' +
      'masing-masing memangkatkan nilai pihak lain dengan eksponennya sendiri dan tiba di g^(ab), ' +
      'yang tidak dapat dihitung pengamatnya tanpa memecahkan logaritma diskret. Inilah makalah ' +
      'yang memungkinkan kriptografi kunci publik. Persetujuan kunci saja tidak menyandikan apa ' +
      'pun, jadi di sini nilai bersamanya menyalakan arus kunci penjumlahan — separuh yang kedua ' +
      'itu alat pengajaran, bukan bagian dari protokolnya. Diffie-Hellman polos juga tidak ' +
      'terotentikasi, yang membiarkannya terbuka bagi penyerang aktif yang duduk di tengah; ' +
      'penerapan sungguhan menandatangani pertukarannya.',
  },

  // ------------------------------------------------------------- selebihnya dan steganografi
  'dancing-men': {
    summary: 'Tiap huruf digambar sebagai satu figur tongkat kecil dengan pose yang khas.',
    theory:
      'Conan Doyle menciptakannya untuk "The Adventure of the Dancing Men", tempat Holmes ' +
      'memecahkannya dengan mencatat bahwa figur yang paling sering muncul pastilah E lalu bekerja ' +
      'keluar dari sana — peragaan analisis frekuensi yang rapi meski fiktif. Figur yang memegang ' +
      'bendera menandai akhir sebuah kata. Secara struktur ia substitusi satu abjad biasa; ' +
      'penyamaran bergambar itu tidak menambahkan apa pun selain kebaruan. Bentuk huruf yang khas ' +
      'menggantikan gambarnya di sini supaya pemetaannya selamat sebagai teks.',
  },
  'turning-grille': {
    summary: 'Kartu berlubang ditumpangkan pada kisi, diisi, lalu diputar seperempat dan diisi lagi.',
    theory:
      'Lubangi sebuah kartu persegi sedemikian rupa sehingga empat kali putaran seperempat ' +
      'menyingkapkan setiap sel tepat sekali. Tulis lewat lubangnya, putar kartunya, tulis lagi, ' +
      'dan setelah empat putaran kisinya penuh; lalu bacalah seperti biasa. Fleissner merancang ' +
      'versi yang diambil angkatan darat Jerman pada 1916 dengan nama sandi ANNA — ia bertahan ' +
      'sekitar empat bulan sebelum kriptanalis Prancis memecahkannya. Kartu berlubang itu sendiri ' +
      'adalah kuncinya, dan ia berwujud benda, yang sekaligus menjadi daya tarik praktis dan ' +
      'kelemahan operasionalnya.',
  },
  'nihilist-transposition': {
    summary: 'Kisi persegi yang baris dan kolomnya sama-sama dipermutasi oleh kata kunci yang sama.',
    theory:
      'Tulis pesannya ke dalam sebuah persegi, lalu susun ulang barisnya memakai peringkat kata ' +
      'kuncinya dan susun ulang kolomnya memakai peringkat yang sama. Mempermutasi ke dua arah ' +
      'memindahkan setiap huruf dua kali dan menghancurkan ketetanggaan baris maupun kolom yang ' +
      'dibiarkan utuh oleh transposisi kolom tunggal. Kisinya harus persegi, jadi panjang kata ' +
      'kuncinya menetapkan ukuran bloknya.',
  },
  base45: {
    summary: 'Dua byte menjadi tiga karakter, memakai abjad yang dapat disimpan kode QR secara efisien.',
    theory:
      'Kode QR punya mode alfanumerik yang mencakup tepat 45 karakter, dan mode itu mengemasnya ' +
      'jauh lebih padat daripada mode byte. Base45 ada untuk memanfaatkan hal itu. Ia terpasang ' +
      'luas nyaris dalam semalam sebagai penyandian di dalam sertifikat COVID digital Uni Eropa. ' +
      'Dua byte memberi nilai di bawah 65536, yang muat dalam tiga digit basis 45 sebab 45³ ' +
      'melampauinya.',
  },
  uuencode: {
    summary: 'Tiga byte menjadi empat karakter, digeser ke dalam rentang ASCII tercetak.',
    theory:
      'Dibangun untuk uucp, jaringan simpan-dan-teruskan yang membawa surat Unix dan Usenet sebelum ' +
      'internet menjadi umum. Enam bit diambil sekaligus dan ditambah 32, mendarat di rentang ' +
      'tercetak yang mulai pada karakter spasi — yang menimbulkan kesulitan tak berkesudahan ketika ' +
      'sistem surat memangkas spasi di ujung, sehingga tanda petik miring dipakai sebagai ' +
      'gantinya. Tiap barisnya diawali sebuah karakter yang menyatakan cacah byte-nya. Base64 ' +
      'menggantikannya dengan alasan yang baik, tetapi ia masih pantas dikenali di dalam arsip lama.',
  },
  xtea: {
    summary: 'TEA yang diperbaiki dengan jadwal kunci lebih baik dan fungsi putaran yang ditata ulang.',
    theory:
      'Needham dan Wheeler menerbitkan XTEA untuk memperbaiki cacat kunci setara pada TEA. Fungsi ' +
      'putarannya menggeser dan meng-XOR sebelum menjumlah, dan kata kunci yang dipakai di tiap ' +
      'putaran dipilih dari bagian yang berbeda dari jumlah berjalannya, yang menghapus ' +
      'kesetangkupan yang membuat kunci TEA saling tertukarkan. Ia tetap mungil — masih beberapa ' +
      'lusin baris — dan karena itu ia terus muncul pada firmware tertanam yang tidak muat memuat ' +
      'penerapan AES lengkap.',
  },
  'vernam-binary': {
    summary: 'Byte pesan di-XOR terhadap pad acak dengan panjang yang sama.',
    theory:
      'Gilbert Vernam mematenkan peng-XOR-an pita teleprinter berisi pesan terhadap pita berisi ' +
      'kunci acak, satu bit untuk satu bit. Joseph Mauborgne kemudian mengamati bahwa bila pita ' +
      'kuncinya benar-benar acak, tidak pernah dipakai ulang dan sepanjang pesannya, sistem itu tak ' +
      'terpecahkan — wawasan yang kelak dibuktikan Shannon secara formal. Inilah one-time pad dalam ' +
      'biner, bukan modulo 26. Setiap kegagalan praktis skema ini datang dari pelanggaran salah ' +
      'satu dari ketiga syarat itu, tidak pernah dari matematikanya.',
  },
  'whitespace-stego': {
    summary: 'Bit disembunyikan sebagai spasi dan tab, yang tampil sebagai kekosongan.',
    theory:
      'Steganografi menyembunyikan keberadaan sebuah pesan, bukan isinya — pesan tersandi ' +
      'mengumumkan bahwa ada sesuatu yang disembunyikan, sementara pesan yang tersembunyi tidak. ' +
      'Menyandikan tiap bit sebagai spasi atau tab menghasilkan teks yang tampak kosong. Ia selamat ' +
      'dari salin-tempel dan nyaris tidak dari apa pun yang lain: editor mana pun yang memangkas ' +
      'spasi di ujung baris memusnahkan muatannya tanpa suara.',
  },
  'zero-width-stego': {
    summary: 'Bit disembunyikan di dalam karakter Unicode yang sama sekali tidak memakan ruang.',
    theory:
      'Zero-width space dan zero-width non-joiner ada untuk alasan penataan huruf yang sah pada ' +
      'aksara yang memerlukan penanda batas tak terlihat. Karena keduanya tampil sebagai ' +
      'kekosongan namun bertahan sebagai karakter sungguhan, keduanya dapat membawa muatan lewat ' +
      'saluran apa pun yang meneruskan Unicode secara utuh — obrolan, dokumen, halaman web. Teknik ' +
      'ini pernah dipakai untuk menandai dokumen dan mengenali penerima sebuah kebocoran, sebab ' +
      'tiap salinan dapat membawa tanda tak terlihat yang berbeda.',
  },
  'null-cipher': {
    summary: 'Pesannya dieja oleh huruf pertama tiap kata di dalam teks yang tampak tak berbahaya.',
    theory:
      'Teks penyamarnya membawa pesan itu pada huruf-huruf awalnya sambil terbaca sebagai surat ' +
      'biasa. Sensor masa perang mengawasi tepat hal ini dan akan menulis ulang surat — mengganti ' +
      'kata dengan sinonim — khusus untuk menghancurkan pola tersembunyi apa pun tanpa harus ' +
      'membuktikan ada polanya. Kelemahannya, penyamarnya harus terdengar wajar, dan memaksakan ' +
      'huruf awal tertentu membuat hal itu sulit.',
  },
  'case-stego': {
    summary: 'Kode lima bit Bacon yang dibawa oleh besar-kecilnya huruf pada teks penyamar biasa.',
    theory:
      'Inilah yang sebenarnya dimaksud Bacon. Kode lima simbol per huruf itu tidak dituliskan; ia ' +
      'dibawa oleh suatu sifat biner pada teks penyamarnya — dua jenis huruf cetak dalam contoh ' +
      'cetakannya, huruf besar dan huruf kecil di sini. Pembacanya melihat prosa biasa dan tidak ' +
      'punya alasan menduga ada apa-apa di dalamnya. Lima huruf penyamar terpakai untuk tiap huruf ' +
      'tersembunyi, jadi penyamarnya harus lima kali muatannya.',
  },
});

/**
 * The summary and theory a reader should see, in their language.
 *
 * Read this rather than a technique's own fields anywhere prose reaches a page.
 * The generator applied the overlay inline and every other surface forgot to,
 * which is exactly the kind of gap a single function closes for good.
 */
export function prose(
  t: { id: string; summary: string; theory: string },
  locale: 'en' | 'id',
): TechniqueProse {
  const over = locale === 'id' ? TECHNIQUE_ID[t.id] : undefined;
  return { summary: over?.summary ?? t.summary, theory: over?.theory ?? t.theory };
}
