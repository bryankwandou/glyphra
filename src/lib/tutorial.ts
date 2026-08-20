import type { Locale } from './i18n/dict';

/**
 * Tutorial content, in both languages.
 *
 * Every ciphertext below was produced by this project's own engine and
 * confirmed to decode back to the plaintext before it was written down. A page
 * that teaches people how a cipher behaves cannot contain an example somebody
 * typed from memory — the deck already made that mistake once with a Vigenère
 * output, and it was wrong.
 *
 * Plaintext throughout: MEET ME AT DAWN
 */

export interface L {
  en: string;
  id: string;
}

export const pick = (l: L, locale: Locale) => l[locale];

export const PLAINTEXT = 'MEET ME AT DAWN';

export interface Section {
  id: string;
  title: L;
  body: L[];
}

export interface Kind {
  key: string;
  name: L;
  reversible: L;
  needsKey: L;
  useFor: L;
  trap: L;
}

export interface FamilyGuide {
  id: string;
  name: L;
  count: number;
  difficulty: string;
  /** What actually defines the family, in one line. */
  defines: L;
  /** How a student recognises it when they see the ciphertext. */
  recognise: L;
  example: {
    technique: string;
    key: string;
    output: string;
  };
  /**
   * The same example, wired to the live engine so it can be changed.
   *
   * Absent where a live control would teach nothing — RSA needs its whole
   * parameter set to make sense, and steganography's whole point is that the
   * output looks like ordinary prose.
   */
  demo?: {
    techniqueId: string;
    key: Record<string, string>;
  };
  /** How to attack it — a cipher taught without its break is half taught. */
  breaks: L;
  /** Why a teacher would set this one. */
  teachWhen: L;
}

/* ------------------------------------------------------------------ opening */

export const INTRO: Section = {
  id: 'start-here',
  title: {
    en: 'Start here',
    id: 'Mulai dari sini',
  },
  body: [
    {
      en: 'This page explains what separates one method from another, so you can choose sensibly rather than picking a name off a list. It assumes nothing beyond being able to count letters.',
      id: 'Halaman ini menjelaskan apa yang membedakan satu metode dari metode lain, supaya Anda bisa memilih dengan sadar dan bukan asal menunjuk nama di daftar. Tidak ada prasyarat selain bisa menghitung huruf.',
    },
    {
      en: 'Work through it in order the first time. Each family builds on a weakness in the one before it, and that sequence is the actual history of the subject — every method here exists because the previous one was broken.',
      id: 'Untuk pertama kali, bacalah berurutan. Tiap keluarga dibangun di atas kelemahan keluarga sebelumnya, dan urutan itu adalah sejarah bidang ini — tiap metode di sini ada justru karena metode sebelumnya berhasil dipecahkan.',
    },
  ],
};

/* -------------------------------------------------- the distinction that matters */

export const KINDS_TITLE: L = {
  en: 'Three things that get confused',
  id: 'Tiga hal yang sering tertukar',
};

export const KINDS_LEAD: L = {
  en: 'Almost every beginner mistake in this subject starts here. These three are not variations of one idea; they answer different questions, and treating one as another is how people ship something they believe is protected when it is not.',
  id: 'Hampir semua kekeliruan pemula di bidang ini berawal di sini. Ketiganya bukan variasi dari satu gagasan; ketiganya menjawab pertanyaan yang berbeda, dan menganggap yang satu sebagai yang lain adalah cara orang merilis sesuatu yang mereka kira terlindungi padahal tidak.',
};

