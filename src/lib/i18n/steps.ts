/**
 * The worked-solution trail, in Indonesian.
 *
 * The trail is the part a student actually reads to learn a method — "Siapkan
 * teksnya", "Ganti tiap huruf", "Baca kolomnya menurut peringkat" — and it was
 * the last surface still entirely in English. It is built inside each cipher,
 * during the real computation, which is a rule worth keeping: a trail
 * reconstructed afterwards can disagree with the answer it claims to explain.
 *
 * So the ciphers stay monolingual and untouched, and their output is translated
 * here, at the boundary where a Step stops being a computation record and
 * becomes something a person reads.
 *
 * Two tables, because two kinds of string come out:
 *
 *  - fixed phrases, matched exactly;
 *  - phrases that interpolate a value ("Rotate the alphabet left by 7."), held
 *    as templates with {0} where the value goes and matched by a regular
 *    expression compiled from the same template, so both sides cannot drift.
 *
 * `data` is never translated. It carries the artefact the explanation refers to
 * — a Polybius square, a column ordering, a rotor position — and those are
 * letters and digits, the same in any language.
 *
 * `verify:steps` runs every technique in the catalogue in both directions and
 * fails the build on any step it cannot translate, so a new cipher cannot
 * quietly reintroduce English.
 */
import type { Step } from '../ciphers/types';

/* ------------------------------------------------------------------ titles */

