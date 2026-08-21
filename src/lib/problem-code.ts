import { REVERSIBLE } from './ciphers';

/**
 * Single-problem codes: one QR, one problem, one named technique.
 *
 * A quiz code carries a whole quiz. This carries exactly one problem and the
 * method it must use, which is what makes "prove this problem is a Playfair
 * problem" answerable — the technique is not chosen at generation time and then
 * described afterwards, it is written into the code itself. Anybody holding the
 * code can decode it and read the technique back out. Two people scanning the
 * same QR on different machines get the identical problem for the same reason
 * quiz codes work: the generator is a pure function of its seed.
 *
 * Layout, 40 bits:
 *   technique  7   an index into the frozen roster below, 0..127
 *   seed      24   the value the generator is seeded from
 *   disclose   1   show the key (mechanism practice) or withhold it (cryptanalysis)
 *   checksum   8   twice the quiz code's, because a mistyped single-problem code
 *                  would otherwise land on a different technique entirely rather
 *                  than simply failing
 */

/**
 * The roster is frozen and append-only, and that is the entire point.
 *
 * Codes store an index into this list, so reordering it would silently change
 * what an already-printed QR opens — a poster on a wall would start producing a
 * different cipher, with nothing failing and no error to notice. New techniques
 * go on the end. Nothing is ever removed or moved, and `verify:problems` fails
 * the build if the prefix ever changes.
 *
 * Alphabetical only because it had to start somewhere; it carries no meaning
 * and must not be re-sorted when names change.
 */
export const PROBLEM_ROSTER: readonly string[] = Object.freeze([
  'a1z26',
  'adfgvx',
  'adfgx',
  'aes-128-cbc',
  'aes-128-ecb',
  'affine',
  'alberti',
  'amsco',
  'ascii85',
  'atbash',
  'autokey',
  'baconian',
  'base16',
  'base32',
  'base36',
  'base45',
  'base58',
  'base62',
  'base64',
  'beaufort',
  'bifid',
  'binary',
  'block-rotation',
  'braille',
  'caesar',
  'case-stego',
  'chacha20',
  'chaocipher',
  'columnar',
  'dancing-men',
  'decimal-ascii',
  'diffie-hellman',
  'disrupted-columnar',
  'double-columnar',
  'elgamal',
  'enigma',
  'exponentiation-cipher',
  'four-square',
  'gray-code',
  'gronsfeld',
  'hill-2x2',
  'hill-3x3',
  'html-entities',
  'keyed-caesar',
  'keyword',
  'leetspeak',
  'morse',
  'multiplicative',
  'myszkowski',
  'nato-phonetic',
  'nihilist',
  'nihilist-transposition',
  'null-cipher',
  'octal',
  'one-time-pad',
  'pigpen',
  'playfair',
  'polybius',
  'porta',
  'quagmire-1',
  'quagmire-2',
  'quagmire-3',
  'quagmire-4',
  'quoted-printable',
  'rail-fence',
  'rc4',
  'redefence',
  'reverse',
  'rot13',
  'rot18',
  'rot47',
  'rot5',
  'route-spiral',
  'rsa-textbook',
  'running-key',
  'scytale',
  'simple-substitution',
  'straddling-checkerboard',
  'tap-code',
  'tea',
  'trifid',
  'trithemius',
  'turning-grille',
  'two-square',
  'url-encoding',
  'uuencode',
  'variant-beaufort',
  'vernam-binary',
  'vigenere',
  'whitespace-stego',
  'xor-repeating',
  'xor-single',
  'xtea',
  'zero-width-stego',
]);

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface ProblemConfig {
  techniqueId: string;
  seed: number;
  disclose: boolean;
}

/** Eight-bit fold. Wider than the quiz code's four because the cost of a
 *  collision here is a different technique, not a different question set. */
function checksum(payload: bigint): number {
  let acc = 0n;
  let rest = payload;
  while (rest > 0n) {
    acc = (acc + (rest & 0xffn)) & 0xffn;
    rest >>= 8n;
  }
  return Number(acc & 0xffn);
}

export function encodeProblemCode(config: ProblemConfig): string | null {
  const index = PROBLEM_ROSTER.indexOf(config.techniqueId);
  if (index < 0 || index > 127) return null;

  const seed = Math.max(0, Math.min(0xffffff, Math.round(config.seed)));

  let payload = 0n;
  payload = (payload << 7n) | BigInt(index);
  payload = (payload << 24n) | BigInt(seed);
  payload = (payload << 1n) | BigInt(config.disclose ? 1 : 0);

  const full = (payload << 8n) | BigInt(checksum(payload));

  // Appended, not prepended. Prepending while counting down emits the digits
  // low-to-high, which reads back as a different code entirely — the same
  // reversal the quiz codec shipped with once, and the reason that one decoded
  // to a plausible wrong quiz rather than failing outright.
  let out = '';
  for (let i = 7; i >= 0; i--) {
    out += ALPHABET[Number((full >> BigInt(i * 5)) & 0x1fn)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function decodeProblemCode(input: string): ProblemConfig | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  if (cleaned.length !== 8) return null;

  let full = 0n;
  for (const ch of cleaned) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    full = (full << 5n) | BigInt(v);
  }

  const payload = full >> 8n;
  if (checksum(payload) !== Number(full & 0xffn)) return null;

  const disclose = Number(payload & 0x1n) === 1;
  const seed = Number((payload >> 1n) & 0xffffffn);
  const index = Number((payload >> 25n) & 0x7fn);

  const techniqueId = PROBLEM_ROSTER[index];
  if (!techniqueId) return null;

  // A code naming a technique the catalogue no longer offers has to fail rather
  // than fall back to something else, for the same reason the generator stopped
  // falling back: a substitute nobody asked for is worse than an honest refusal.
  if (!REVERSIBLE.some((t) => t.id === techniqueId)) return null;

  return { techniqueId, seed, disclose };
}

/** The one spelling everything keys on, or null if it is not a real code. */
export function canonicalProblemCode(input: string): string | null {
  const config = decodeProblemCode(input);
  return config ? encodeProblemCode(config) : null;
}

export function randomProblemSeed(): number {
  return Math.floor(Math.random() * 0x1000000);
}