export const KINDS: Kind[] = [
  {
    key: 'cipher',
    name: { en: 'A cipher', id: 'Sandi (cipher)' },
    reversible: { en: 'Yes, with the key', id: 'Ya, kalau punya kuncinya' },
    needsKey: { en: 'Yes', id: 'Ya' },
    useFor: {
      en: 'Keeping a message from someone who intercepts it. The security lives entirely in the key, never in the method being secret.',
      id: 'Menjaga pesan dari orang yang menyadapnya. Keamanannya sepenuhnya terletak pada kunci, tidak pernah pada dirahasiakannya metode.',
    },
    trap: {
      en: 'A cipher whose method must stay secret is not a cipher, it is a delaying tactic. Kerckhoffs said so in 1883 and it has not stopped being true.',
      id: 'Sandi yang metodenya harus dirahasiakan bukanlah sandi, melainkan taktik mengulur waktu. Kerckhoffs menyatakan itu pada 1883 dan sampai sekarang tetap benar.',
    },
  },
  {
    key: 'encoding',
    name: { en: 'An encoding', id: 'Pengkodean (encoding)' },
    reversible: { en: 'Yes, by anyone', id: 'Ya, oleh siapa saja' },
    needsKey: { en: 'No', id: 'Tidak' },
    useFor: {
      en: 'Moving data through a channel that cannot carry it as-is — Base64 exists because email could not carry raw bytes, not because anyone wanted to hide them.',
      id: 'Memindahkan data lewat kanal yang tidak sanggup membawanya apa adanya — Base64 ada karena surel dulu tidak bisa membawa byte mentah, bukan karena ada yang ingin menyembunyikannya.',
    },
    trap: {
      en: 'Base64 is not encryption. This project catalogues encodings on purpose, because a student who has never been told the difference will one day base64 a password and believe they have done something.',
      id: 'Base64 bukan enkripsi. Proyek ini sengaja mengatalogkan pengkodean, karena mahasiswa yang tidak pernah diberi tahu bedanya suatu hari akan mem-base64 sebuah kata sandi dan mengira dirinya sudah mengamankan sesuatu.',
    },
  },
  {
    key: 'hash',
    name: { en: 'A hash', id: 'Hash' },
    reversible: { en: 'No, not ever', id: 'Tidak, tidak pernah bisa' },
    needsKey: { en: 'No', id: 'Tidak' },
    useFor: {
      en: 'Answering "has this changed?" and "is this the same file?". It produces a fixed-length fingerprint that changes completely if one character moves.',
      id: 'Menjawab "apakah ini berubah?" dan "apakah ini berkas yang sama?". Ia menghasilkan sidik jari berpanjang tetap yang berubah total kalau satu karakter saja bergeser.',
    },
    trap: {
      en: 'There is no "decrypting" a hash. When a site emails you your old password, it was never hashed. Seven hashes are in the catalogue and none of them will ever appear as a puzzle to reverse, because they cannot be.',
      id: 'Tidak ada istilah "mendekripsi" hash. Kalau sebuah situs mengirimkan kata sandi lama Anda lewat surel, kata sandi itu tidak pernah di-hash. Ada tujuh hash di katalog dan tak satu pun akan muncul sebagai soal untuk dibalik, karena memang mustahil.',
    },
  },
];

export const KINDS_NOTE: L = {
  en: 'This distinction is not academic here. Two catalogue entries — ROT5 and quoted-printable — were quietly handing students the answer verbatim, because both leave ordinary letters completely untouched. A check caught it; nobody reading the output would have. They remain in the catalogue as things to recognise, and can no longer be set as problems.',
  id: 'Pembedaan ini bukan sekadar teori di sini. Dua entri katalog — ROT5 dan quoted-printable — diam-diam menyerahkan jawaban apa adanya kepada mahasiswa, karena keduanya sama sekali tidak menyentuh huruf biasa. Sebuah pemeriksaan menangkapnya; tidak akan ada yang sadar hanya dengan membaca keluarannya. Keduanya tetap ada di katalog sebagai hal yang perlu dikenali, dan tidak bisa lagi dijadikan soal.',
};

/* ------------------------------------------------------------------ families */

export const FAMILIES_TITLE: L = {
  en: 'The families, and what actually separates them',
  id: 'Keluarga sandi, dan apa yang sebenarnya membedakannya',
};

export const FAMILIES_LEAD: L = {
  en: 'Every example below was produced by this project’s engine from the same message, MEET ME AT DAWN, and confirmed to decode back to it. Compare the outputs: the shape of the ciphertext tells you more about the family than the name does.',
  id: 'Tiap contoh di bawah dihasilkan oleh mesin proyek ini dari pesan yang sama, MEET ME AT DAWN, dan sudah dipastikan bisa dibaca kembali menjadi pesan itu. Bandingkan keluarannya: bentuk cipherteks memberi tahu lebih banyak tentang keluarganya dibanding namanya.',
};

