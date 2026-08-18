/**
 * Message bank for generated problems.
 *
 * These are deliberately short, unambiguous, and free of the letter patterns
 * that would make a problem trivially guessable (no repeated stock phrases, no
 * message that is itself the name of the cipher). Mixed English and Indonesian
 * so the same exercise set works in either language of instruction.
 */

export const ENGLISH: string[] = [
  'The convoy leaves the northern gate before first light',
  'Verify the seal before you open the second envelope',
  'Three couriers will wait beneath the old clock tower',
  'Nothing in this message should reach the eastern office',
  'The ledger was moved to the archive on the fourth floor',
  'Confirm receipt by returning the agreed phrase unaltered',
  'Weather permitting the crossing happens on Tuesday night',
  'Destroy this sheet once the contents have been committed',
  'The shipment cleared customs but the manifest is wrong',
  'Await further instruction before contacting the supplier',
  'Our position has not changed since the last transmission',
  'Send the replacement parts through the southern depot',
  'The meeting has been moved forward by two full hours',
  'Every copy of the report must be accounted for tonight',
  'He will recognise you by the book carried in the left hand',
  'The signal is three short flashes followed by one long',
  'Payment has been arranged through the usual intermediary',
  'Do not travel by the coastal road under any circumstances',
  'The original document remains in the vault untouched',
  'Reinforcements cannot arrive before the end of the week',
  'Check the reverse of the photograph for the address',
  'The line was compromised so assume everything was read',
  'Bring the spare cylinder and enough fuel for two days',
  'Her train arrives at the platform nearest the entrance',
  'The account was closed the morning after the transfer',
];

export const INDONESIAN: string[] = [
  'Kirim laporan itu sebelum rapat dimulai besok pagi',
  'Berkas asli disimpan di lemari besi lantai empat',
  'Jangan hubungi kantor cabang sampai ada kabar lanjutan',
  'Pengiriman tertunda karena dokumen bea cukai keliru',
  'Temui saya di ruang baca perpustakaan pukul tiga sore',
  'Salinan kedua sudah dimusnahkan seperti yang disepakati',
  'Periksa segel amplop sebelum kamu membukanya sendiri',
  'Jalur komunikasi lama sudah tidak aman untuk dipakai',
  'Bawa kunci cadangan dan bekal untuk perjalanan dua hari',
  'Rapat dimajukan dua jam dari jadwal yang tertulis',
  'Semua catatan harus dihitung ulang sebelum tengah malam',
  'Dia akan mengenalimu dari buku merah di tangan kirinya',
  'Pembayaran sudah diatur lewat perantara yang biasa',
  'Hindari jalan pesisir dalam keadaan apa pun malam ini',
  'Bantuan tidak mungkin datang sebelum akhir pekan ini',
];

export const ALL_PLAINTEXTS = [...ENGLISH, ...INDONESIAN];

/**
 * Techniques that expand their input a great deal (Baconian, whitespace
 * steganography, NATO phonetic) produce unwieldy problems from a long sentence,
 * so the generator draws from this shorter set for those.
 */
export const SHORT: string[] = [
  'Attack at dawn',
  'Hold the bridge',
  'Burn the letter',
  'Trust no courier',
  'Meet at midnight',
  'The vault is open',
  'Send help quickly',
  'Change the signal',
  'Kunci ada di laci',
  'Segera tinggalkan',
];
