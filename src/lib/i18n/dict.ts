export const LOCALES = ['en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
};

/**
 * Every string the interface shows, in both languages.
 *
 * Written twice by hand rather than run through a translator. The Indonesian is
 * not a word-for-word rendering of the English — several lines say the same
 * thing differently, because the literal translation reads like a machine wrote
 * it, and a tool a lecturer stands in front of a class with cannot read that
 * way.
 *
 * Deliberately not translated: the 101 catalogue entries. Each carries a
 * mechanism description precise enough to work through by hand, and a
 * half-accurate translation of those would teach the wrong method. They stay in
 * English until someone who knows the material writes them properly.
 */
export interface Dict {
  nav: {
    practice: string; catalogue: string; tutorial: string; join: string; encode: string;
    papers: string; credentials: string; instructor: string; skip: string;
  };
  common: {
    difficulty: string; questions: string; time: string; open: string;
    back: string; next: string; previous: string;
  };
  home: {
    badge: (n: number) => string;
    h1a: string; h1b: string; lead: (n: number) => string;
    ctaGenerate: string; ctaCatalogue: string;
    statTechniques: string; statFamilies: string; statTrips: string;
    mechanicsH: string; mechanicsP: string;
    step1H: string; step1P: string; step2H: string; step2P: string; step3H: string; step3P: string;
    correctH: string; correctP1: string; correctP2: string; correctP3: string;
    quizEyebrow: string; quizH: string; quizP1: string; quizP2: string;
    quizJoin: string; quizCreate: string; quizJoinCode: string;
    quizF1H: string; quizF1P: string; quizF2H: string; quizF2P: string;
    quizF3H: string; quizF3P: string; quizF4H: string; quizF4P: string;
    assessEyebrow: string; assessH: string; assessP1: string; assessP2: string; assessCta: string;
    assessNote1: string; assessNote2: string;
    familiesH: string; familiesP: string; familiesCta: string;
    closingH: string; closingP: string; closingCta: string; closingInstructor: string;
  };
  join: {
    title: string; lead: string; placeholder: string; open: string; opening: string;
    errLength: string; errNotFound: string;
  };
  quiz: {
    eyebrow: string; yourName: string; namePlaceholder: string; nameNote: string;
    resumeFound: (a: number, b: number) => string;
    start: string; resume: string; copyLink: string; linkCopied: string;
    questionOf: (a: number, b: number) => string;
    answered: (n: number) => string;
    ciphertext: string; characters: string; yourAnswer: string;
    answerPlaceholder: string; flag: string; flagged: string;
    showTheory: string; hideTheory: string;
    reviewSubmit: string; finishEarly: string;
    reviewTitle: string; reviewLead: (a: number, b: number) => string;
    reviewBlankWarn: string; submit: string; marking: string; backToQuestions: string;
    recovered: (a: number, b: number) => string;
    keepPractising: string; shareQuiz: string; whereMarks: string;
    correct: string; notRecovered: string; leftBlank: string;
    youWrote: string; messageWas: string; withheld: string;
    notFoundTitle: string; notFoundP: string; notFoundCta: string;
  };
  share: {
    title: string; lead: string;
    questions: string; easiest: string; hardest: string; minutesLabel: string;
    joinCode: string; copyCode: string; codeCopied: string; copyLink: string;
    linkCopied: string; preview: string; reroll: string;
    scanNote: string;
    note1: string; note2: string;
  };
}