const TITLE: Readonly<Record<string, string>> = Object.freeze({
  'Prepare the text': 'Siapkan teksnya',
  'Combine each pair': 'Padukan tiap pasangannya',
  'Reverse the combination': 'Balikkan pemaduannya',
  'Pad and process': 'Isi lalu olah',
  Result: 'Hasil',
  'Read the plaintext': 'Baca teks aslinya',
  'Rank the keyword': 'Beri peringkat kata kuncinya',
  'Result in hex': 'Hasil dalam heksadesimal',
  Substitute: 'Gantikan',
  'Read across the rows': 'Baca melintasi barisnya',
  'Build the square': 'Bangun kisinya',
  'Rebuild the square': 'Bangun ulang kisinya',
  'Take the bytes': 'Ambil byte-nya',
  'Invalid key': 'Kunci tidak sah',
  Encipher: 'Sandikan',
  'Substitute back': 'Gantikan kembali',
  'Strip the padding': 'Buang pengisinya',
  'XOR again': 'XOR lagi',
  'Prepare digraphs': 'Siapkan pasangan hurufnya',
  'Read the columns in rank order': 'Baca kolomnya menurut urutan peringkat',
  'Pair the digits': 'Pasangkan digitnya',
  'Split into bytes': 'Belah menjadi byte',
  'Run the rounds backwards': 'Jalankan putarannya mundur',
  'Retrieve the matching pad': 'Ambil pad yang bersesuaian',
  'Convert to bits': 'Ubah menjadi bit',
  'Read eight bits at a time': 'Baca delapan bit sekaligus',
  Recombine: 'Satukan kembali',
  'Parse the hex': 'Uraikan heksadesimalnya',
  'Regenerate the keystream': 'Bangkitkan ulang arus kuncinya',
  'Expand the key': 'Kembangkan kuncinya',
  'Pair the key letters': 'Pasangkan huruf kuncinya',
  'Reverse the lookup': 'Balikkan pencariannya',
  'Write the zigzag': 'Tulis zigzagnya',
  'Rank with ties': 'Beri peringkat dengan seri',
  'Regroup the bit stream': 'Kelompokkan ulang arus bitnya',
  'Index the alphabet': 'Nomori abjadnya',
  'Drop the padding': 'Buang pengisinya',
  'Look up each symbol': 'Cari tiap simbolnya',
  'Regroup into bytes': 'Kelompokkan ulang menjadi byte',
  'Write each in base 16': 'Tulis masing-masing dalam basis 16',
  'Convert to characters': 'Ubah menjadi karakter',
  'Read the whole input as one number': 'Baca seluruh masukannya sebagai satu bilangan',
  'Map the digits to symbols': 'Petakan digitnya ke simbol',
  'Map symbols back to digits': 'Petakan simbolnya kembali ke digit',
  'Rebuild the integer': 'Bangun ulang bilangan bulatnya',
  'Convert back to base 256': 'Ubah kembali ke basis 256',
  'Group into four bytes': 'Kelompokkan menjadi empat byte',
  'Read each group as a 32-bit number': 'Baca tiap kelompok sebagai bilangan 32 bit',
  'Convert to base 85': 'Ubah ke basis 85',
  'Trim the final group': 'Pangkas kelompok terakhirnya',
  'Group into five characters': 'Kelompokkan menjadi lima karakter',
  'Pad the last group': 'Isi kelompok terakhirnya',
  'Convert back to bytes': 'Ubah kembali menjadi byte',
  'Take the character codes': 'Ambil kode karakternya',
  'Split on whitespace': 'Belah pada spasinya',
  'Identify unreserved characters': 'Kenali karakter yang tidak dicadangkan',
  'Escape everything else': 'Larikan selebihnya',
  'Find every percent sequence': 'Temukan tiap urutan persennya',
  'Substitute the characters back': 'Gantikan kembali karakternya',
  'Take each code point': 'Ambil tiap titik kodenya',
  'Wrap in the entity syntax': 'Bungkus dalam sintaks entitasnya',
  'Match every entity': 'Cocokkan tiap entitasnya',
  'Substitute the characters': 'Gantikan karakternya',
  'Leave printable characters alone': 'Biarkan karakter tercetak apa adanya',
  'Escape the rest': 'Larikan sisanya',
  'Find the escape sequences': 'Temukan urutan pelariannya',
  'Look up each character': 'Cari tiap karakternya',
  'Separate with spaces': 'Pisahkan dengan spasi',
  'Split on the gaps': 'Belah pada jedanya',
  'Look each group up': 'Cari tiap kelompoknya',
  'Fold K into C': 'Lipat K ke dalam C',
  'Find each letter in the grid': 'Temukan tiap huruf di dalam kisinya',
  'Tap it out': 'Ketukkan',
  'Count the taps': 'Hitung ketukannya',
  'Read off the grid': 'Baca dari kisinya',
  'Say each letter as a word': 'Ucapkan tiap huruf sebagai satu kata',
  'Split into words': 'Belah menjadi kata',
  'Take each initial': 'Ambil tiap huruf awalnya',
  'Swap the lookalikes': 'Tukar yang bentuknya mirip',
  'Swap the digits back': 'Tukar kembali angkanya',
  'Map to dot patterns': 'Petakan ke pola titik',
  'Read each cell': 'Baca tiap selnya',
  'Take the byte values': 'Ambil nilai byte-nya',
  'Apply g = n XOR (n >> 1)': 'Terapkan g = n XOR (n >> 1)',
  'Accumulate the XOR downward': 'Tumpuk XOR-nya ke bawah',
  'Draw each figure': 'Gambar tiap figurnya',
  'Count the figures': 'Hitung figurnya',
  'Read off the mapping': 'Baca dari pemetaannya',
  'Pad to full grids': 'Isi sampai kisinya penuh',
  'Cut the holes': 'Lubangi kartunya',
  'Write through four quarter-turns': 'Tulis lewat empat putaran seperempat',
  'Read the grid normally': 'Baca kisinya seperti biasa',
  'Refill the grid': 'Isi ulang kisinya',
  'Lay the grille over it': 'Tumpangkan kartu berlubangnya',
  'Pad to full squares': 'Isi sampai perseginya penuh',
  'Permute rows and columns': 'Permutasikan baris dan kolomnya',
  'Undo both permutations': 'Batalkan kedua permutasinya',
  'Pair the bytes': 'Pasangkan byte-nya',
  'Read each pair as one number': 'Baca tiap pasangan sebagai satu bilangan',
  'Convert to base 45': 'Ubah ke basis 45',
  'Group into threes': 'Kelompokkan bertiga-tiga',
  'Rebuild each value': 'Bangun ulang tiap nilainya',
  'Group into three bytes': 'Kelompokkan menjadi tiga byte',
  'Split into four six-bit values': 'Belah menjadi empat nilai enam bit',
  'Add 32 to each': 'Tambahkan 32 pada masing-masing',
  'Prefix the length': 'Awali dengan panjangnya',
  'Read the length prefix': 'Baca awalan panjangnya',
  'Subtract 32 from each character': 'Kurangkan 32 dari tiap karakter',
  'Repack into bytes': 'Kemas ulang menjadi byte',
  'Pad to 8-byte blocks': 'Isi sampai blok 8 byte',
  'Run 32 rounds': 'Jalankan 32 putaran',
  'Key selection differs from TEA': 'Pemilihan kuncinya berbeda dari TEA',
  'Take the message bytes': 'Ambil byte pesannya',
  'Take the same number of pad bytes': 'Ambil byte pad sebanyak itu juga',
  'XOR bit by bit': 'XOR bit demi bit',
  'Map bits to whitespace': 'Petakan bitnya ke spasi dan tab',
  'Extract the whitespace': 'Tarik keluar spasi dan tabnya',
  'Map to invisible code points': 'Petakan ke titik kode tak terlihat',
  'Filter to the invisible characters': 'Saring hanya karakter tak terlihatnya',
  'Take the hidden message': 'Ambil pesan tersembunyinya',
  'Choose a word for each letter': 'Pilih satu kata untuk tiap huruf',
  'Take the first letter of each word': 'Ambil huruf pertama tiap kata',
  'Read them in order': 'Baca berurutan',
  'Cover too short': 'Teks penyamarnya terlalu pendek',
  'Encode the message in five bits per letter': 'Sandikan pesannya lima bit per huruf',
  'Append a terminator': 'Tambahkan penanda akhir',
  'Take a cover text': 'Ambil sebuah teks penyamar',
  'Set the case from the bits': 'Tetapkan besar-kecil hurufnya dari bitnya',
  'Read the case pattern': 'Baca pola besar-kecil hurufnya',
  'Group into fives': 'Kelompokkan berlima-lima',
  Decode: 'Baca kembali',
  'Split each block into coordinates': 'Belah tiap blok menjadi koordinat',
  'Read the stream back in pairs': 'Baca arusnya kembali berpasangan',
  'Expand each block back to a digit stream': 'Kembangkan tiap blok kembali menjadi arus digit',
  'Cut the stream in half': 'Potong arusnya menjadi dua',
  'Build the cube': 'Bangun kubusnya',
  'Split into three coordinates': 'Belah menjadi tiga koordinat',
  'Read the stream back in threes': 'Baca arusnya kembali bertiga-tiga',
  'Rebuild the cube': 'Bangun ulang kubusnya',
  'Expand to a digit stream': 'Kembangkan menjadi arus digit',
  'Cut the stream into thirds': 'Potong arusnya menjadi tiga bagian',
  Fractionate: 'Pecah hurufnya',
  'Transpose the fractionated text': 'Transposisikan teks yang sudah dipecah',
  'Undo the transposition first': 'Batalkan transposisinya lebih dulu',
  'Recombine the pairs': 'Satukan kembali pasangannya',
  'Convert both to numbers': 'Ubah keduanya menjadi angka',
  'Add without carrying': 'Jumlahkan tanpa menyimpan',
  'Subtract the additive key': 'Kurangkan kunci penjumlahnya',
  'Split each result into coordinates': 'Belah tiap hasilnya menjadi koordinat',
  'Lay out the board': 'Tata papannya',
  'Encode each letter': 'Sandikan tiap hurufnya',
  'Rebuild the board': 'Bangun ulang papannya',
  'Read left to right': 'Baca dari kiri ke kanan',
  'Take the input bytes': 'Ambil byte masukannya',
  Digest: 'Ringkas',
  'Not invertible': 'Tidak dapat dibalik',
  'Choose the primes': 'Pilih primanya',
  'Check the public exponent': 'Periksa eksponen publiknya',
  'Encrypt each character': 'Sandikan tiap karakternya',
  'Factor the modulus': 'Faktorkan modulusnya',
  'Compute the private exponent': 'Hitung eksponen pribadinya',
  'Decrypt each value': 'Baca kembali tiap nilainya',
  'Choose the prime and exponent': 'Pilih prima dan eksponennya',
  'Raise each character': 'Pangkatkan tiap karakternya',
  'Invert the exponent': 'Balikkan eksponennya',
  'Raise each value again': 'Pangkatkan lagi tiap nilainya',
  'Set up the keys': 'Siapkan kuncinya',
  'Pick an ephemeral value per character': 'Pilih satu nilai sesaat untuk tiap karakter',
  Encrypt: 'Sandikan',
  'Recompute the shared value': 'Hitung ulang nilai bersamanya',
  'Invert it': 'Balikkan',
  'Recover each character': 'Pulihkan tiap karakternya',
  'Publish the public values': 'Terbitkan nilai publiknya',
  'Each side computes the shared secret': 'Tiap pihak menghitung rahasia bersamanya',
  'Derive a keystream': 'Turunkan sebuah arus kunci',
  'Recompute the shared secret': 'Hitung ulang rahasia bersamanya',
  'Subtract the keystream': 'Kurangkan arus kuncinya',
  'XOR with the key byte': 'XOR dengan byte kuncinya',
  'XOR with the same byte': 'XOR dengan byte yang sama',
  'Cycle the key': 'Putar kuncinya',
  'XOR position by position': 'XOR posisi demi posisi',
  'XOR with the same repeating key': 'XOR dengan kunci berulang yang sama',
  'Initialise the state': 'Siapkan keadaan awalnya',
  'Key-scheduling pass': 'Lintasan penjadwalan kunci',
  'Generate the keystream': 'Bangkitkan arus kuncinya',
  'XOR against the message': 'XOR terhadap pesannya',
  'Regenerate the same keystream': 'Bangkitkan ulang arus kunci yang sama',
  'Build the 4×4 state': 'Bangun keadaan 4×4-nya',
  'Run twenty rounds': 'Jalankan dua puluh putaran',
  'Add the original state back': 'Tambahkan kembali keadaan awalnya',
  'XOR the keystream against the message': 'XOR-kan arus kuncinya terhadap pesan',
  'Pad to a block boundary': 'Isi sampai batas bloknya',
  'Split into 64-bit blocks': 'Belah menjadi blok 64 bit',
  'Run 32 Feistel rounds': 'Jalankan 32 putaran Feistel',
  'Pad to 16 bytes': 'Isi sampai 16 byte',
  'Chain each block': 'Rantaikan tiap bloknya',
  'Encrypt each block independently': 'Sandikan tiap blok secara terpisah',
  'Ten rounds per block': 'Sepuluh putaran per blok',
  'Run the rounds in reverse': 'Jalankan putarannya terbalik',
  Unchain: 'Lepaskan rantainya',
  'Decrypt independently': 'Baca kembali secara terpisah',
  'Lay the key against it': 'Jajarkan kuncinya di bawahnya',
  'Walk down the tabula recta': 'Telusuri tabula recta ke bawah',
  'Climb back up the table': 'Naik kembali di tabelnya',
  'Build the keystream': 'Bangun arus kuncinya',
  'Start with the priming key': 'Mulai dengan kunci penyulutnya',
  'Extend as you go': 'Perpanjang sambil berjalan',
  'Take the key passage': 'Ambil bacaan kuncinya',
  'Recover the passage': 'Pulihkan bacaannya',
  'Subtract it out': 'Kurangkan keluar',
  'Take pad material': 'Ambil bahan pad-nya',
  'Add modulo 26': 'Jumlahkan modulo 26',
  'Destroy the pad': 'Musnahkan pad-nya',
  'Subtract modulo 26': 'Kurangkan modulo 26',
  'Swap across the halves': 'Tukar antar kedua belahan',
  'Apply the identical table': 'Terapkan tabel yang sama persis',
  'Swap back across the halves': 'Tukar kembali antar kedua belahan',
  'Build both alphabets': 'Bangun kedua abjadnya',
  'Apply the indicator key': 'Terapkan kunci penunjuknya',
  'Rebuild both alphabets': 'Bangun ulang kedua abjadnya',
  'Regenerate the indicator': 'Bangkitkan ulang penunjuknya',
  'Set the inner disk': 'Setel cakram dalamnya',
  'Turn every few letters': 'Putar setiap beberapa huruf',
  'Rebuild the disks': 'Bangun ulang cakramnya',
  'Track the turns': 'Ikuti putarannya',
  'Set the machine': 'Setel mesinnya',
  'Step, then encipher': 'Langkahkan dulu, baru sandikan',
  'Trace the circuit': 'Telusuri rangkaiannya',
  'Set the machine identically': 'Setel mesinnya persis sama',
  'Type the ciphertext in': 'Ketikkan cipherteksnya',
  'Apply the three rules': 'Terapkan ketiga aturannya',
  'Reverse the rules': 'Balikkan aturannya',
  'Build both squares': 'Bangun kedua kisinya',
  'Swap the columns': 'Tukar kolomnya',
  'Note the transparencies': 'Catat pasangan yang lewat bening',
  'Rebuild both squares': 'Bangun ulang kedua kisinya',
  'Swap the columns again': 'Tukar kolomnya lagi',
  'Lay out the four squares': 'Tata keempat kisinya',
  'Read the opposite corners': 'Baca sudut yang berseberangan',
  'Rebuild the keyed squares': 'Bangun ulang kisi berkuncinya',
  'Reverse the corner lookup': 'Balikkan pencarian sudutnya',
  'Prepare and pad': 'Siapkan dan isi',
  'Check the matrix': 'Periksa matriksnya',
  'Multiply each block': 'Kalikan tiap bloknya',
  'Invert the matrix modulo 26': 'Balikkan matriksnya modulo 26',
  'Multiply each block by the inverse': 'Kalikan tiap blok dengan inversnya',
  'Build the shifted alphabet': 'Bangun abjad tergesernya',
  'Group in fives': 'Kelompokkan berlima-lima',
  'Reverse the shift': 'Balikkan geserannya',
  'Keep the digits': 'Pertahankan angkanya',
  'Add five, wrap at ten': 'Tambah lima, berputar di sepuluh',
  'Add five again': 'Tambah lima lagi',
  'Restrict to printable ASCII': 'Batasi pada ASCII tercetak',
  'Rotate by 47': 'Putar sejauh 47',
  'Rotate by 47 again': 'Putar sejauh 47 lagi',
  'Keep letters and digits': 'Pertahankan huruf dan angkanya',
  'Split the work': 'Bagi pekerjaannya',
  'Apply the same pass again': 'Terapkan lintasan yang sama lagi',
  'Reverse the alphabet': 'Balikkan abjadnya',
  'Mirror again': 'Cerminkan lagi',
  'Check the multiplier': 'Periksa pengalinya',
  'Build the cipher alphabet': 'Bangun abjad sandinya',
  'Find the modular inverse': 'Cari invers modularnya',
  'Invert the map': 'Balikkan pemetaannya',
  'Deduplicate the keyword': 'Buang huruf kembar pada kata kuncinya',
  'Complete the alphabet': 'Lengkapi abjadnya',
  'Rebuild the mixed alphabet': 'Bangun ulang abjad campurannya',
  'Substitute in reverse': 'Gantikan secara terbalik',
  'The key is the whole alphabet': 'Kuncinya adalah seluruh abjad itu sendiri',
  'Invert the table': 'Balikkan tabelnya',
  'Index each letter': 'Nomori tiap hurufnya',
  'Join with hyphens': 'Sambung dengan tanda hubung',
  'Split on the separators': 'Belah pada pemisahnya',
  'Convert back to letters': 'Ubah kembali menjadi huruf',
  'Index and write in binary': 'Nomori lalu tulis dalam biner',
  'Relabel the bits': 'Beri nama baru pada bitnya',
  'Keep only the two symbols': 'Pertahankan hanya kedua simbolnya',
  'Read each group as binary': 'Baca tiap kelompok sebagai biner',
  'Lay out the grids': 'Tata kisinya',
  'Draw each cell': 'Gambar tiap selnya',
  'Locate each glyph': 'Temukan tiap bentuknya',
  'Read the letters': 'Baca hurufnya',
  'Fold J into I': 'Lipat J ke dalam I',
  'Read coordinates': 'Baca koordinatnya',
  'Look up each cell': 'Cari tiap selnya',
  'Mix with the keyword': 'Campur dengan kata kuncinya',
  'Rotate by the shift': 'Putar sejauh geserannya',
  'Rebuild the alphabet': 'Bangun ulang abjadnya',
  'Set both alphabets': 'Setel kedua abjadnya',
  'Encipher one letter at a time': 'Sandikan satu huruf pada satu waktu',
  'Permute after every letter': 'Permutasikan setelah tiap huruf',
  'Restore the starting alphabets': 'Pulihkan abjad awalnya',
  'Apply the identical permutation': 'Terapkan permutasi yang sama persis',
  'Read the rails in order': 'Baca relnya berurutan',
  'Work out the rail lengths': 'Hitung panjang tiap relnya',
  'Cut the ciphertext into rails': 'Potong cipherteksnya menjadi rel',
  'Walk the zigzag again': 'Telusuri zigzagnya lagi',
  'Read in that order': 'Baca menurut urutan itu',
  'Restore each rail': 'Pulihkan tiap relnya',
  'Walk the zigzag': 'Telusuri zigzagnya',
  'Fill the grid row by row': 'Isi kisinya baris demi baris',
  'Work out the column heights': 'Hitung tinggi tiap kolomnya',
  'Refill the grid column by column': 'Isi ulang kisinya kolom demi kolom',
  'First transposition': 'Transposisi pertama',
  'Intermediate result': 'Hasil antara',
  'Second transposition': 'Transposisi kedua',
  'Undo the second pass first': 'Batalkan lintasan kedua lebih dulu',
  'Recover the intermediate text': 'Pulihkan teks antaranya',
  'Undo the first pass': 'Batalkan lintasan pertamanya',
  'Fill the grid': 'Isi kisinya',
  'Read rank by rank': 'Baca peringkat demi peringkat',
  'Mark which cells exist': 'Tandai sel mana yang ada',
  'Pour the ciphertext back': 'Tuangkan kembali cipherteksnya',
  'Wind the strip': 'Lilitkan pitanya',
  'Read along the rod': 'Baca sepanjang tongkatnya',
  'Match the rod': 'Cocokkan tongkatnya',
  'Rewind the strip': 'Lilitkan ulang pitanya',
  'Read across': 'Baca melintang',
  'Fill the rectangle': 'Isi persegi panjangnya',
  'Trace the spiral': 'Telusuri spiralnya',
  'Read along the path': 'Baca sepanjang jalurnya',
  'Rebuild the rectangle': 'Bangun ulang persegi panjangnya',
  'Walk the spiral again': 'Telusuri spiralnya lagi',
  'Reverse it': 'Balikkan',
  'Reverse it again': 'Balikkan lagi',
  'Cut into blocks': 'Potong menjadi blok',
  'Rotate each block': 'Putar tiap bloknya',
  'Cut into the same blocks': 'Potong menjadi blok yang sama',
  'Rotate back': 'Putar kembali',
  'Alternate one and two': 'Selang-seling satu dan dua',
  'Rebuild the cell pattern': 'Bangun ulang pola selnya',
  'Pour the ciphertext into the columns': 'Tuangkan cipherteksnya ke dalam kolomnya',
  'First pass leaves a gap': 'Lintasan pertama meninggalkan celah',
  'Second pass closes it': 'Lintasan kedua menutupnya',
  'Reconstruct which cells are occupied': 'Susun ulang sel mana yang terisi',
  'Refill the columns in rank order': 'Isi ulang kolomnya menurut urutan peringkat',
  'Read back along the two passes': 'Baca kembali menyusuri kedua lintasannya',
});