export const FAMILIES: FamilyGuide[] = [
  {
    id: 'substitution',
    name: { en: 'Monoalphabetic substitution', id: 'Substitusi monoalfabetik' },
    count: 17,
    difficulty: '1–2',
    defines: {
      en: 'Each letter is replaced by one other letter, and that replacement never changes for the whole message.',
      id: 'Tiap huruf diganti oleh satu huruf lain, dan penggantian itu tidak pernah berubah sepanjang pesan.',
    },
    recognise: {
      en: 'Letter frequencies survive. If E is the most common letter in the plaintext, whatever replaced E is the most common letter in the ciphertext. Repeated words stay repeated.',
      id: 'Frekuensi huruf tetap bertahan. Kalau E adalah huruf tersering di plainteks, huruf pengganti E menjadi huruf tersering di cipherteks. Kata yang berulang tetap terlihat berulang.',
    },
    example: { technique: 'Caesar, shift 3', key: 'shift = 3', output: 'PHHWP HDWGD ZQ' },
    demo: { techniqueId: 'caesar', key: { shift: '3' } },
    breaks: {
      en: 'Frequency analysis, known since the ninth century. A Caesar has only 25 possible keys, so you can simply try all of them by hand in a few minutes.',
      id: 'Analisis frekuensi, sudah dikenal sejak abad kesembilan. Caesar hanya punya 25 kemungkinan kunci, jadi Anda bisa mencoba semuanya dengan tangan dalam beberapa menit.',
    },
    teachWhen: {
      en: 'Week one. This is where a student first sees that a cipher can be broken without the key, which is the single most important idea in the subject.',
      id: 'Pekan pertama. Di sinilah mahasiswa pertama kali melihat bahwa sandi bisa dipecahkan tanpa kunci — gagasan terpenting di bidang ini.',
    },
  },
  {
    id: 'polyalphabetic',
    name: { en: 'Polyalphabetic substitution', id: 'Substitusi polialfabetik' },
    count: 15,
    difficulty: '2–4',
    defines: {
      en: 'The substitution changes as you move along the message, usually cycling through several alphabets driven by a keyword.',
      id: 'Substitusinya berubah seiring Anda bergerak di sepanjang pesan, biasanya berputar melalui beberapa alfabet yang digerakkan sebuah kata kunci.',
    },
    recognise: {
      en: 'Frequencies flatten out — no letter dominates. The same plaintext letter becomes different ciphertext letters in different positions, so the trick that broke the previous family stops working.',
      id: 'Frekuensinya merata — tidak ada huruf yang mendominasi. Huruf plainteks yang sama menjadi huruf cipherteks berbeda di posisi berbeda, sehingga trik yang mematahkan keluarga sebelumnya tidak lagi mempan.',
    },
    example: { technique: 'Vigenère', key: 'keyword = LEMON', output: 'XIQHZ PEFRN HR' },
    demo: { techniqueId: 'vigenere', key: { keyword: 'LEMON' } },
    breaks: {
      en: 'Find the key length first — repeated ciphertext fragments sit a multiple of the key length apart (Kasiski, 1863). Once you know the length, you have several Caesars side by side and you are back to frequency analysis.',
      id: 'Cari panjang kuncinya lebih dulu — potongan cipherteks yang berulang terpisah sejauh kelipatan panjang kunci (Kasiski, 1863). Begitu panjangnya diketahui, yang tersisa hanyalah beberapa Caesar berdampingan, dan Anda kembali ke analisis frekuensi.',
    },
    teachWhen: {
      en: 'Right after the first family is broken, so the fix and the reason for it land together. Vigenère was called unbreakable for three centuries; that history is worth the ten minutes.',
      id: 'Tepat setelah keluarga pertama dipatahkan, supaya solusi dan alasannya sampai bersamaan. Vigenère disebut tak terpecahkan selama tiga abad; sejarah itu layak diberi sepuluh menit.',
    },
  },
  {
    id: 'polygraphic',
    name: { en: 'Polygraphic substitution', id: 'Substitusi poligrafik' },
    count: 5,
    difficulty: '3–4',
    defines: {
      en: 'Letters are enciphered in groups rather than one at a time — pairs for Playfair, blocks of two or three for Hill.',
      id: 'Huruf disandikan dalam kelompok, bukan satu per satu — berpasangan untuk Playfair, blok dua atau tiga huruf untuk Hill.',
    },
    recognise: {
      en: 'Output length is even, and single-letter frequency analysis gives nothing useful because the unit is no longer a letter. Playfair never produces a doubled pair.',
      id: 'Panjang keluarannya genap, dan analisis frekuensi huruf tunggal tidak memberi apa-apa karena satuannya bukan lagi huruf. Playfair tidak pernah menghasilkan pasangan huruf kembar.',
    },
    example: { technique: 'Playfair', key: 'keyword = MONARCHY', output: 'CLKLC LRSBR NY' },
    demo: { techniqueId: 'playfair', key: { keyword: 'MONARCHY' } },
    breaks: {
      en: 'Frequency analysis on pairs instead of letters, which needs far more ciphertext. Hill falls quickly to a known-plaintext attack: enough matched pairs and the key matrix comes out of simple linear algebra.',
      id: 'Analisis frekuensi pada pasangan huruf, bukan huruf tunggal, yang menuntut cipherteks jauh lebih banyak. Hill cepat jatuh oleh serangan known-plaintext: dengan cukup pasangan yang diketahui, matriks kuncinya keluar lewat aljabar linear biasa.',
    },
    teachWhen: {
      en: 'When you want to show that changing the unit of encryption defeats a whole class of attack. Hill is also the natural place to connect the subject to linear algebra.',
      id: 'Saat Anda ingin menunjukkan bahwa mengubah satuan enkripsi mematahkan satu kelas serangan sekaligus. Hill juga tempat paling wajar untuk menyambungkan materi ini dengan aljabar linear.',
    },
  },
  {
    id: 'transposition',
    name: { en: 'Transposition', id: 'Transposisi' },
    count: 13,
    difficulty: '2–4',
    defines: {
      en: 'The letters are not changed at all. They are reordered. Every letter of the original is still there, standing somewhere else.',
      id: 'Hurufnya sama sekali tidak diubah, hanya diacak urutannya. Tiap huruf aslinya masih ada, hanya berdiri di tempat lain.',
    },
    recognise: {
      en: 'The dead giveaway: letter frequencies match ordinary text exactly, yet nothing reads. If the ciphertext has the letter distribution of English but is unreadable, the letters were moved, not replaced.',
      id: 'Petunjuk paling jelas: frekuensi hurufnya persis seperti teks biasa, tetapi tidak ada yang terbaca. Kalau distribusi hurufnya wajar tapi tak terbaca, hurufnya dipindahkan, bukan diganti.',
    },
    example: { technique: 'Rail fence', key: 'rails = 3', output: 'MMDET ETANE AW' },
    demo: { techniqueId: 'rail-fence', key: { rails: '3' } },
    breaks: {
      en: 'Anagramming, and the key space is often tiny — a rail fence with a message this short has only a handful of plausible rail counts to try.',
      id: 'Penyusunan ulang huruf, dan ruang kuncinya sering sangat kecil — rail fence dengan pesan sependek ini hanya punya segelintir kemungkinan jumlah rel untuk dicoba.',
    },
    teachWhen: {
      en: 'Alongside substitution, as the deliberate contrast. Students who have only met substitution reach for frequency analysis, get a perfectly normal distribution, and have to work out why it told them nothing.',
      id: 'Berdampingan dengan substitusi, sebagai kontras yang disengaja. Mahasiswa yang baru mengenal substitusi akan langsung memakai analisis frekuensi, mendapat distribusi yang wajar-wajar saja, lalu harus memikirkan sendiri kenapa itu tidak memberi tahu apa pun.',
    },
  },
  {
    id: 'fractionation',
    name: { en: 'Fractionation', id: 'Fraksinasi' },
    count: 6,
    difficulty: '4–5',
    defines: {
      en: 'Each letter is first split into coordinates, those coordinates are then mixed across the whole message, and only afterwards reassembled into letters.',
      id: 'Tiap huruf mula-mula dipecah menjadi koordinat, koordinat itu lalu diaduk ke seluruh pesan, dan baru sesudahnya disusun kembali menjadi huruf.',
    },
    recognise: {
      en: 'Both substitution and transposition are present at once. A single plaintext letter now influences two separate output letters, so neither classical attack works on its own.',
      id: 'Substitusi dan transposisi hadir sekaligus. Satu huruf plainteks kini memengaruhi dua huruf keluaran yang terpisah, sehingga tidak ada satu pun serangan klasik yang mempan sendirian.',
    },
    example: { technique: 'Bifid', key: 'keyword = CIPHER, period = 5', output: 'GHMZT IQFDQ XF' },
    demo: { techniqueId: 'bifid', key: { keyword: 'CIPHER', period: '5' } },
    breaks: {
      en: 'The period has to be recovered first, then the square. ADFGVX was read by French cryptanalysts during the First World War, but it took a team and a great deal of traffic.',
      id: 'Periodenya harus ditemukan lebih dulu, baru kotaknya. ADFGVX berhasil dibaca kriptanalis Prancis pada Perang Dunia Pertama, tetapi itu menuntut satu tim dan lalu lintas pesan yang sangat banyak.',
    },
    teachWhen: {
      en: 'As the peak of hand cryptography, and the point where combining two weak ideas produces something genuinely hard. Set it late, and give it more than one session.',
      id: 'Sebagai puncak kriptografi manual, sekaligus titik di mana menggabungkan dua gagasan lemah menghasilkan sesuatu yang benar-benar sulit. Berikan di akhir, dan jangan cukupkan satu pertemuan.',
    },
  },
  {
    id: 'encoding',
    name: { en: 'Encoding and representation', id: 'Pengkodean dan representasi' },
    count: 21,
    difficulty: '1–2',
    defines: {
      en: 'A change of alphabet with no key at all. Anyone can reverse it, and it was never meant to stop them.',
      id: 'Pergantian alfabet tanpa kunci sama sekali. Siapa pun bisa membalikkannya, dan memang tidak pernah dimaksudkan untuk mencegah siapa pun.',
    },
    recognise: {
      en: 'A restricted character set with obvious structure — Base64 ends in a run of equals signs, hexadecimal uses only sixteen symbols, Morse is dots and dashes.',
      id: 'Himpunan karakter terbatas dengan struktur yang kentara — Base64 berakhir dengan deretan tanda sama dengan, heksadesimal hanya memakai enam belas simbol, Morse berupa titik dan garis.',
    },
    example: { technique: 'Base64', key: 'no key', output: 'TUVFVCBNRSBBVCBEQVdO' },
    demo: { techniqueId: 'base64', key: {} },
    breaks: {
      en: 'There is nothing to break. Recognise the alphabet and reverse it. The exercise is identification, not cryptanalysis.',
      id: 'Tidak ada yang perlu dipecahkan. Kenali alfabetnya lalu balikkan. Latihannya adalah identifikasi, bukan kriptanalisis.',
    },
    teachWhen: {
      en: 'Early, and explicitly framed as "this is not encryption". The purpose is to inoculate students against a mistake they will otherwise make in production code.',
      id: 'Di awal, dan tegaskan sebagai "ini bukan enkripsi". Tujuannya mengimunisasi mahasiswa dari kesalahan yang kalau tidak, akan mereka lakukan di kode produksi.',
    },
  },
  {
    id: 'modern-symmetric',
    name: { en: 'Modern symmetric', id: 'Simetrik modern' },
    count: 9,
    difficulty: '3–5',
    defines: {
      en: 'Operates on bytes rather than letters, with the same key used to encrypt and decrypt. AES and ChaCha20 are what actually protects traffic today.',
      id: 'Bekerja pada byte, bukan huruf, dengan kunci yang sama untuk mengenkripsi dan mendekripsi. AES dan ChaCha20 adalah yang benar-benar melindungi lalu lintas data hari ini.',
    },
    recognise: {
      en: 'Output is bytes, usually shown as hexadecimal, and looks statistically random. There is no letter structure left to analyse.',
      id: 'Keluarannya berupa byte, biasanya ditampilkan sebagai heksadesimal, dan tampak acak secara statistik. Tidak ada struktur huruf yang tersisa untuk dianalisis.',
    },
    example: { technique: 'Repeating-key XOR', key: 'key = KEY', output: '06001c1f65140e65181f651d0a1217' },
    demo: { techniqueId: 'xor-repeating', key: { key: 'KEY' } },
    breaks: {
      en: 'AES and ChaCha20 are not broken by hand and are not meant to be. Repeating-key XOR is in the catalogue precisely because it looks modern and falls to the same key-length trick as Vigenère.',
      id: 'AES dan ChaCha20 tidak dipecahkan dengan tangan dan memang tidak ditujukan untuk itu. XOR berkunci berulang ada di katalog justru karena ia tampak modern padahal jatuh oleh trik panjang-kunci yang sama seperti Vigenère.',
    },
    teachWhen: {
      en: 'Once the classical attacks are understood, so students can see what the modern designs were built to prevent. Set XOR as a problem; set AES as reading.',
      id: 'Setelah serangan klasik dipahami, supaya mahasiswa bisa melihat apa yang hendak dicegah oleh rancangan modern. Jadikan XOR sebagai soal; jadikan AES sebagai bacaan.',
    },
  },
  {
    id: 'asymmetric',
    name: { en: 'Asymmetric and number theory', id: 'Asimetrik dan teori bilangan' },
    count: 4,
    difficulty: '4–5',
    defines: {
      en: 'Two different keys: one published freely, one kept. Anyone can encrypt to you; only you can read it. This is what made secure communication between strangers possible.',
      id: 'Dua kunci berbeda: satu disebarkan bebas, satu disimpan. Siapa pun bisa mengenkripsi untuk Anda; hanya Anda yang bisa membacanya. Inilah yang membuat komunikasi aman antara dua orang asing menjadi mungkin.',
    },
    recognise: {
      en: 'The ciphertext is numbers, not letters, and the public parameters are stated openly in the problem — that openness is the point, not an oversight.',
      id: 'Cipherteksnya berupa angka, bukan huruf, dan parameter publiknya dinyatakan terbuka di soal — keterbukaan itu justru intinya, bukan kelalaian.',
    },
    example: { technique: 'RSA (textbook)', key: 'p, q and e are given', output: 'a sequence of integers below n' },
    breaks: {
      en: 'Real RSA rests on factoring being hard. The textbook version here uses tiny primes so you can factor n by hand in a minute — which is exactly the demonstration, and exactly what you must never deploy.',
      id: 'RSA sungguhan bertumpu pada sulitnya pemfaktoran. Versi buku teks di sini memakai bilangan prima kecil supaya Anda bisa memfaktorkan n dengan tangan dalam semenit — itulah demonstrasinya, sekaligus persis yang tidak boleh Anda pakai di produksi.',
    },
    teachWhen: {
      en: 'When students have the modular arithmetic to follow it. Doing one RSA encryption and decryption by hand teaches more than a term of describing it.',
      id: 'Saat mahasiswa sudah punya bekal aritmetika modular untuk mengikutinya. Mengerjakan satu enkripsi dan dekripsi RSA dengan tangan mengajarkan lebih banyak daripada satu semester menjelaskannya.',
    },
  },
  {
    id: 'hashing',
    name: { en: 'Hashing and integrity', id: 'Hashing dan integritas' },
    count: 7,
    difficulty: '2–3',
    defines: {
      en: 'A one-way fingerprint of fixed length. It answers whether something changed. It does not hide anything and cannot be undone.',
      id: 'Sidik jari satu arah dengan panjang tetap. Ia menjawab apakah sesuatu berubah. Ia tidak menyembunyikan apa pun dan tidak bisa dibalik.',
    },
    recognise: {
      en: 'Always the same length no matter how long the input was. SHA-256 is 64 hexadecimal characters whether you hashed one word or an entire book.',
      id: 'Panjangnya selalu sama berapa pun panjang masukannya. SHA-256 selalu 64 karakter heksadesimal, baik Anda mem-hash satu kata maupun satu buku penuh.',
    },
    example: { technique: 'SHA-256', key: 'no key', output: 'aabed343de86a8ba6b2adbc4d7dfebbc…' },
    demo: { techniqueId: 'sha256', key: {} },
    breaks: {
      en: 'Not reversed — collided. MD5 and SHA-1 are broken in the sense that two different inputs can be made to share a hash, which destroys their use as a signature.',
      id: 'Bukan dibalik — melainkan ditabrakkan. MD5 dan SHA-1 disebut patah dalam arti dua masukan berbeda bisa dibuat berbagi hash yang sama, dan itu menghancurkan kegunaannya sebagai tanda tangan.',
    },
    teachWhen: {
      en: 'Whenever passwords, signatures or file integrity come up. Show the avalanche effect live: change one letter and watch the entire output change.',
      id: 'Kapan pun topik kata sandi, tanda tangan, atau integritas berkas muncul. Tunjukkan efek avalanche secara langsung: ubah satu huruf lalu perhatikan seluruh keluarannya berubah.',
    },
  },
  {
    id: 'steganography',
    name: { en: 'Steganography', id: 'Steganografi' },
    count: 4,
    difficulty: '2–4',
    defines: {
      en: 'Hiding that a message exists at all, rather than hiding what it says. The carrier is meant to look entirely ordinary.',
      id: 'Menyembunyikan keberadaan pesannya, bukan isinya. Pembawanya memang dibuat agar tampak sepenuhnya biasa.',
    },
    recognise: {
      en: 'By definition you are not supposed to. Look for what does not belong: trailing whitespace, odd capitalisation, zero-width characters that render as nothing.',
      id: 'Menurut definisinya, Anda memang tidak seharusnya bisa. Carilah yang tidak pada tempatnya: spasi di ujung baris, kapitalisasi ganjil, karakter berlebar nol yang tidak tampak sama sekali.',
    },
    example: { technique: 'Whitespace', key: 'no key', output: 'a cover paragraph carrying trailing spaces and tabs' },
    breaks: {
      en: 'Once suspected, usually trivially. Its weakness is that it offers no protection at all the moment anyone thinks to look — which is why it is layered with a cipher in practice.',
      id: 'Begitu dicurigai, biasanya mudah sekali. Kelemahannya: ia sama sekali tidak memberi perlindungan begitu ada yang terpikir untuk memeriksanya — karena itu dalam praktik ia dilapis dengan sandi.',
    },
    teachWhen: {
      en: 'As a contrast to everything else on this page, and as the place to make the point that hiding and protecting are different goals.',
      id: 'Sebagai kontras terhadap semua yang lain di halaman ini, dan sebagai tempat menegaskan bahwa menyembunyikan dan melindungi adalah dua tujuan yang berbeda.',
    },
  },
];

