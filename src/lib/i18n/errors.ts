/**
 * What went wrong, in the reader's language.
 *
 * The API says what failed in English because that is where the condition is
 * detected and where a log is read. A person on an Indonesian page should not
 * meet English at the exact moment something has gone wrong for them, which is
 * the worst moment to hand somebody a language they do not read.
 *
 * So the message is translated where it is displayed, not where it is raised:
 * the route keeps one canonical wording, the screen shows the reader's.
 * Anything with no entry passes through unchanged rather than being swallowed —
 * an odd-sounding error still beats a blank box.
 *
 * Also covers the few messages a technique raises itself (a key that cannot
 * work), which reach the same red box by the same path.
 */
const ID: Readonly<Record<string, string>> = Object.freeze({
  'A credential is only issued for a correct solution.':
    'Sertifikat hanya diterbitkan untuk jawaban yang benar.',
  'Accounts are unavailable here — no database is configured.':
    'Akun tidak tersedia di sini — tidak ada basis data yang dipasang.',
  'Add at least one question.': 'Tambahkan setidaknya satu soal.',
  'Composing a quiz needs a database, and none is configured here.':
    'Menyusun kuis memerlukan basis data, dan tidak ada yang dipasang di sini.',
  'Could not record that problem.': 'Soal itu tidak dapat dicatat.',
  'Could not save that arrangement.': 'Susunan itu tidak dapat disimpan.',
  'Could not build the papers.': 'Lembar soalnya tidak dapat dibuat.',
  'Could not open the envelope.': 'Amplopnya tidak dapat dibuka.',
  'Instructor sign-in required.': 'Perlu masuk sebagai pengajar.',
  'Keep it under 4000 characters.': 'Jaga agar tetap di bawah 4000 karakter.',
  'Malformed request.': 'Permintaannya tidak berbentuk benar.',
  'No database is configured.': 'Tidak ada basis data yang dipasang.',
  'No such quiz.': 'Kuis itu tidak ada.',
  'Not yours.': 'Bukan milik Anda.',
  'Only the person who set this quiz can attempt it.':
    'Hanya orang yang menyusun kuis ini yang boleh mengerjakannya.',
  'Only the person who set this quiz can open it.':
    'Hanya orang yang menyusun kuis ini yang boleh membukanya.',
  'Sign in first.': 'Masuk dulu.',
  'Sign-in failed.': 'Masuk gagal.',
  'Somebody solved it a moment before you did.':
    'Seseorang memecahkannya sesaat sebelum Anda.',
  'That arrangement could not produce a paper. Try different methods.':
    'Susunan itu tidak dapat menghasilkan lembar soal. Coba metode yang lain.',
  'That code does not match a quiz. Check for a mistyped character.':
    'Kode itu tidak cocok dengan kuis mana pun. Periksa kalau-kalau ada karakter yang salah ketik.',
  'That code does not match a quiz.': 'Kode itu tidak cocok dengan kuis mana pun.',
  'That code does not open a problem.': 'Kode itu tidak membuka soal apa pun.',
  'That code does not open a quiz.': 'Kode itu tidak membuka kuis apa pun.',
  'That code is already claimed by another account.':
    'Kode itu sudah diklaim oleh akun lain.',
  'That quiz is not yours.': 'Kuis itu bukan milik Anda.',
  'That technique could not produce a problem just now.':
    'Teknik itu tidak dapat menghasilkan soal untuk saat ini.',
  'This challenge envelope is not valid. Generate a fresh problem.':
    'Amplop soal ini tidak sah. Buatlah soal yang baru.',
  'This challenge envelope is not valid.': 'Amplop soal ini tidak sah.',
  'This problem has already been solved.': 'Soal ini sudah terpecahkan.',
  'This quiz is closed.': 'Kuis ini sudah ditutup.',
  'Those credentials were not accepted.': 'Kredensial itu tidak diterima.',
  'Those details did not match.': 'Data itu tidak cocok.',
  'Too many attempts. Wait a few minutes before trying again.':
    'Terlalu banyak percobaan. Tunggu beberapa menit sebelum mencoba lagi.',
  'Too many attempts. Wait a minute.': 'Terlalu banyak percobaan. Tunggu semenit.',
  'Type something first.': 'Ketikkan sesuatu dulu.',
  'Unknown language.': 'Bahasa tidak dikenal.',
  'Unknown mode.': 'Mode tidak dikenal.',
  'Unknown technique.': 'Teknik tidak dikenal.',
  'Something went wrong.': 'Ada yang tidak beres.',
});

/** Patterns that carry a value, matched the same way the step trail is. */
const ID_TEMPLATE: readonly (readonly [RegExp, string])[] = [
  [/^(.+) is one-way\. There is nothing to reverse\.$/,
   '$1 bersifat satu arah. Tidak ada yang dapat dibalik.'],
  [/^Number of papers must be between 1 and (\d+)\.$/,
   'Jumlah lembar harus antara 1 dan $1.'],
  [/^Problems per paper must be between 1 and (\d+)\.$/,
   'Jumlah soal per lembar harus antara 1 dan $1.'],
];

export function errorText(message: string, locale: 'en' | 'id'): string {
  if (locale !== 'id' || !message) return message;
  const exact = ID[message];
  if (exact) return exact;
  for (const [re, out] of ID_TEMPLATE) {
    if (re.test(message)) return message.replace(re, out);
  }
  return message;
}

/** Every English message the table covers, for the verification gate. */
export const ERRORS_TRANSLATED = Object.keys(ID);