/** Titles that carry a value. Same template machinery as the details. */
const TITLE_TEMPLATE: readonly (readonly [string, string])[] = [
  ['Convert to base {0}', 'Ubah ke basis {0}'],
  ['Write each in base {0}', 'Tulis masing-masing dalam basis {0}'],
  ['Read each as base {0}', 'Baca masing-masing sebagai basis {0}'],
  ['Shift by {0} again', 'Geser sejauh {0} lagi'],
  ['Shift by {0}', 'Geser sejauh {0}'],
];

/* ----------------------------------------------------------------- details */

const DETAIL: Readonly<Record<string, string>> = Object.freeze({
  'Letters only.': 'Hurufnya saja.',
  'C = (K - P) mod 26.': 'C = (K − P) mod 26.',
  'P = (K - C) mod 26 — the identical operation.':
    'P = (K − C) mod 26 — operasi yang sama persis.',
  'C = (P - K) mod 26.': 'C = (P − K) mod 26.',
  'P = (C + K) mod 26.': 'P = (C + K) mod 26.',
  'C = (P + digit) mod 26.': 'C = (P + digit) mod 26.',
  'Letters and digits, uppercased.': 'Huruf dan angka, dibesarkan.',
  'Padded so the length lands on a block boundary.':
    'Diisi supaya panjangnya jatuh tepat di batas bloknya.',
  'Append a 1 bit, pad with zeros, append the 64-bit length, then run 64 rounds over each 512-bit block.':
    'Tambahkan satu bit 1, isi dengan nol, tambahkan panjang 64 bitnya, lalu jalankan 64 putaran atas tiap blok 512 bit.',
  '80 rounds over each 512-bit block, using four different round functions in blocks of twenty.':
    '80 putaran atas tiap blok 512 bit, memakai empat fungsi putaran berbeda dalam kelompok dua puluh.',
  '64 rounds over each 512-bit block, with constants derived from the sine function.':
    '64 putaran atas tiap blok 512 bit, dengan tetapan yang diturunkan dari fungsi sinus.',
  'Shift each byte through the register, conditionally XOR-ing with the reversed polynomial 0xEDB88320.':
    'Geser tiap byte melewati registernya, sambil meng-XOR-kannya secara bersyarat dengan polinomial terbalik 0xEDB88320.',
  'Sixteen-bit register, MSB-first, generator polynomial 0x1021.':
    'Register enam belas bit, MSB lebih dulu, polinomial pembangkit 0x1021.',
  'a = 1 + sum of bytes; b = sum of the running a values; both taken modulo 65521.':
    'a = 1 + jumlah byte-nya; b = jumlah nilai a yang berjalan; keduanya diambil modulo 65521.',
  'For each byte: h ^= byte, then h *= 16777619, all modulo 2³².':
    'Untuk tiap byte: h ^= byte, lalu h *= 16777619, semuanya modulo 2³².',
  'Grouped in fives.': 'Dikelompokkan berlima-lima.',
  'The message.': 'Pesannya.',
  'One byte per character.': 'Satu byte per karakter.',
  'Each group is one character.': 'Tiap kelompok adalah satu karakter.',
  'Same keyword.': 'Kata kunci yang sama.',
  'The final group may be short.': 'Kelompok terakhirnya boleh jadi pendek.',
  'Row then column.': 'Baris dulu, lalu kolom.',
  'PKCS#7.': 'PKCS#7.',
  'The receiver holds the only other copy.': 'Penerimanya memegang satu-satunya salinan yang lain.',
  'Eight bits per character.': 'Delapan bit per karakter.',
  'Fold J into I.': 'Lipat J ke dalam I.',
  'Two digits per byte.': 'Dua digit per byte.',
  'Self-inverse.': 'Invers dirinya sendiri.',
  'Letters only, uppercased.': 'Hurufnya saja, dibesarkan.',
  'P = (C - K) mod 26.': 'P = (C − K) mod 26.',
  'Fold J into I and split into pairs.': 'Lipat J ke dalam I lalu belah berpasangan.',
  'The operation is its own inverse.': 'Operasinya adalah invers dirinya sendiri.',
  'Preparation fillers remain in place.': 'Huruf pengisi dari tahap persiapan masih ada di tempatnya.',
  'Both keywords are needed.': 'Kedua kata kuncinya diperlukan.',
  'Each character becomes its byte value.': 'Tiap karakter menjadi nilai byte-nya.',
  'Padding characters carry no data.': 'Karakter pengisi tidak membawa data.',
  'Read the bit stream back in groups of 8.': 'Baca arus bitnya kembali dalam kelompok 8.',
  'Two digits per byte, always.': 'Dua digit per byte, selalu.',
  'Every two hex digits are one byte.': 'Setiap dua digit heks adalah satu byte.',
  'Byte values back to text.': 'Nilai byte kembali menjadi teks.',
  'Every byte is a base-256 digit of a single integer.':
    'Tiap byte adalah satu digit basis 256 dari sebuah bilangan bulat tunggal.',
  'Repeatedly divide, collecting remainders from the bottom up.':
    'Bagi berulang-ulang, kumpulkan sisanya dari bawah ke atas.',
  'Unlike bit-packed encodings, this has no fixed block boundary.':
    'Tidak seperti penyandian berkemas bit, yang ini tidak punya batas blok yang tetap.',
  'Multiply and accumulate.': 'Kalikan lalu tumpuk.',
  'Each remainder is one byte.': 'Tiap sisanya adalah satu byte.',
  'Big-endian.': 'Big-endian.',
  'Five digits, offset to printable ASCII starting at "!".':
    'Lima digit, digeser ke ASCII tercetak mulai dari "!".',
  'A group of n bytes emits n+1 characters, so nothing is padded.':
    'Satu kelompok berisi n byte menghasilkan n+1 karakter, jadi tidak ada yang perlu diisi.',
  'Missing positions are filled with "u", the highest digit, then discarded after conversion.':
    'Posisi yang kosong diisi "u", digit tertingginya, lalu dibuang setelah pengubahan.',
  'Each group yields four bytes; a short group yields fewer.':
    'Tiap kelompok menghasilkan empat byte; kelompok pendek menghasilkan lebih sedikit.',
  'Standard ASCII values.': 'Nilai ASCII baku.',
  'Then map the code point back to a character.': 'Lalu petakan titik kodenya kembali menjadi karakter.',
  'Letters, digits, hyphen, underscore, period and tilde pass through untouched.':
    'Huruf, angka, tanda hubung, garis bawah, titik dan tilde lewat tanpa disentuh.',
  'Percent sign followed by the two-digit hex code.':
    'Tanda persen disusul kode heks dua digitnya.',
  'Each is a percent sign and exactly two hex digits.':
    'Masing-masing adalah tanda persen dan tepat dua digit heks.',
  'Everything else is already literal.': 'Selebihnya sudah harfiah.',
  'Decimal ASCII values.': 'Nilai ASCII desimal.',
  'Ampersand, hash, digits, semicolon.': 'Ampersand, pagar, angka, titik koma.',
  'The pattern &#digits; delimits each one unambiguously.':
    'Pola &#angka; membatasi masing-masing tanpa kerancuan.',
  'Code point back to character.': 'Titik kode kembali menjadi karakter.',
  'Codes 33-126, except the equals sign itself.': 'Kode 33-126, kecuali tanda sama dengan itu sendiri.',
  'Equals sign followed by two uppercase hex digits.':
    'Tanda sama dengan disusul dua digit heks huruf besar.',
  'Equals sign plus two hex digits.': 'Tanda sama dengan ditambah dua digit heks.',
  'Everything else was already literal.': 'Selebihnya memang sudah harfiah.',
  'Letters and digits.': 'Huruf dan angka.',
  'Frequent letters have the shortest codes.': 'Huruf yang sering muncul mendapat kode terpendek.',
  'Without a separator the stream is ambiguous.': 'Tanpa pemisah, arusnya menjadi rancu.',
  'The code is a prefix-free tree, so no group is ambiguous.':
    'Kodenya berupa pohon bebas awalan, jadi tidak ada kelompok yang rancu.',
  'A 5×5 grid holds only 25 letters.': 'Kisi 5×5 hanya memuat 25 huruf.',
  'Row and column, both counted from one.': 'Baris dan kolom, keduanya dihitung mulai dari satu.',
  'Row taps, a pause, then column taps.': 'Ketukan baris, satu jeda, lalu ketukan kolom.',
  'Two groups per letter, separated by a pause.': 'Dua kelompok per huruf, dipisahkan satu jeda.',
  'Chosen so no two can be confused over a noisy channel.':
    'Dipilih supaya tidak ada dua yang tertukar di saluran yang berderau.',
  'One word per letter.': 'Satu kata per huruf.',
  'The word maps back to the letter it names.': 'Katanya dipetakan kembali ke huruf yang disebutnya.',
  'A→4, B→8, E→3, G→6, I→1, O→0, S→5, T→7, Z→2.': 'A→4, B→8, E→3, G→6, I→1, O→0, S→5, T→7, Z→2.',
  'Each digit stands for exactly one letter.': 'Tiap angka mewakili tepat satu huruf.',
  'Six positions per cell, two columns of three.': 'Enam posisi per sel, dua kolom berisi tiga.',
  'One Unicode braille cell per letter.': 'Satu sel braille Unicode per huruf.',
  'Dot pattern back to letter.': 'Pola titik kembali menjadi huruf.',
  'Shift right by one and exclusive-or with the original.':
    'Geser ke kanan satu lalu exclusive-or dengan aslinya.',
  'Adjacent code values now differ in exactly one bit.':
    'Nilai kode yang bertetangga kini berbeda tepat pada satu bit.',
  'Eight bits each.': 'Delapan bit masing-masing.',
  'Unlike encoding, inversion needs every higher bit to resolve each lower one.':
    'Tidak seperti penyandiannya, pembalikannya memerlukan setiap bit yang lebih tinggi untuk menentukan bit di bawahnya.',
  'One pose per letter, twenty-six in all.': 'Satu pose per huruf, dua puluh enam seluruhnya.',
  'Frequency analysis breaks it exactly as it breaks any substitution.':
    'Analisis frekuensi membobolnya persis seperti ia membobol substitusi mana pun.',
  'The most common one is almost certainly E.': 'Yang paling sering muncul hampir pasti E.',
  'Pose back to letter.': 'Pose kembali menjadi huruf.',
  'Each grille holds sixteen letters.': 'Tiap kartu berlubang memuat enam belas huruf.',
  'One cell per rotation orbit, so four turns expose all sixteen cells exactly once.':
    'Satu sel per orbit putaran, jadi empat putaran menyingkapkan keenam belas selnya tepat sekali.',
  'Fill the visible cells in reading order, then turn the card.':
    'Isi sel yang terlihat menurut urutan baca, lalu putar kartunya.',
  'Left to right, top to bottom.': 'Kiri ke kanan, atas ke bawah.',
  'The ciphertext goes back in reading order.': 'Cipherteksnya dimasukkan kembali menurut urutan baca.',
  'Read the visible cells, turn, and read again.': 'Baca sel yang terlihat, putar, lalu baca lagi.',
  'Padding letters remain at the end.': 'Huruf pengisinya tetap tertinggal di ujung.',
  'The same ranking drives both permutations.': 'Peringkat yang sama menggerakkan kedua permutasinya.',
  'Every letter moves twice.': 'Setiap huruf berpindah dua kali.',
  'Same ranking.': 'Peringkat yang sama.',
  'Move row and column order[i] back to position i.':
    'Kembalikan baris dan kolom order[i] ke posisi i.',
  'Padding remains at the end.': 'Pengisinya tetap tertinggal di ujung.',
  'Two at a time; a lone trailing byte is handled separately.':
    'Dua sekaligus; satu byte tersisa di ujung ditangani terpisah.',
  'Big-endian, so the value is under 65536.': 'Big-endian, jadi nilainya di bawah 65536.',
  'Three digits per pair, two for a single trailing byte.':
    'Tiga digit per pasangan, dua untuk satu byte tersisa di ujung.',
  'Uses only characters QR alphanumeric mode supports.':
    'Hanya memakai karakter yang didukung mode alfanumerik QR.',
  'A trailing group of two encodes one byte.': 'Kelompok dua di ujung menyandikan satu byte.',
  'c + d×45 + e×2025.': 'c + d×45 + e×2025.',
  'High byte then low byte.': 'Byte tinggi dulu, lalu byte rendah.',
  '24 bits at a time.': '24 bit sekaligus.',
  'Each covers 0 to 63.': 'Masing-masing menutupi 0 sampai 63.',
  'Lands in printable ASCII. A zero would become a space, so a backtick is used instead.':
    'Mendarat di ASCII tercetak. Nol akan menjadi spasi, jadi tanda petik miring dipakai sebagai gantinya.',
  'The first character gives the number of bytes on the line.':
    'Karakter pertamanya menyatakan cacah byte pada baris itu.',
  'Recovers the six-bit values.': 'Memulihkan nilai enam bitnya.',
  'Four six-bit values give three bytes; trim to the stated length.':
    'Empat nilai enam bit memberi tiga byte; pangkas sampai panjang yang dinyatakan.',
  'Each round: shift, XOR, add, then combine with a key word chosen by the running sum.':
    'Tiap putaran: geser, XOR, jumlahkan, lalu padukan dengan kata kunci yang dipilih oleh jumlah berjalannya.',
  'The index comes from two different slices of the sum, which is what removes the equivalent-key weakness.':
    'Indeksnya diambil dari dua irisan jumlah yang berbeda, dan itulah yang menghapus kelemahan kunci setara.',
  'The sum starts at its final value and counts down.':
    'Jumlahnya dimulai dari nilai akhirnya lalu menghitung mundur.',
  'The last byte gives the count.': 'Byte terakhirnya menyatakan cacahnya.',
  'One per character.': 'Satu untuk tiap karakter.',
  'Random, used once, then destroyed.': 'Acak, dipakai sekali, lalu dimusnahkan.',
  'Every output bit is independent of the message bit given the pad.':
    'Setiap bit keluarannya bebas dari bit pesannya bila pad-nya diketahui.',
  'Perfect secrecy, provided the three conditions hold.':
    'Kerahasiaan sempurna, asalkan ketiga syaratnya terpenuhi.',
  'Recovers the message.': 'Memulihkan pesannya.',
  'Zero becomes a space, one becomes a tab.': 'Nol menjadi spasi, satu menjadi tab.',
  'Everything else is ignored.': 'Selebihnya diabaikan.',
  'U+200B zero-width space for 0, U+200C zero-width non-joiner for 1.':
    'U+200B zero-width space untuk 0, U+200C zero-width non-joiner untuk 1.',
  'Visible text is discarded.': 'Teks yang terlihat dibuang.',
  'Every word begins with the letter it carries.':
    'Setiap kata dimulai dengan huruf yang dibawanya.',
  'The cover reads as shipping correspondence; the initials carry the payload.':
    'Teks penyamarnya terbaca sebagai surat pengiriman barang; huruf awalnyalah yang membawa muatannya.',
  'The rest of the text is decoration.': 'Sisa teksnya hanyalah hiasan.',
  'A=00000 … Z=11001.': 'A=00000 … Z=11001.',
  'The group 11111 is 31, past the end of the alphabet, so the reader knows where the payload stops.':
    'Kelompok 11111 bernilai 31, melewati ujung abjadnya, jadi pembacanya tahu di mana muatannya berhenti.',
  'Uppercase for 1, lowercase for 0.': 'Huruf besar untuk 1, huruf kecil untuk 0.',
  'The cover reads normally; only its capitalisation carries the payload.':
    'Teks penyamarnya terbaca biasa; hanya besar-kecil hurufnya yang membawa muatan.',
  'Uppercase is 1, lowercase is 0.': 'Huruf besar adalah 1, huruf kecil adalah 0.',
  'Each group is one hidden letter.': 'Tiap kelompok adalah satu huruf tersembunyi.',
  'Values above 25 mark the end of the payload.':
    'Nilai di atas 25 menandai akhir muatannya.',
  'Each new pair is a fresh coordinate, giving a new letter.':
    'Tiap pasangan baru adalah koordinat baru, yang memberi huruf baru.',
  'The first half is the row numbers, the second half the columns.':
    'Separuh pertamanya nomor baris, separuh keduanya nomor kolom.',
  'Pair row i with column i to recover each letter.':
    'Pasangkan baris ke-i dengan kolom ke-i untuk memulihkan tiap hurufnya.',
  'Twenty-seven cells: the keyed alphabet plus one filler, arranged 3×3×3.':
    'Dua puluh tujuh sel: abjad berkunci ditambah satu pengisi, disusun 3×3×3.',
  'Each new triple addresses a cell in the cube.':
    'Tiap tripel baru menunjuk satu sel di dalam kubusnya.',
  'Layers, then rows, then columns.': 'Lapisan, lalu baris, lalu kolom.',
  'Take the i-th value from each third to address one cell.':
    'Ambil nilai ke-i dari tiap sepertiganya untuk menunjuk satu sel.',
  'Each character becomes its row label followed by its column label.':
    'Tiap karakter menjadi label barisnya disusul label kolomnya.',
  'Every two label letters address one cell.':
    'Setiap dua huruf label menunjuk satu sel.',
  'Row then column, as a two-digit value.': 'Baris lalu kolom, sebagai nilai dua digit.',
  'Tens digit is the row, units digit is the column.':
    'Digit puluhannya adalah baris, digit satuannya adalah kolom.',
  'Eight letters on the top row cost one digit; the rest cost two.':
    'Delapan huruf di baris atas berharga satu digit; sisanya berharga dua.',
  'Frequent letters are cheap, rare letters are not.':
    'Huruf yang sering muncul murah, huruf yang jarang tidak.',
  'A digit stream with no visible letter boundaries.':
    'Arus digit tanpa batas huruf yang terlihat.',
  'The keyword and the two gateway digits define it completely.':
    'Kata kunci dan kedua digit gerbangnya menentukannya sepenuhnya.',
  'The digest depends on every one of them.': 'Ringkasannya bergantung pada setiap satu di antaranya.',
  'Fixed length regardless of input size. Changing a single input bit changes roughly half the output bits.':
    'Panjangnya tetap berapa pun ukuran masukannya. Mengubah satu bit masukan mengubah kira-kira separuh bit keluarannya.',
  'A hash discards information by design — many inputs map to the same digest, so there is nothing to invert.':
    'Sebuah hash memang dirancang membuang informasi — banyak masukan dipetakan ke ringkasan yang sama, jadi tidak ada yang dapat dibalik.',
  'Deterministic, so repeated characters are visible as repeated numbers — a real weakness.':
    'Deterministik, jadi karakter yang berulang terlihat sebagai angka yang berulang — kelemahan yang sungguhan.',
  'e is not invertible modulo φ(n).': 'e tidak dapat dibalik modulo φ(n).',
  'Both exponents stay secret, so this is symmetric.':
    'Kedua eksponennya tetap rahasia, jadi ini simetris.',
  'e is not invertible modulo p−1.': 'e tidak dapat dibalik modulo p−1.',
  'Derived from the position here so the result is reproducible; random in practice.':
    'Diturunkan dari posisinya di sini supaya hasilnya terulang; acak dalam praktiknya.',
  'Send the pair (g^k mod p, m · y^k mod p).': 'Kirim pasangan (g^k mod p, m · y^k mod p).',
  'Each character becomes two numbers — the ciphertext doubles in size.':
    'Tiap karakter menjadi dua angka — cipherteksnya berlipat dua ukurannya.',
  'Raise the first component to the private exponent: s = c₁ˣ mod p.':
    'Pangkatkan komponen pertamanya dengan eksponen pribadinya: s = c₁ˣ mod p.',
  "Since p is prime, s⁻¹ = s^(p−2) mod p by Fermat's little theorem.":
    'Karena p prima, s⁻¹ = s^(p−2) mod p menurut teorema kecil Fermat.',
  'm = c₂ · s⁻¹ mod p.': 'm = c₂ · s⁻¹ mod p.',
  'The digits of the shared value are cycled as additive shifts over printable ASCII.':
    'Digit nilai bersamanya diputar sebagai geseran penjumlahan atas ASCII tercetak.',
  'The agreement is the real cryptography; this last step is only to make it visible.':
    'Persetujuannya itulah kriptografi yang sebenarnya; langkah terakhir ini hanya membuatnya terlihat.',
  'Reverses the additive shift.': 'Membalikkan geseran penjumlahannya.',
  'Output bytes are usually unprintable, so they are shown as hex.':
    'Byte keluarannya biasanya tidak tercetak, jadi ditampilkan sebagai heksadesimal.',
  'XOR undoes itself.': 'XOR membatalkan dirinya sendiri.',
  'Byte i is combined with key byte i mod keylength.':
    'Byte ke-i dipadukan dengan byte kunci ke-i mod panjang kunci.',
  'Repetition at the key length is what an attacker looks for.':
    'Pengulangan pada panjang kuncinya itulah yang dicari penyerang.',
  'S starts as 0 through 255 in order.': 'S dimulai dari 0 sampai 255 berurutan.',
  'Walk i from 0 to 255, advance j by S[i] plus a key byte, and swap.':
    'Jalankan i dari 0 sampai 255, majukan j sebesar S[i] ditambah satu byte kunci, lalu tukar.',
  'Keep swapping and emit S[(S[i]+S[j]) mod 256] each step.':
    'Terus menukar dan keluarkan S[(S[i]+S[j]) mod 256] di tiap langkah.',
  'Same as any stream cipher.': 'Sama seperti sandi arus mana pun.',
  'The key alone determines it.': 'Kuncinya sendirilah yang menentukannya.',
  'Stream ciphers are symmetric in the plainest sense.':
    'Sandi arus bersifat simetris dalam pengertian yang paling sederhana.',
  'Constants "expand 32-byte k", then the key, the counter, and the nonce.':
    'Tetapan "expand 32-byte k", lalu kuncinya, pencacahnya, dan nonce-nya.',
  'Ten double-rounds, each four column quarter-rounds then four diagonal ones.':
    'Sepuluh putaran ganda, masing-masing empat seperempat-putaran kolom lalu empat yang diagonal.',
  'Without this feed-forward the permutation would be invertible and the cipher worthless.':
    'Tanpa umpan-maju ini permutasinya dapat dibalik dan sandinya tidak berguna.',
  '64 bytes per block.': '64 byte per blok.',
  'Key, nonce and counter reproduce it exactly.':
    'Kunci, nonce dan pencacahnya menghasilkannya kembali secara persis.',
  'Recovers the plaintext.': 'Memulihkan teks aslinya.',
  'PKCS#7 padding brings the length to a multiple of 8 bytes.':
    'Pengisi PKCS#7 membawa panjangnya ke kelipatan 8 byte.',
  'Two 32-bit halves per block.': 'Dua belahan 32 bit per blok.',
  'Each round mixes one half into the other using shifts, additions and XOR, driven by a running sum of the golden-ratio constant 0x9E3779B9.':
    'Tiap putaran mencampur satu belahan ke belahan lainnya memakai penggeseran, penjumlahan dan XOR, digerakkan oleh jumlah berjalan dari tetapan rasio emas 0x9E3779B9.',
  'Electronic codebook mode — identical blocks encrypt identically, which is why nobody should use it this way in production.':
    'Mode electronic codebook — blok yang sama tersandikan sama, dan itulah sebabnya tidak seorang pun boleh memakainya begini di lingkungan sungguhan.',
  'The running sum starts at its final value and counts down.':
    'Jumlah berjalannya dimulai dari nilai akhirnya lalu menghitung mundur.',
  'The last byte says how many padding bytes to remove.':
    'Byte terakhirnya menyatakan berapa byte pengisi yang harus dibuang.',
  'Eleven round keys are derived from the 128-bit key.':
    'Sebelas kunci putaran diturunkan dari kunci 128 bitnya.',
  'XOR with the previous ciphertext block, or the IV for the first.':
    'XOR dengan blok cipherteks sebelumnya, atau dengan vektor awal untuk yang pertama.',
  'No chaining — that is the weakness.': 'Tanpa perantaian — itulah kelemahannya.',
  'SubBytes, ShiftRows, MixColumns, AddRoundKey. The final round omits MixColumns.':
    'SubBytes, ShiftRows, MixColumns, AddRoundKey. Putaran terakhirnya melewatkan MixColumns.',
  'Same eleven round keys.': 'Sebelas kunci putaran yang sama.',
  'InvShiftRows, InvSubBytes, AddRoundKey, InvMixColumns.':
    'InvShiftRows, InvSubBytes, AddRoundKey, InvMixColumns.',
  'XOR each decrypted block with the previous ciphertext block.':
    'XOR-kan tiap blok yang sudah dibaca dengan blok cipherteks sebelumnya.',
  'Each block stands alone.': 'Tiap blok berdiri sendiri.',
  'The final byte gives the padding length.': 'Byte terakhirnya menyatakan panjang pengisinya.',
  'The key repeats until it covers the whole message.':
    'Kuncinya berulang sampai menutupi seluruh pesannya.',
  'Grouped in fives for transmission.': 'Dikelompokkan berlima-lima untuk pengiriman.',
  'Strip the transmission spacing.': 'Buang spasi pengirimannya.',
  'Same key, same repetition.': 'Kunci yang sama, pengulangan yang sama.',
  'Position i uses row i of the table.': 'Posisi ke-i memakai baris ke-i pada tabelnya.',
  'C = (P + i) mod 26.': 'C = (P + i) mod 26.',
  'P = (C - i) mod 26.': 'P = (C − i) mod 26.',
  'C = (P + K) mod 26, exactly as Vigenère.': 'C = (P + K) mod 26, persis seperti Vigenère.',
  'The keystream never repeats, so there is no period to detect.':
    'Arus kuncinya tidak pernah berulang, jadi tidak ada periode yang dapat dideteksi.',
  'Each recovered plaintext letter becomes the next key letter, so decryption unrolls the keystream one character at a time.':
    'Tiap huruf asli yang dipulihkan menjadi huruf kunci berikutnya, jadi pembacaannya membuka arus kuncinya satu karakter pada satu waktu.',
  'Agreed in advance — a book, a page, a line.':
    'Disepakati sebelumnya — sebuah buku, sebuah halaman, sebuah baris.',
  'C = (P + K) mod 26 against the passage.': 'C = (P + K) mod 26 terhadap bacaannya.',
  'No repeating period exists in the key.': 'Tidak ada periode berulang di dalam kuncinya.',
  'The receiver holds the same book and page.':
    'Penerimanya memegang buku dan halaman yang sama.',
  'C = (P + K) mod 26.': 'C = (P + K) mod 26.',
  'Reuse is what broke Venona. One message, one pad.':
    'Pemakaian ulanglah yang membobol Venona. Satu pesan, satu pad.',
  'A/B select row 0, C/D row 1, up to Y/Z at row 12.':
    'A/B memilih baris 0, C/D baris 1, sampai Y/Z di baris 12.',
  'A letter from A–M becomes one from N–Z and the reverse, using the rotated bottom row.':
    'Huruf dari A–M menjadi huruf dari N–Z dan sebaliknya, memakai baris bawah yang sudah diputar.',
  'Every row is reciprocal, so this table also decrypts.':
    'Setiap barisnya timbal balik, jadi tabel ini juga membaca kembali.',
  'Porta rows are reciprocal, so decryption is the same operation as encryption.':
    'Baris Porta bersifat timbal balik, jadi pembacaannya adalah operasi yang sama dengan penyandiannya.',
  'Same pairing as the sender used.': 'Pasangan yang sama dengan yang dipakai pengirimnya.',
  'The swap undoes itself.': 'Penukarannya membatalkan dirinya sendiri.',
  'Each key letter selects how far the ciphertext alphabet is rotated.':
    'Tiap huruf kunci memilih sejauh mana abjad cipherteksnya diputar.',
  'Index the plain letter in the plaintext alphabet, add the rotation, read from the ciphertext alphabet.':
    'Cari nomor huruf aslinya di abjad teks asli, tambahkan perputarannya, lalu baca dari abjad cipherteks.',
  'Same keywords as the sender.': 'Kata kunci yang sama dengan pengirimnya.',
  'Same repetition.': 'Pengulangan yang sama.',
  'Index the cipher letter, subtract the rotation, read from the plaintext alphabet.':
    'Cari nomor huruf sandinya, kurangkan perputarannya, lalu baca dari abjad teks asli.',
  'A mixed alphabet built from the keyword.':
    'Abjad campuran yang dibangun dari kata kuncinya.',
  'Read the outer letter, take the inner letter at the offset position.':
    'Baca huruf luarnya, ambil huruf dalam pada posisi geserannya.',
  'Same keyword, same starting position.': 'Kata kunci yang sama, posisi awal yang sama.',
  'Find the letter on the inner disk, read the outer letter at that offset.':
    'Temukan hurufnya di cakram dalam, baca huruf luar pada geseran itu.',
  'Rotor order and starting positions are the day key.':
    'Urutan rotor dan posisi awalnya adalah kunci harinya.',
  'Rotors advance before the current flows, so the first letter already uses a moved position.':
    'Rotornya maju sebelum arus mengalir, jadi huruf pertamanya sudah memakai posisi yang bergerak.',
  'Right rotor, middle, left, reflector, then back out through all three.':
    'Rotor kanan, tengah, kiri, reflektor, lalu keluar kembali melewati ketiganya.',
  'Same rotors, same starting positions.': 'Rotor yang sama, posisi awal yang sama.',
  'The reflector makes the machine reciprocal, so this is the same operation as encryption.':
    'Reflektornya membuat mesin itu timbal balik, jadi ini operasi yang sama dengan penyandiannya.',
  'Fold J into I, split into pairs, break any doubled pair with a filler, pad an odd tail.':
    'Lipat J ke dalam I, belah berpasangan, pisahkan pasangan kembar dengan huruf pengisi, dan isi ekor yang ganjil.',
  'Same row, same column, or opposite corners.':
    'Sebaris, sekolom, atau sudut yang berseberangan.',
  'Same row moves left, same column moves up, rectangles swap back the same way.':
    'Yang sebaris bergerak ke kiri, yang sekolom bergerak ke atas, dan persegi panjangnya bertukar kembali dengan cara yang sama.',
  'Fillers inserted during preparation are still present and have to be read around.':
    'Huruf pengisi yang disisipkan saat persiapan masih ada dan harus dilewati saat membaca.',
  'Upper square holds the first letter, lower square the second.':
    'Kisi atas memuat huruf pertama, kisi bawah memuat yang kedua.',
  'Keep each row, exchange the columns between the two squares.':
    'Pertahankan tiap barisnya, pertukarkan kolomnya antara kedua kisi.',
  'Same two keywords.': 'Dua kata kunci yang sama.',
  'Plain alphabets on the diagonal, keyed squares off it.':
    'Abjad polos di diagonalnya, kisi berkunci di luar diagonal.',
  'First letter gives a row, second letter gives a column, and vice versa.':
    'Huruf pertama memberi baris, huruf kedua memberi kolom, dan sebaliknya.',
  'No digraph can pass through unchanged.':
    'Tidak ada pasangan huruf yang dapat lewat tanpa berubah.',
  'Locate the pair in the keyed squares, read out of the plain ones.':
    'Temukan pasangannya di kisi berkunci, baca keluar dari kisi polosnya.',
  'The determinant must be coprime with 26 or the matrix cannot be inverted.':
    'Determinannya harus koprima dengan 26 atau matriksnya tidak dapat dibalik.',
  'Treat the block as a column vector and reduce the product modulo 26.':
    'Perlakukan bloknya sebagai vektor kolom lalu kecilkan hasil kalinya modulo 26.',
  'The determinant is not coprime with 26, so no inverse exists.':
    'Determinannya tidak koprima dengan 26, jadi tidak ada inversnya.',
  'Compute the adjugate, then scale it by the inverse of the determinant.':
    'Hitung adjugatnya, lalu skalakan dengan invers determinannya.',
  'Any X padding added during preparation is still present at the end.':
    'Pengisi X yang ditambahkan saat persiapan masih ada di ujungnya.',
  'Strip everything that is not a letter and uppercase the rest.':
    'Buang segala yang bukan huruf dan besarkan sisanya.',
  'Classical ciphertext is transmitted in five-letter groups.':
    'Cipherteks klasik dikirim dalam kelompok lima huruf.',
  'Remove the transmission spacing.': 'Hilangkan spasi pengirimannya.',
  'Substitute back through the reversed pairing.':
    'Gantikan kembali lewat pasangan yang dibalik.',
  'The key is fixed, so there is nothing to guess.':
    'Kuncinya tetap, jadi tidak ada yang perlu ditebak.',
  'Applying the same shift again would undo this.':
    'Menerapkan geseran yang sama sekali lagi akan membatalkan ini.',
  'Everything that is not 0-9 is discarded.': 'Segala yang bukan 0-9 dibuang.',
  'D = (d + 5) mod 10.': 'D = (d + 5) mod 10.',
  'Self-inverse on a ring of ten.': 'Invers dirinya sendiri pada lingkaran sepuluh.',
  'Codes 33 (!) through 126 (~).': 'Kode 33 (!) sampai 126 (~).',
  'C = 33 + ((code - 33 + 47) mod 94).': 'C = 33 + ((kode − 33 + 47) mod 94).',
  'Half of 94, so a second pass restores the input.':
    'Separuh dari 94, jadi lintasan kedua memulihkan masukannya.',
  Uppercased: 'Dibesarkan',
  'Uppercased.': 'Dibesarkan.',
  'Letters take a shift of 13; digits take a shift of 5.':
    'Huruf memakai geseran 13; angka memakai geseran 5.',
  'Both halves are self-inverse.': 'Kedua belahannya adalah invers dirinya sendiri.',
  'C = 25 - P.': 'C = 25 − P.',
  'Each letter takes its mirror.': 'Tiap huruf mengambil cerminannya.',
  'Grouped for transmission.': 'Dikelompokkan untuk pengiriman.',
  'Atbash undoes itself.': 'Atbash membatalkan dirinya sendiri.',
  'Read each plaintext letter through that alphabet.':
    'Baca tiap huruf asli lewat abjad itu.',
  'Append every letter the keyword did not use, in order.':
    'Tambahkan setiap huruf yang tidak terpakai kata kuncinya, berurutan.',
  'Read each letter through the mixed alphabet.':
    'Baca tiap huruf lewat abjad campurannya.',
  'Find each ciphertext letter in the mixed alphabet and read the plain letter above it.':
    'Temukan tiap huruf cipherteks di abjad campurannya dan baca huruf asli di atasnya.',
  'One arbitrary permutation, 26! in total.': 'Satu permutasi bebas, 26! seluruhnya.',
  'Straight table lookup.': 'Pencarian tabel langsung.',
  'Swap the two rows.': 'Tukar kedua barisnya.',
  'Look each ciphertext letter up in the cipher row.':
    'Cari tiap huruf cipherteks di baris sandinya.',
  'A=1 … Z=26.': 'A=1 … Z=26.',
  'The separator resolves the two-digit ambiguity.':
    'Pemisahnya menyelesaikan kerancuan dua digitnya.',
  'Each group is one letter index.': 'Tiap kelompok adalah satu nomor huruf.',
  '1=A … 26=Z.': '1=A … 26=Z.',
  'A=0 … Z=25, padded to five bits.': 'A=0 … Z=25, diisi sampai lima bit.',
  '0 becomes A, 1 becomes B.': '0 menjadi A, 1 menjadi B.',
  'Everything else is decoration.': 'Selebihnya hanyalah hiasan.',
  'A=0, B=1, five bits per letter.': 'A=0, B=1, lima bit per huruf.',
  'Two tic-tac-toe grids and two X grids hold 26 cells between them.':
    'Dua kisi tic-tac-toe dan dua kisi X bersama-sama memuat 26 sel.',
  'Replace the letter with the lines that enclose it.':
    'Ganti hurufnya dengan garis-garis yang mengurungnya.',
  'Find which grid cell the drawing corresponds to.':
    'Temukan sel kisi mana yang bersesuaian dengan gambarnya.',
  'Cell position gives the letter.': 'Posisi selnya memberi hurufnya.',
  'A 5×5 grid holds 25 cells, so two letters must share one.':
    'Kisi 5×5 memuat 25 sel, jadi dua huruf harus berbagi satu sel.',
  'Row first, then column.': 'Baris dulu, lalu kolom.',
  'Each letter is now two digits.': 'Tiap huruf kini menjadi dua digit.',
  'Every two digits are one coordinate.': 'Setiap dua digit adalah satu koordinat.',
  'Table lookup.': 'Pencarian tabel.',
  'Reverse lookup.': 'Pencarian terbalik.',
  'Left carries ciphertext, right carries plaintext.':
    'Yang kiri membawa cipherteks, yang kanan membawa teks asli.',
  'Find the plain letter in the right alphabet; the left alphabet at the same index gives the cipher letter.':
    'Temukan huruf aslinya di abjad kanan; abjad kiri pada nomor yang sama memberi huruf sandinya.',
  'Left: rotate the used letter to the top, lift position 2 and reinsert at 14. Right: rotate to the top, advance one more, lift position 3 and reinsert at 14.':
    'Kiri: putar huruf yang terpakai ke puncak, angkat posisi 2 dan sisipkan kembali di 14. Kanan: putar ke puncak, maju satu lagi, angkat posisi 3 dan sisipkan kembali di 14.',
  'The alphabets never repeat a state, so the cipher resists frequency analysis.':
    'Abjadnya tidak pernah mengulang keadaan yang sama, jadi sandinya tahan terhadap analisis frekuensi.',
  'Find the cipher letter on the left; read the plain letter at the same index on the right.':
    'Temukan huruf sandinya di sebelah kiri; baca huruf aslinya pada nomor yang sama di sebelah kanan.',
  'Sender and receiver stay in step because the permutation depends only on the index, not on direction.':
    'Pengirim dan penerima tetap seirama karena permutasinya hanya bergantung pada nomor urutnya, bukan pada arahnya.',
  'Top rail first, then the next, and so on.': 'Rel teratas dulu, lalu berikutnya, dan seterusnya.',
  'The zigzag pattern depends only on the length and the rail count.':
    'Pola zigzagnya hanya bergantung pada panjangnya dan cacah relnya.',
  'Each rail takes its share, in order.': 'Tiap rel mengambil bagiannya, berurutan.',
  'Read one letter from the appropriate rail at each step.':
    'Baca satu huruf dari rel yang sesuai di tiap langkahnya.',
  'Rails are sent in keyword order, not top to bottom.':
    'Relnya dikirim menurut urutan kata kunci, bukan dari atas ke bawah.',
  'Rail lengths follow from the zigzag geometry.':
    'Panjang relnya mengikuti dari bentuk zigzagnya.',
  'Read the message back off the fence.': 'Baca kembali pesannya dari pagarnya.',
  'Alphabetical order; ties break left to right.':
    'Urutan abjad; yang seri dipisahkan dari kiri ke kanan.',
  'Column ranked 1 first, then 2, and so on.':
    'Kolom berperingkat 1 dulu, lalu 2, dan seterusnya.',
  'Same ranking the sender used.': 'Peringkat yang sama dengan yang dipakai pengirimnya.',
  'Divide the length by the width; the remainder tells you which columns carry an extra letter.':
    'Bagi panjangnya dengan lebarnya; sisanya memberitahu kolom mana yang membawa satu huruf tambahan.',
  'Pour the ciphertext back in, rank order first.':
    'Tuangkan kembali cipherteksnya, menurut urutan peringkat lebih dulu.',
  'This is what enters the second pass.': 'Inilah yang masuk ke lintasan kedua.',
  'Two passes with unrelated keys.': 'Dua lintasan dengan kunci yang tak berkaitan.',
  'This is what the first pass produced.': 'Inilah yang dihasilkan lintasan pertama.',
  'A lone column is read straight down. Tied columns are read together, left to right across each row.':
    'Kolom yang berdiri sendiri dibaca lurus ke bawah. Kolom yang seri dibaca bersamaan, dari kiri ke kanan di sepanjang tiap baris.',
  'The final row is short, so some cells are empty.':
    'Baris terakhirnya pendek, jadi sebagian selnya kosong.',
  'Rank by rank, interleaving the tied columns exactly as the sender did.':
    'Peringkat demi peringkat, menyelang-nyelingkan kolom yang seri persis seperti yang dilakukan pengirimnya.',
  'Take every letter in the same position on each turn.':
    'Ambil setiap huruf pada posisi yang sama di tiap lilitannya.',
  'Off the rod, the order looks arbitrary.':
    'Lepas dari tongkatnya, urutannya tampak sembarang.',
  'Letters fall back into their original rows.':
    'Hurufnya jatuh kembali ke barisnya semula.',
  'Start top-left, go right across the top, down the right side, back along the bottom, up the left, then inward.':
    'Mulai dari kiri atas, ke kanan menyusuri sisi atas, turun di sisi kanan, kembali menyusuri sisi bawah, naik di sisi kiri, lalu masuk ke dalam.',
  'Empty cells in the short final row are skipped.':
    'Sel kosong di baris terakhir yang pendek dilewati.',
  'Drop the ciphertext letters back along the same path.':
    'Jatuhkan kembali huruf cipherteksnya menyusuri jalur yang sama.',
  'Last letter first.': 'Huruf terakhir lebih dulu.',
  'The operation undoes itself.': 'Operasinya membatalkan dirinya sendiri.',
  'Rejoined.': 'Disambung kembali.',
  'The opposite direction restores each block.':
    'Arah sebaliknya memulihkan tiap bloknya.',
  'Row 1 takes 1, 2, 1, 2 …; row 2 starts with 2 and alternates the other way.':
    'Baris 1 mengambil 1, 2, 1, 2 …; baris 2 mulai dengan 2 dan berselang-seling sebaliknya.',
  'Whole cells travel together, so pairs stay glued.':
    'Sel utuh berpindah bersama, jadi pasangannya tetap melekat.',
  'It depends only on the width and the message length, both of which you have.':
    'Ia hanya bergantung pada lebarnya dan panjang pesannya, dan keduanya sudah Anda punya.',
  'Each column absorbs exactly as many letters as its cells demand.':
    'Tiap kolom menyerap huruf tepat sebanyak yang dituntut selnya.',
  'Each row starts at an offset taken from the key ranks.':
    'Tiap baris dimulai pada geseran yang diambil dari peringkat kuncinya.',
  'The skipped cells are filled once the first pass runs out.':
    'Sel yang dilewati diisi begitu lintasan pertamanya habis.',
  'As with ordinary columnar work.': 'Seperti pada pengerjaan kolom biasa.',
  'The gap pattern follows from the key and the length, so it can be rebuilt exactly.':
    'Pola celahnya mengikuti dari kuncinya dan panjangnya, jadi ia dapat dibangun ulang secara persis.',
  'Only occupied cells take a letter.': 'Hanya sel yang terisi yang menerima huruf.',
  'First pass first, then the cells that were skipped.':
    'Lintasan pertama dulu, lalu sel-sel yang dilewati.',
});

