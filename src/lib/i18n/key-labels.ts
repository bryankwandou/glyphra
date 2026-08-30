/**
 * The names of the key fields, in Indonesian.
 *
 * "Shift (1-25)" sat in Indonesian pages under an Indonesian heading, in the one
 * box the student actually has to type into. Keyed by the English label rather
 * than by technique, because 101 techniques share only 61 distinct labels —
 * "Keyword" alone covers ten of them — and one table is easier to keep honest
 * than a hundred scattered strings.
 *
 * A label with no entry falls back to English, and `verify:language` fails the
 * build when a technique introduces one, so the fallback never quietly becomes
 * the answer.
 */
const LABEL_ID: Readonly<Record<string, string>> = Object.freeze({
  'No key': 'Tanpa kunci',
  Keyword: 'Kata kunci',
  Key: 'Kunci',
  'Square keyword': 'Kata kunci kisi',
  'Indicator key': 'Kunci penunjuk',
  'Key (128-bit)': 'Kunci (128 bit)',
  'Key (256-bit)': 'Kunci (256 bit)',
  'Plaintext alphabet keyword': 'Kata kunci abjad teks asli',
  'Ciphertext alphabet keyword': 'Kata kunci abjad cipherteks',
  'Number of rails': 'Jumlah rel',
  Period: 'Periode',
  'Transposition keyword': 'Kata kunci transposisi',
  'Shift (1-25)': 'Geseran (1-25)',
  Shift: 'Geseran',
  'Multiplier a (coprime with 26)': 'Pengali a (koprima dengan 26)',
  'Multiplier a': 'Pengali a',
  'Offset b': 'Pergeseran b',
  'Cipher alphabet (26 letters)': 'Abjad sandi (26 huruf)',
  'Left (cipher) alphabet keyword': 'Kata kunci abjad kiri (sandi)',
  'Right (plain) alphabet keyword': 'Kata kunci abjad kanan (asli)',
  'Numeric key (digits)': 'Kunci angka (digit)',
  'Priming key': 'Kunci penyulut',
  'Key passage': 'Bacaan kunci',
  'Pad (as long as the message)': 'Pad (sepanjang pesannya)',
  'Pad (hex, as long as the message)': 'Pad (heks, sepanjang pesannya)',
  'Inner disk keyword': 'Kata kunci cakram dalam',
  'Letters between turns': 'Jumlah huruf antar putaran',
  'Initial disk position': 'Posisi awal cakram',
  'Left rotor': 'Rotor kiri',
  'Middle rotor': 'Rotor tengah',
  'Right rotor': 'Rotor kanan',
  'Left start position': 'Posisi awal kiri',
  'Middle start position': 'Posisi awal tengah',
  'Right start position': 'Posisi awal kanan',
  'Upper square keyword': 'Kata kunci kisi atas',
  'Lower square keyword': 'Kata kunci kisi bawah',
  'Upper-right keyword': 'Kata kunci kanan atas',
  'Lower-left keyword': 'Kata kunci kiri bawah',
  'Key matrix (2×2, row-major)': 'Matriks kunci (2×2, urut baris)',
  'Key matrix (3×3, row-major)': 'Matriks kunci (3×3, urut baris)',
  'Rail order keyword': 'Kata kunci urutan rel',
  'First keyword': 'Kata kunci pertama',
  'Second keyword': 'Kata kunci kedua',
  'Keyword with repeats': 'Kata kunci dengan huruf berulang',
  'Letters per turn': 'Jumlah huruf per putaran',
  'Grid width': 'Lebar kisi',
  'Block size': 'Ukuran blok',
  'Rotation within block': 'Perputaran di dalam blok',
  'Cube keyword': 'Kata kunci kubus',
  'Additive keyword': 'Kata kunci penjumlah',
  'Board keyword': 'Kata kunci papan',
  'First gateway digit': 'Digit gerbang pertama',
  'Second gateway digit': 'Digit gerbang kedua',
  'Key byte (1-255)': 'Byte kunci (1-255)',
  'Nonce (96-bit)': 'Nonce (96 bit)',
  'Initialisation vector': 'Vektor awal',
  'p, q, e': 'p, q, e',
  'prime p, exponent e': 'prima p, eksponen e',
  'prime p, generator g, private x': 'prima p, pembangkit g, kunci pribadi x',
  'prime p, generator g, secrets a and b': 'prima p, pembangkit g, rahasia a dan b',
  'Hole pattern (four digits 1-4)': 'Pola lubang (empat digit 1-4)',
});

/** Every English label the table covers, for the verification gate. */
export const KEY_LABELS_TRANSLATED = Object.keys(LABEL_ID);

export function keyLabel(label: string, locale: 'en' | 'id'): string {
  return locale === 'id' ? (LABEL_ID[label] ?? label) : label;
}
