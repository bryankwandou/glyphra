/**
 * Every string here was produced by the cipher engine and confirmed to
 * round-trip before it was pasted in. A promotional film for a product whose
 * whole argument is correctness cannot contain a ciphertext someone typed from
 * memory — an earlier draft of the deck did exactly that and it had to be
 * corrected against the engine.
 *
 * Plaintext for all six: "MEET ME AT THE BRIDGE"
 */
export const SHOWCASE = [
  { name: 'Caesar shift', era: '58 BC', out: 'PHHWP HDWWK HEULG JH' },
  { name: 'Vigenère cipher', era: '1553', out: 'XERMQ VNETU XFIVO GR' },
  { name: 'Playfair cipher', era: '1854', out: 'LFFSL FOPNO LEAKU KDY' },
  { name: 'Rail fence', era: '1860s', out: 'MAREE TBIEM TEDET HG' },
  { name: 'Bifid cipher', era: '1901', out: 'KFMLT DTCYT BCEBO BX' },
  { name: 'Enigma (three rotors)', era: '1918', out: 'DLCFH NCRHN NFIQP HT' },
] as const;

export const PLAINTEXT = 'MEET ME AT THE BRIDGE';

/** The six defects the verification harness rejected on its first run. */
export const DEFECTS = [
  ['Pigpen', 'duplicate glyphs — letters collided'],
  ['Trifid', 'filler symbol stripped as non-alphabetic'],
  ['RSA', 'gcd(e, φ) = 7 — no private exponent existed'],
  ['Dancing Men', 'astral glyphs indexed mid-surrogate'],
  ['Nihilist transposition', 'padding never declared'],
  ['Case steganography', 'no terminator — decoded past the payload'],
] as const;

export const STATS = [
  { value: '101', label: 'techniques' },
  { value: '1,128', label: 'round trips per build' },
  { value: '0', label: 'problems stored' },
] as const;