/* --------------------------------------------------- details carrying a value */

const DETAIL_TEMPLATE: readonly (readonly [string, string])[] = [
  ['Keyword "{0}", labelled {1}.', 'Kata kunci "{0}", berlabel {1}.'],
  ['Keyword "{0}" first, then the remaining letters.',
   'Kata kunci "{0}" dulu, lalu huruf sisanya.'],
  ['Keyword "{0}" first, then the unused letters in order.',
   'Kata kunci "{0}" dulu, lalu huruf yang belum terpakai berurutan.'],
  ['Keyword "{0}", applied to that intermediate text.',
   'Kata kunci "{0}", diterapkan pada teks antara itu.'],
  ['Keyword "{0}", rotated by {1}.', 'Kata kunci "{0}", diputar sejauh {1}.'],
  ['Keyword length {0} means {1}-letter blocks.',
   'Panjang kata kunci {0} berarti blok berisi {1} huruf.'],
  ['Keyword "{0}".', 'Kata kunci "{0}".'],
  ['From the keyword "{0}".', 'Dari kata kunci "{0}".'],
  ['From keyword "{0}".', 'Dari kata kunci "{0}".'],
  ['From "{0}".', 'Dari "{0}".'],
  ['Priming key "{0}", then the plaintext itself.',
   'Kunci penyulut "{0}", lalu teks aslinya sendiri.'],
  ['"{0}" decrypts the first {1} letters.', '"{0}" membaca {1} huruf pertamanya.'],
  ['"{0}" with repeated letters removed.', '"{0}" dengan huruf berulangnya dibuang.'],
  ['"{0}" first, then the remaining letters.', '"{0}" dulu, lalu huruf sisanya.'],
  ['"{0}" gives the transmission order of the rails.',
   '"{0}" menentukan urutan pengiriman relnya.'],
  ['"{0}" recovers which block belongs to which rail.',
   '"{0}" memulihkan blok mana milik rel mana.'],
  ['"{0}" — identical letters share a rank instead of breaking left to right.',
   '"{0}" — huruf yang sama berbagi peringkat alih-alih dipisahkan dari kiri ke kanan.'],
  ['"{0}" sets both the gaps and the read-out order.',
   '"{0}" menetapkan sekaligus celahnya dan urutan pembacaannya.'],
  ['"{0}" repeats across the message.', '"{0}" berulang di sepanjang pesannya.'],
  ['The additive key "{0}" repeats across the message.',
   'Kunci penjumlah "{0}" berulang di sepanjang pesannya.'],
  ['"{0}" repeating.', '"{0}" berulang.'],
  ['"{0}".', '"{0}".'],
  ['Width {0}, {1} rows, last row partly empty.',
   'Lebar {0}, {1} baris, baris terakhirnya sebagian kosong.'],
  ['Width {0}, row by row.', 'Lebar {0}, baris demi baris.'],
  ['Width {0}. The last row is usually short.',
   'Lebar {0}. Baris terakhirnya biasanya pendek.'],
  ['Read the bits back in groups of {0} instead of 8.',
   'Baca bitnya kembali dalam kelompok {0}, bukan 8.'],
  ['{0} symbols cover every {1}-bit value.',
   '{0} simbol menutupi setiap nilai {1} bit.'],
  ['Each gives {0} bits.', 'Masing-masing memberi {0} bit.'],
  ['{0} symbols.', '{0} simbol.'],
  ['Base {0}.', 'Basis {0}.'],
  ['Padded to {0} places so the groups stay aligned.',
   'Diisi sampai {0} tempat supaya kelompoknya tetap sejajar.'],
  ['The first character says {0} bytes.', 'Karakter pertamanya menyatakan {0} byte.'],
  ['{0} invisible characters. Shown here with · for space and → for tab.',
   '{0} karakter tak terlihat. Ditampilkan di sini dengan · untuk spasi dan → untuk tab.'],
  ['{0} characters that render as nothing. Shown here as 0 and 1.',
   '{0} karakter yang tampil sebagai kekosongan. Ditampilkan di sini sebagai 0 dan 1.'],
  ['Need {0} cover letters, have {1}.',
   'Perlu {0} huruf penyamar, yang tersedia {1}.'],
  ['{0} letters are needed for a {1}-letter message.',
   '{0} huruf diperlukan untuk pesan sepanjang {1} huruf.'],
  ['Blocks of {0}. Write all the row numbers, then all the column numbers.',
   'Blok berisi {0}. Tulis semua nomor barisnya, lalu semua nomor kolomnya.'],
  ['Blocks of {0}. Write all the layers, then all the rows, then all the columns.',
   'Blok berisi {0}. Tulis semua lapisannya, lalu semua barisnya, lalu semua kolomnya.'],
  ['Blocks of {0}, two digits per letter.', 'Blok berisi {0}, dua digit per huruf.'],
  ['Blocks of {0}, three digits per letter.', 'Blok berisi {0}, tiga digit per huruf.'],
  ['Blocks of {0}, reduced modulo 26.', 'Blok berisi {0}, dikecilkan modulo 26.'],
  ['Blocks of {0}. The final block may be short.',
   'Blok berisi {0}. Blok terakhirnya boleh jadi pendek.'],
  ['Blocks of {0}.', 'Blok berisi {0}.'],
  ['Columnar transposition under "{0}". This is what separates the two halves of each character.',
   'Transposisi kolom di bawah "{0}". Inilah yang memisahkan kedua belahan tiap karakternya.'],
  ['Columnar decode under "{0}".', 'Pembacaan kolom di bawah "{0}".'],
  ['A {0} or a {1} means take the next digit as well; anything else stands alone.',
   'Angka {0} atau {1} berarti ambil digit berikutnya juga; selain itu berdiri sendiri.'],
  ['p = {0}, q = {1}.', 'p = {0}, q = {1}.'],
  ['gcd({0}, {1}) must be 1.', 'gcd({0}, {1}) harus 1.'],
  ['c = m^{0} mod {1}, where m is the ASCII code.',
   'c = m^{0} mod {1}, dengan m adalah kode ASCII-nya.'],
  ['Knowing p and q is the private information. n = {0} = {1} × {2}.',
   'Mengetahui p dan q itulah informasi pribadinya. n = {0} = {1} × {2}.'],
  ['Solve {0}·d ≡ 1 (mod {1}).', 'Selesaikan {0}·d ≡ 1 (mod {1}).'],
  ['Solve {0}·x ≡ 1 (mod 26).', 'Selesaikan {0}·x ≡ 1 (mod 26).'],
  ['m = c^{0} mod {1}.', 'm = c^{0} mod {1}.'],
  ['p = {0}, e = {1}.', 'p = {0}, e = {1}.'],
  ['c = m^{0} mod {1}.', 'c = m^{0} mod {1}.'],
  ['p = {0}, g = {1}, private x = {2}.', 'p = {0}, g = {1}, kunci pribadi x = {2}.'],
  ['A = g^a mod p = {0}, B = g^b mod p = {1}.', 'A = g^a mod p = {0}, B = g^b mod p = {1}.'],
  ['B^a mod p = A^b mod p = {0}.', 'B^a mod p = A^b mod p = {0}.'],
  ['Either private exponent gets there: {0}.',
   'Eksponen pribadi mana pun sampai ke sana: {0}.'],
  ['Key = {0} = {1}.', 'Kunci = {0} = {1}.'],
  ['{0} random letters, used for this message and no other.',
   '{0} huruf acak, dipakai untuk pesan ini dan tidak untuk pesan lain.'],
  ['This variant uses {0}.', 'Varian ini memakai {0}.'],
  ['The disk advances one notch after each block of {0}.',
   'Cakramnya maju satu takik setelah tiap blok berisi {0}.'],
  ['Advance one notch every {0} letters, exactly as the sender did.',
   'Majukan satu takik setiap {0} huruf, persis seperti yang dilakukan pengirimnya.'],
  ["{0} of {1} pairs shared a column and passed through unchanged — the cipher's structural leak.",
   '{0} dari {1} pasangan berbagi kolom dan lewat tanpa berubah — kebocoran struktural sandi ini.'],
  ['Letters only, padded with X so the length divides by {0}.',
   'Hurufnya saja, diisi dengan X supaya panjangnya habis dibagi {0}.'],
  ['Rotate the alphabet left by {0}.', 'Putar abjadnya ke kiri sejauh {0}.'],
  ['Rotate that mixed alphabet left by {0}.',
   'Putar abjad campuran itu ke kiri sejauh {0}.'],
  ['Replace each letter using that pairing. C = (P + {0}) mod 26.',
   'Ganti tiap huruf memakai pasangan itu. C = (P + {0}) mod 26.'],
  ['P = (C - {0}) mod 26.', 'P = (C − {0}) mod 26.'],
  ['gcd({0}, 26) must be 1 for the map to be reversible.',
   'gcd({0}, 26) harus 1 agar pemetaannya dapat dibalik.'],
  ['C = ({0}·P + {1}) mod 26 applied to each index.',
   'C = ({0}·P + {1}) mod 26 diterapkan pada tiap nomor huruf.'],
  ['{0} has no inverse mod 26.', '{0} tidak punya invers mod 26.'],
  ['P = {0}·(C - {1}) mod 26.', 'P = {0}·(C − {1}) mod 26.'],
  ['Descend to rail {0}, bounce back to rail 1, and repeat.',
   'Turun sampai rel {0}, pantul kembali ke rel 1, lalu ulangi.'],
  ['Across {0} rails.', 'Melintasi {0} rel.'],
  ['{0} letters fit around one turn of the rod.',
   '{0} huruf muat dalam satu lilitan tongkatnya.'],
  ['A rod taking {0} letters per turn is the key.',
   'Tongkat yang memuat {0} huruf per lilitan itulah kuncinya.'],
  ['Move the first {0} letters of each block to its end.',
   'Pindahkan {0} huruf pertama tiap blok ke ujungnya.'],
];