const en: Dict = {
  nav: {
    practice: 'Practice', catalogue: 'Catalogue', tutorial: 'Tutorial', join: 'Join a quiz',
    encode: 'Workbench',
    papers: 'Papers', credentials: 'Credentials', instructor: 'Instructor',
    skip: 'Skip to content',
  },
  common: {
    difficulty: 'Difficulty', questions: 'Questions', time: 'Time', open: 'Open',
    back: 'Back', next: 'Next', previous: 'Previous',
  },
  home: {
    badge: (n) => `${n} techniques verified against their own inverse`,
    h1a: 'Cryptography problems,',
    h1b: 'generated the moment you ask.',
    lead: (n) =>
      `Press one button and a fresh exercise appears, drawn from ${n} techniques that run from a Caesar shift a student meets in week one to AES and ChaCha20. Answers and full worked solutions sit behind the instructor sign-in, so a class can practise without anyone reading ahead.`,
    ctaGenerate: 'Generate a problem',
    ctaCatalogue: 'Browse the catalogue',
    statTechniques: 'techniques', statFamilies: 'families', statTrips: 'round trips per check',
    mechanicsH: 'How a problem reaches you',
    mechanicsP:
      'Nothing is pre-written. Each exercise is built on request, enciphered by the same engine that checks itself, and sealed before it leaves the server.',
    step1H: 'Pick your constraints, or none',
    step1P:
      'Choose a technique, a family, a difficulty band, or leave it open and take whatever comes. A seed can be supplied so an entire class receives the identical paper.',
    step2H: 'The message is drawn, then enciphered',
    step2P:
      'Either from the built-in bank or from a language model when you want fresh wording. The model writes the sentence and never touches the cryptography — that stays with the verified engine.',
    step3H: 'The answer travels sealed',
    step3P:
      'The solution is encrypted with AES-256-GCM and handed to your browser as an opaque blob. Marking happens server-side. Reading the page source gets you nothing.',
    correctH: 'A wrong answer key is worse than no answer key',
    correctP1:
      'A cipher implementation that is subtly wrong will still produce output that looks like ciphertext. A student cannot tell. The marking will simply be wrong, and they will conclude they misunderstood the method.',
    correctP2:
      'So every technique is run against its own inverse before it can appear: twelve random key and message pairs each, asserting that decoding returns exactly what was encoded. The first time that harness ran it rejected six techniques. A duplicate glyph in the Pigpen table. An RSA parameter set where the public exponent shared a factor with the totient, so no private exponent existed. Steganography with no terminator, decoding endless letters past the end of the payload.',
    correctP3:
      'All six are fixed. The check runs on every build, and a failure stops the build.',
    quizEyebrow: 'Share it with a class',
    quizH: 'One code, everyone in, marked automatically',
    quizP1:
      'Set the length, the difficulty and a time limit, and you get an eight-character code and a link. Participants open it, type a name and start. No account, no sign-up, and nothing recorded about who took it.',
    quizP2:
      'The code carries the whole quiz rather than pointing at a stored one, so the link never expires and two people typing the same code get exactly the same questions. The other side of that is worth knowing: a code cannot be withdrawn once it is out.',
    quizJoin: 'Join with a code', quizCreate: 'Create one', quizJoinCode: 'Join code',
    quizF1H: 'Eight characters',
    quizF1P: 'checked for typos, so one wrong letter is caught rather than opening a different quiz',
    quizF2H: 'Timer and progress',
    quizF2P: 'a question map, flag-to-revisit, and a review step before submitting',
    quizF3H: 'Answers kept locally',
    quizF3P: 'a tab closed by accident does not cost the attempt',
    quizF4H: 'Marked at the end',
    quizF4P: 'never question by question, which would let someone probe their way to an answer',
    assessEyebrow: 'For whoever marks the work',
    assessH: 'Thirty students, thirty different papers, one key',
    assessP1:
      'Set a cohort size and a difficulty band. You get a separate paper for every student over the same techniques, plus a single marking key that covers all of them. Copying a neighbour stops helping, and the marks stay comparable.',
    assessP2:
      'Every paper carries an identical difficulty composition, so nobody draws an easier sheet than the person beside them. Nothing is stored: a paper is a function of its seed, and the seed is printed on it, so a sheet lost in March can be rebuilt in August.',
    assessCta: 'Build a set of papers',
    assessNote1: 'difficulty 2, 3, 4 on every sheet',
    assessNote2: 'no technique repeats within a paper',
    familiesH: 'Ten families, three thousand years',
    familiesP:
      'From a Spartan rod to a stream cipher built to dodge cache-timing attacks. Each entry carries its mechanism, its period, and an honest account of how it was broken.',
    familiesCta: 'Open the catalogue',
    closingH: 'Take one now and see how far you get',
    closingP:
      'No account, no setup. Pick a difficulty and start. If you get stuck, the catalogue explains the mechanism without handing over the answer.',
    closingCta: 'Generate a problem',
    closingInstructor: 'Instructor sign-in',
  },
  join: {
    title: 'Join a quiz',
    lead: 'Type the code you were given. No account, no sign-up.',
    placeholder: 'XXXX-XXXX', open: 'Open the quiz', opening: 'Opening…',
    errLength: 'A code is eight characters.',
    errNotFound: 'That code did not open a quiz.',
  },
  quiz: {
    eyebrow: 'Quiz', yourName: 'Your name', namePlaceholder: 'So your result is labelled',
    nameNote:
      'The name stays in this browser and on your own result screen. Nothing is sent anywhere until you submit, and no account is created.',
    resumeFound: (a, b) =>
      `An earlier attempt was found on this device — ${a} of ${b} answered. Starting will pick up where you left off.`,
    start: 'Start', resume: 'Resume',
    copyLink: 'Copy the link to share', linkCopied: 'Link copied',
    questionOf: (a, b) => `Question ${a} of ${b}`,
    answered: (n) => `${n} answered`,
    ciphertext: 'Ciphertext', characters: 'characters', yourAnswer: 'Your answer',
    answerPlaceholder: 'Spacing, punctuation and case are ignored.',
    flag: 'Flag to revisit', flagged: 'Flagged to revisit',
    showTheory: 'How this cipher works', hideTheory: 'Hide the mechanism',
    reviewSubmit: 'Review and submit', finishEarly: 'Finish early',
    reviewTitle: 'Before you submit',
    reviewLead: (a, b) => `${a} of ${b} answered.`,
    reviewBlankWarn: 'Blank answers are marked wrong.',
    submit: 'Submit for marking', marking: 'Marking…', backToQuestions: 'Back to the questions',
    recovered: (a, b) => `${a} of ${b} recovered`,
    keepPractising: 'Keep practising', shareQuiz: 'Share this quiz',
    whereMarks: 'Where the marks went',
    correct: 'Correct', notRecovered: 'Not recovered', leftBlank: 'Left blank',
    youWrote: 'You wrote', messageWas: 'The message was',
    withheld: 'withheld — recover it',
    notFoundTitle: 'That code did not open a quiz',
    notFoundP:
      'Codes are eight characters and are checked for typos, so a single wrong character is caught rather than opening the wrong quiz. Worth re-reading the code from whoever shared it.',
    notFoundCta: 'Type a code again',
  },
  share: {
    title: 'Share a quiz',
    lead:
      'For practice rather than assessment: one link, everybody gets the same questions, marked automatically. Participants need no account. Set it up here and hand out either the code or the link.',
    questions: 'Questions', easiest: 'Easiest', hardest: 'Hardest',
    minutesLabel: 'Minutes — 0 for open',
    joinCode: 'Join code', copyCode: 'Copy the code', codeCopied: 'Code copied',
    copyLink: 'Copy the link', linkCopied: 'Link copied',
    preview: 'Preview it', reroll: 'Different questions',
    scanNote: 'Point a phone camera at this to open the quiz.',
    note1:
      'The code carries the whole quiz, so the link never expires and nothing is stored about who took it. The other side of that: a code cannot be withdrawn once it is out, and the questions cannot be edited afterwards — changing a setting produces a new code.',
    note2:
      'Anyone with the code can open the quiz, and results are shown to the participant rather than collected. Use the assessment papers above when the marks have to count.',
  },
};