/* -------------------------------------------------------------- how to teach */

export const PATH_TITLE: L = {
  en: 'A teaching order that works',
  id: 'Urutan mengajar yang terbukti jalan',
};

export const PATH_LEAD: L = {
  en: 'If you are setting this for a class and want a sequence rather than a menu, this one follows the history and keeps each step motivated by the failure of the one before.',
  id: 'Kalau Anda menyiapkan ini untuk satu kelas dan ingin urutan, bukan sekadar daftar pilihan, urutan berikut mengikuti sejarahnya dan menjaga tiap langkah tetap punya alasan dari kegagalan langkah sebelumnya.',
};

export interface PathStep {
  week: L;
  what: L;
  why: L;
  difficulty: string;
}

export const PATH: PathStep[] = [
  {
    week: { en: 'First', id: 'Pertama' },
    what: { en: 'Caesar, Atbash, A1Z26', id: 'Caesar, Atbash, A1Z26' },
    why: {
      en: 'Small key spaces that can be brute-forced by hand. The goal is confidence and the first sight of a cipher failing.',
      id: 'Ruang kunci kecil yang bisa ditembus dengan tangan. Tujuannya membangun percaya diri dan memperlihatkan sandi yang gagal untuk pertama kalinya.',
    },
    difficulty: '1',
  },
  {
    week: { en: 'Second', id: 'Kedua' },
    what: { en: 'Base64, Morse, hexadecimal', id: 'Base64, Morse, heksadesimal' },
    why: {
      en: 'Deliberately placed here so "this is not encryption" arrives before anyone forms the opposite habit.',
      id: 'Sengaja ditaruh di sini supaya pesan "ini bukan enkripsi" sampai sebelum siapa pun terlanjur membentuk kebiasaan sebaliknya.',
    },
    difficulty: '1–2',
  },
  {
    week: { en: 'Third', id: 'Ketiga' },
    what: { en: 'Rail fence, columnar transposition', id: 'Rail fence, transposisi kolom' },
    why: {
      en: 'The contrast that forces students to notice frequency analysis has assumptions.',
      id: 'Kontras yang memaksa mahasiswa menyadari bahwa analisis frekuensi punya asumsi.',
    },
    difficulty: '2–3',
  },
  {
    week: { en: 'Fourth', id: 'Keempat' },
    what: { en: 'Vigenère, Beaufort, autokey', id: 'Vigenère, Beaufort, autokey' },
    why: {
      en: 'The historical fix for family one, and the Kasiski method that eventually undid it.',
      id: 'Solusi historis untuk keluarga pertama, dan metode Kasiski yang akhirnya meruntuhkannya.',
    },
    difficulty: '3',
  },
  {
    week: { en: 'Fifth', id: 'Kelima' },
    what: { en: 'Playfair, Hill', id: 'Playfair, Hill' },
    why: {
      en: 'Changing the unit of encryption. Hill connects the material to linear algebra.',
      id: 'Mengubah satuan enkripsi. Hill menyambungkan materinya ke aljabar linear.',
    },
    difficulty: '3–4',
  },
  {
    week: { en: 'Sixth', id: 'Keenam' },
    what: { en: 'Bifid, ADFGVX, Enigma', id: 'Bifid, ADFGVX, Enigma' },
    why: {
      en: 'The ceiling of hand cryptography, and the wartime machines built on top of it.',
      id: 'Batas atas kriptografi manual, dan mesin-mesin perang yang dibangun di atasnya.',
    },
    difficulty: '4–5',
  },
  {
    week: { en: 'Seventh', id: 'Ketujuh' },
    what: { en: 'XOR, textbook RSA, SHA-256', id: 'XOR, RSA buku teks, SHA-256' },
    why: {
      en: 'Where the modern subject begins, with the classical intuition already in place to make sense of it.',
      id: 'Titik mulai materi modern, dengan intuisi klasik yang sudah tertanam untuk memahaminya.',
    },
    difficulty: '3–5',
  },
];

