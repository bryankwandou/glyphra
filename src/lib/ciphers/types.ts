/**
 * Core contracts for every technique in the Glyphra catalogue.
 *
 * Two rules hold for the whole catalogue and the verification harness leans on
 * both of them:
 *
 *  1. `decode(encode(x, k), k)` recovers `x` exactly, after `normalise` has been
 *     applied to `x`. Ciphers that destroy information (classical ones that drop
 *     spacing and punctuation) declare that by returning a normalised form, so
 *     the round trip is still exact against the normalised input rather than the
 *     raw input.
 *  2. Every call returns the reasoning trail that produced the answer. The trail
 *     is what the instructor view renders, so it has to be built during the real
 *     computation — never reconstructed afterwards from the result.
 */

export type Family =
  | 'substitution'
  | 'polyalphabetic'
  | 'polygraphic'
  | 'transposition'
  | 'fractionation'
  | 'encoding'
  | 'modern-symmetric'
  | 'asymmetric'
  | 'hash'
  | 'steganography';

export const FAMILY_LABEL: Record<Family, string> = {
  substitution: 'Monoalphabetic substitution',
  polyalphabetic: 'Polyalphabetic substitution',
  polygraphic: 'Polygraphic substitution',
  transposition: 'Transposition',
  fractionation: 'Fractionation',
  encoding: 'Encoding and representation',
  'modern-symmetric': 'Modern symmetric',
  asymmetric: 'Asymmetric and number theory',
  hash: 'Hashing and integrity',
  steganography: 'Steganography',
};

/** 1 = a first-week exercise, 5 = a graduate seminar problem. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * One line of the worked solution. `detail` carries the explanation; `data`
 * carries any tabular artefact (a Polybius square, a column ordering, a rotor
 * position) that the explanation refers to.
 */
export interface Step {
  title: string;
  detail: string;
  data?: string;
}

export interface Result {
  output: string;
  steps: Step[];
}

/**
 * Describes one component of a technique's key so the generator can produce a
 * fresh valid key without knowing anything technique-specific.
 */
export type KeyField =
  | { name: string; kind: 'int'; min: number; max: number; label: string }
  | { name: string; kind: 'word'; minLen: number; maxLen: number; label: string }
  | { name: string; kind: 'alphabet'; label: string }
  | { name: string; kind: 'choice'; options: string[]; label: string }
  | { name: string; kind: 'hex'; bytes: number; label: string }
  /**
   * A keystream at least as long as the message. The generator fills this after
   * it knows the plaintext, which is what keeps the one-time pad honest instead
   * of quietly degrading into a repeating-key cipher.
   */
  | { name: string; kind: 'pad'; label: string }
  | { name: string; kind: 'none'; label: string };

export type Key = Record<string, string | number>;

export interface Technique {
  id: string;
  name: string;
  family: Family;
  difficulty: Difficulty;
  /** One sentence a student sees before attempting the problem. */
  summary: string;
  /** The mechanism, written for someone who has to reproduce it by hand. */
  theory: string;
  /** Year or period of first documented use, for the catalogue timeline. */
  era: string;
  keySpec: KeyField[];
  /**
   * True when the technique cannot be inverted (hashes) — the generator asks a
   * recognition or verification question instead of a decryption question.
   */
  oneWay?: boolean;
  /**
   * Applied to plaintext before encoding. The round-trip guarantee is stated
   * against this normalised form.
   *
   * The key is passed because some techniques pad to a block size derived from
   * the key — a Nihilist transposition squares its keyword length — and the
   * normalised form has to account for that padding or the round trip cannot
   * be stated exactly.
   */
  normalise(input: string, key?: Key): string;
  encode(plaintext: string, key: Key): Result;
  decode(ciphertext: string, key: Key): Result;
}

/** Deterministic RNG so a seed reproduces an entire problem set exactly. */
export interface Rng {
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  float(): number;
}