/* -------------------------------------------------------------- the machinery */

type Compiled = { re: RegExp; out: string };

/** `Blocks of {0}.` becomes /^Blocks of (.+?)\.$/ — both sides from one source. */
function compile(pairs: readonly (readonly [string, string])[]): Compiled[] {
  return pairs
    // Longest literal text first, so a specific template is tried before a
    // shorter one that would also match. Without this, `Keyword "{0}".` would
    // swallow `Keyword "{0}", labelled {1}.`
    .slice()
    .sort((a, b) => b[0].replace(/\{\d\}/g, '').length - a[0].replace(/\{\d\}/g, '').length)
    .map(([en, id]) => {
      const parts = en.split(/\{\d\}/);
      const re = new RegExp(
        '^' + parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$',
        's',
      );
      return { re, out: id };
    });
}

const TITLE_RE = compile(TITLE_TEMPLATE);
const DETAIL_RE = compile(DETAIL_TEMPLATE);

function viaTemplate(text: string, table: Compiled[]): string | undefined {
  for (const { re, out } of table) {
    const m = re.exec(text);
    if (m) return out.replace(/\{(\d)\}/g, (_, i) => m[Number(i) + 1] ?? '');
  }
  return undefined;
}

/** One phrase, or undefined when nothing covers it — which the gate reports. */
export function translatePhrase(
  text: string,
  kind: 'title' | 'detail',
): string | undefined {
  if (!text.trim()) return text;
  const exact = kind === 'title' ? TITLE[text] : DETAIL[text];
  if (exact !== undefined) return exact;
  return viaTemplate(text, kind === 'title' ? TITLE_RE : DETAIL_RE);
}

/**
 * The trail, in the reader's language.
 *
 * Falls back to the English phrase rather than dropping it: a missing entry
 * should read oddly, never leave a gap in a worked solution a student is
 * following. `verify:steps` is what stops it reaching them in the first place.
 */
export function translateSteps(steps: Step[], locale: 'en' | 'id'): Step[] {
  if (locale !== 'id') return steps;
  return steps.map((s) => ({
    ...s,
    title: translatePhrase(s.title, 'title') ?? s.title,
    detail: translatePhrase(s.detail, 'detail') ?? s.detail,
  }));
}

export { TITLE, TITLE_TEMPLATE, DETAIL, DETAIL_TEMPLATE };