/* --------------------------------------------------------------- using this */

export const USING_TITLE: L = {
  en: 'Setting this for other people',
  id: 'Menyiapkannya untuk orang lain',
};

export interface HowTo {
  route: string;
  name: L;
  forWho: L;
  steps: L[];
  caveat: L;
}

export const HOWTO: HowTo[] = [
  {
    route: '/practice',
    name: { en: 'Practice on your own', id: 'Latihan sendiri' },
    forWho: { en: 'Anyone, no account', id: 'Siapa saja, tanpa akun' },
    steps: [
      {
        en: 'Choose a difficulty, a family, or a specific technique — or change nothing and take whatever comes.',
        id: 'Pilih tingkat kesulitan, keluarga, atau teknik tertentu — atau jangan ubah apa pun dan terima soal apa adanya.',
      },
      {
        en: 'Press generate. Type your answer. Spacing, punctuation and case are ignored when marking.',
        id: 'Tekan buat soal. Ketik jawaban Anda. Spasi, tanda baca, dan huruf besar-kecil diabaikan saat dinilai.',
      },
      {
        en: 'A wrong answer returns how close you were, never the expected text — otherwise it becomes a machine for guessing.',
        id: 'Jawaban yang salah mengembalikan seberapa dekat Anda, tidak pernah teks yang diharapkan — kalau tidak, ia berubah menjadi mesin penebak.',
      },
    ],
    caveat: {
      en: 'Enter the same seed to get the same problem again, which is useful when you want to compare working with someone else.',
      id: 'Masukkan seed yang sama untuk mendapat soal yang sama lagi, berguna kalau Anda ingin membandingkan pengerjaan dengan orang lain.',
    },
  },
  {
    route: '/join',
    name: { en: 'Run a quiz for a group', id: 'Menjalankan kuis untuk satu kelompok' },
    forWho: { en: 'Anyone can create and share one', id: 'Siapa saja bisa membuat dan membagikannya' },
    steps: [
      {
        en: 'Set the number of questions, the difficulty band and a time limit. A code and link appear immediately.',
        id: 'Tentukan jumlah soal, rentang kesulitan, dan batas waktu. Kode dan tautannya muncul seketika.',
      },
      {
        en: 'Hand out either. Participants type a name and start — no account, nothing to install.',
        id: 'Bagikan salah satunya. Peserta mengetik nama lalu mulai — tanpa akun, tanpa perlu memasang apa pun.',
      },
      {
        en: 'They see their score and the original message for anything they missed, once the whole attempt is submitted.',
        id: 'Mereka melihat skor dan pesan aslinya untuk soal yang terlewat, setelah seluruh pengerjaan dikirim.',
      },
    ],
    caveat: {
      en: 'Results are not collected anywhere, and a code cannot be withdrawn once shared. For marks that count, use the assessment papers instead.',
      id: 'Hasilnya tidak dikumpulkan di mana pun, dan kode tidak bisa ditarik kembali setelah dibagikan. Untuk nilai resmi, gunakan lembar asesmen.',
    },
  },
  {
    route: '/assess',
    name: { en: 'Build assessment papers', id: 'Membuat lembar asesmen' },
    forWho: { en: 'Instructor sign-in required', id: 'Perlu login pengajar' },
    steps: [
      {
        en: 'Set a cohort size and difficulty band. You get a distinct paper for every student and one marking key covering all of them.',
        id: 'Tentukan jumlah peserta dan rentang kesulitan. Anda mendapat lembar berbeda untuk tiap mahasiswa dan satu kunci pemeriksaan untuk semuanya.',
      },
      {
        en: 'Print directly. The sheets are laid out one per page with no interface furniture on them.',
        id: 'Cetak langsung. Lembarnya ditata satu per halaman tanpa elemen antarmuka ikut tercetak.',
      },
      {
        en: 'Keep the seed. It is printed on every sheet, and it is the only thing needed to rebuild the entire set months later.',
        id: 'Simpan seed-nya. Seed itu tercetak di tiap lembar, dan hanya itu yang dibutuhkan untuk membangun ulang seluruh set berbulan-bulan kemudian.',
      },
    ],
    caveat: {
      en: 'Every paper carries an identical difficulty composition, so no student draws an easier sheet than the person beside them.',
      id: 'Tiap lembar punya komposisi kesulitan yang identik, jadi tidak ada mahasiswa yang kebagian lembar lebih mudah dari orang di sebelahnya.',
    },
  },
];

export const CLOSING: Section = {
  id: 'closing',
  title: { en: 'One thing worth repeating', id: 'Satu hal yang layak diulang' },
  body: [
    {
      en: 'Nothing on this site should protect anything that matters. The modern primitives are correct implementations, but they are written in application JavaScript for reading and working through, not for defending anything.',
      id: 'Tidak ada satu pun di situs ini yang boleh dipakai melindungi sesuatu yang penting. Primitif modernnya adalah implementasi yang benar, tetapi ditulis dalam JavaScript aplikasi untuk dibaca dan dikerjakan, bukan untuk mempertahankan apa pun.',
    },
    {
      en: 'A cipher taught without its break is only half taught. Every catalogue entry states how it was broken, and that half is the half worth learning.',
      id: 'Sandi yang diajarkan tanpa cara memecahkannya hanya diajarkan setengah. Tiap entri katalog menyebutkan bagaimana ia dipecahkan, dan justru bagian itulah yang paling layak dipelajari.',
    },
  ],
};