const id: Dict = {
  nav: {
    practice: 'Latihan', catalogue: 'Katalog', tutorial: 'Tutorial', join: 'Ikut kuis',
    encode: 'Bengkel',
    papers: 'Lembar soal', credentials: 'Kredensial', instructor: 'Pengajar',
    skip: 'Lompat ke konten',
  },
  common: {
    difficulty: 'Kesulitan', questions: 'Soal', time: 'Waktu', open: 'Bebas',
    back: 'Kembali', next: 'Berikutnya', previous: 'Sebelumnya',
  },
  home: {
    badge: (n) => `${n} teknik sudah diuji terhadap kebalikannya sendiri`,
    h1a: 'Soal kriptografi,',
    h1b: 'dibuat begitu Anda meminta.',
    lead: (n) =>
      `Tekan satu tombol dan soal baru muncul, diambil dari ${n} teknik — mulai dari geseran Caesar yang ditemui mahasiswa di pekan pertama sampai AES dan ChaCha20. Kunci jawaban dan langkah penyelesaian lengkap ada di balik login pengajar, jadi satu kelas bisa berlatih tanpa ada yang mengintip lebih dulu.`,
    ctaGenerate: 'Buat satu soal',
    ctaCatalogue: 'Lihat katalog',
    statTechniques: 'teknik', statFamilies: 'keluarga', statTrips: 'uji bolak-balik tiap pemeriksaan',
    mechanicsH: 'Bagaimana satu soal sampai ke Anda',
    mechanicsP:
      'Tidak ada soal yang ditulis lebih dulu. Tiap latihan dibangun saat diminta, disandikan oleh mesin yang sama yang memeriksa dirinya sendiri, lalu disegel sebelum meninggalkan server.',
    step1H: 'Tentukan batasannya, atau biarkan bebas',
    step1P:
      'Pilih satu teknik, satu keluarga, satu rentang kesulitan, atau biarkan terbuka dan terima apa pun yang keluar. Seed bisa Anda isi sendiri supaya satu kelas menerima lembar yang persis sama.',
    step2H: 'Pesannya diambil, lalu disandikan',
    step2P:
      'Bisa dari bank kalimat bawaan, bisa dari model bahasa kalau Anda ingin kalimat yang segar. Model hanya menulis kalimatnya dan tidak pernah menyentuh kriptografinya — bagian itu tetap dipegang mesin yang sudah terverifikasi.',
    step3H: 'Jawabannya berjalan dalam keadaan tersegel',
    step3P:
      'Solusinya dienkripsi dengan AES-256-GCM lalu diserahkan ke peramban Anda sebagai gumpalan buram. Penilaian terjadi di sisi server. Membaca kode sumber halaman tidak menghasilkan apa-apa.',
    correctH: 'Kunci jawaban yang salah lebih buruk daripada tidak ada kunci sama sekali',
    correctP1:
      'Implementasi sandi yang meleset sedikit saja tetap menghasilkan keluaran yang tampak seperti cipherteks. Mahasiswa tidak bisa membedakannya. Penilaiannya akan salah, dan mereka akan menyimpulkan bahwa merekalah yang keliru memahami metodenya.',
    correctP2:
      'Karena itu tiap teknik dijalankan terhadap kebalikannya sendiri sebelum boleh muncul: dua belas pasang kunci dan pesan acak untuk masing-masing, memastikan hasil pembacaan kembali persis sama dengan yang disandikan. Saat pertama kali dijalankan, pemeriksa itu menolak enam teknik. Satu glif kembar di tabel Pigpen. Satu set parameter RSA yang eksponen publiknya berbagi faktor dengan totient, sehingga eksponen privatnya tidak pernah ada. Steganografi tanpa penanda akhir, yang terus membaca huruf melewati ujung muatannya.',
    correctP3:
      'Keenamnya sudah diperbaiki. Pemeriksaan ini berjalan di tiap build, dan kegagalan menghentikan build.',
    quizEyebrow: 'Bagikan ke satu kelas',
    quizH: 'Satu kode, semua masuk, dinilai otomatis',
    quizP1:
      'Atur panjangnya, kesulitannya, dan batas waktunya, lalu Anda dapat kode delapan karakter beserta tautannya. Peserta membukanya, mengetik nama, dan mulai. Tanpa akun, tanpa pendaftaran, dan tidak ada catatan tentang siapa yang mengerjakannya.',
    quizP2:
      'Kodenya membawa seluruh kuis, bukan menunjuk ke kuis yang tersimpan, sehingga tautannya tidak pernah kedaluwarsa dan dua orang yang mengetik kode sama mendapat soal yang persis sama. Sisi lainnya perlu Anda tahu: kode tidak bisa ditarik kembali setelah tersebar.',
    quizJoin: 'Masuk pakai kode', quizCreate: 'Buat satu', quizJoinCode: 'Kode masuk',
    quizF1H: 'Delapan karakter',
    quizF1P: 'diperiksa dari salah ketik, jadi satu huruf keliru tertangkap dan bukan malah membuka kuis lain',
    quizF2H: 'Timer dan progres',
    quizF2P: 'peta soal, penanda untuk ditinjau, dan langkah peninjauan sebelum mengirim',
    quizF3H: 'Jawaban tersimpan lokal',
    quizF3P: 'tab yang tertutup tanpa sengaja tidak menghanguskan pengerjaan',
    quizF4H: 'Dinilai di akhir',
    quizF4P: 'bukan per soal, karena cara itu memungkinkan orang meraba-raba sampai menemukan jawabannya',
    assessEyebrow: 'Untuk yang memeriksa pekerjaan',
    assessH: 'Tiga puluh mahasiswa, tiga puluh lembar berbeda, satu kunci',
    assessP1:
      'Tentukan jumlah peserta dan rentang kesulitan. Anda mendapat lembar terpisah untuk tiap mahasiswa dengan teknik yang setara, ditambah satu kunci pemeriksaan yang mencakup semuanya. Menyontek sebelah jadi tidak berguna, dan nilainya tetap sebanding.',
    assessP2:
      'Tiap lembar punya komposisi kesulitan yang identik, jadi tidak ada yang kebagian lembar lebih mudah dari orang di sebelahnya. Tidak ada yang disimpan: lembar soal adalah fungsi dari seed-nya, dan seed itu tercetak di lembarnya, jadi lembar yang hilang di bulan Maret bisa dibangun ulang di bulan Agustus.',
    assessCta: 'Buat satu set lembar soal',
    assessNote1: 'kesulitan 2, 3, 4 di tiap lembar',
    assessNote2: 'tidak ada teknik yang berulang dalam satu lembar',
    familiesH: 'Sepuluh keluarga, tiga ribu tahun',
    familiesP:
      'Dari tongkat Sparta sampai sandi aliran yang dirancang menghindari serangan waktu-cache. Tiap entri memuat mekanismenya, zamannya, dan penjelasan jujur tentang bagaimana ia dipecahkan.',
    familiesCta: 'Buka katalog',
    closingH: 'Ambil satu sekarang dan lihat sejauh mana Anda sampai',
    closingP:
      'Tanpa akun, tanpa penyiapan. Pilih kesulitannya lalu mulai. Kalau mentok, katalog menjelaskan mekanismenya tanpa menyerahkan jawabannya.',
    closingCta: 'Buat satu soal',
    closingInstructor: 'Login pengajar',
  },
  join: {
    title: 'Ikut kuis',
    lead: 'Ketik kode yang Anda terima. Tanpa akun, tanpa pendaftaran.',
    placeholder: 'XXXX-XXXX', open: 'Buka kuisnya', opening: 'Membuka…',
    errLength: 'Kode terdiri dari delapan karakter.',
    errNotFound: 'Kode itu tidak membuka kuis apa pun.',
  },
  quiz: {
    eyebrow: 'Kuis', yourName: 'Nama Anda', namePlaceholder: 'Supaya hasilnya ada namanya',
    nameNote:
      'Nama ini hanya tersimpan di peramban Anda dan tampil di layar hasil Anda sendiri. Tidak ada yang dikirim ke mana pun sampai Anda menekan kirim, dan tidak ada akun yang dibuat.',
    resumeFound: (a, b) =>
      `Ada pengerjaan sebelumnya di perangkat ini — ${a} dari ${b} soal sudah dijawab. Menekan mulai akan melanjutkan dari sana.`,
    start: 'Mulai', resume: 'Lanjutkan',
    copyLink: 'Salin tautannya untuk dibagikan', linkCopied: 'Tautan tersalin',
    questionOf: (a, b) => `Soal ${a} dari ${b}`,
    answered: (n) => `${n} terjawab`,
    ciphertext: 'Cipherteks', characters: 'karakter', yourAnswer: 'Jawaban Anda',
    answerPlaceholder: 'Spasi, tanda baca, dan huruf besar-kecil diabaikan.',
    flag: 'Tandai untuk ditinjau', flagged: 'Ditandai untuk ditinjau',
    showTheory: 'Cara kerja sandi ini', hideTheory: 'Sembunyikan mekanismenya',
    reviewSubmit: 'Tinjau lalu kirim', finishEarly: 'Selesaikan lebih awal',
    reviewTitle: 'Sebelum Anda mengirim',
    reviewLead: (a, b) => `${a} dari ${b} soal terjawab.`,
    reviewBlankWarn: 'Jawaban kosong dinilai salah.',
    submit: 'Kirim untuk dinilai', marking: 'Menilai…', backToQuestions: 'Kembali ke soal',
    recovered: (a, b) => `${a} dari ${b} berhasil dipecahkan`,
    keepPractising: 'Lanjut berlatih', shareQuiz: 'Bagikan kuis ini',
    whereMarks: 'Rincian nilainya',
    correct: 'Benar', notRecovered: 'Belum terpecahkan', leftBlank: 'Dikosongkan',
    youWrote: 'Anda menulis', messageWas: 'Pesan aslinya',
    withheld: 'dirahasiakan — temukan sendiri',
    notFoundTitle: 'Kode itu tidak membuka kuis',
    notFoundP:
      'Kode terdiri dari delapan karakter dan diperiksa dari salah ketik, jadi satu karakter keliru akan tertangkap dan bukan malah membuka kuis yang salah. Sebaiknya baca ulang kodenya dari orang yang membagikannya.',
    notFoundCta: 'Ketik kode lagi',
  },
  share: {
    title: 'Bagikan satu kuis',
    lead:
      'Untuk latihan, bukan penilaian resmi: satu tautan, semua orang dapat soal yang sama, dinilai otomatis. Peserta tidak perlu akun. Atur di sini lalu bagikan kodenya atau tautannya.',
    questions: 'Jumlah soal', easiest: 'Termudah', hardest: 'Tersulit',
    minutesLabel: 'Menit — isi 0 untuk bebas',
    joinCode: 'Kode masuk', copyCode: 'Salin kodenya', codeCopied: 'Kode tersalin',
    copyLink: 'Salin tautannya', linkCopied: 'Tautan tersalin',
    preview: 'Pratinjau', reroll: 'Ganti soalnya',
    scanNote: 'Arahkan kamera ponsel ke sini untuk membuka kuisnya.',
    note1:
      'Kodenya membawa seluruh kuis, jadi tautannya tidak pernah kedaluwarsa dan tidak ada catatan tentang siapa yang mengerjakannya. Sisi lainnya: kode tidak bisa ditarik kembali setelah tersebar, dan soalnya tidak bisa diubah setelahnya — mengubah pengaturan menghasilkan kode baru.',
    note2:
      'Siapa pun yang punya kodenya bisa membuka kuis, dan hasilnya ditampilkan ke pesertanya sendiri, bukan dikumpulkan. Pakai lembar asesmen di atas kalau nilainya harus dihitung resmi.',
  },
};

export const DICT: Record<Locale, Dict> = { en, id };
