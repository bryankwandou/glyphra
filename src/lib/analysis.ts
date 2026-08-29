/**
 * The tools a student needs to find a key, rather than be handed one.
 *
 * Everything else in this project generates a problem and marks an answer. That
 * makes it a decoding drill: with the key disclosed there is one mechanical step
 * to perform, and with the key withheld there is nothing to do but guess. Neither
 * is cryptanalysis, which is the subject the course is actually about.
 *
 * These are the measurements that turn guessing into work. They are pure
 * functions over a string so they can be checked against known answers —
 * English prose sits near 0.066 on the index of coincidence and random letters
 * near 0.038, a Vigenère repeat pattern has the key length among its factors,
 * and a Caesar shift falls out of a chi-squared fit in one pass. `verify:analysis`
 * asserts each of those against texts whose answers are known in advance.
 */

/** Letter counts in English prose, as proportions. Used as the expected model. */
const ENGLISH: Readonly<Record<string, number>> = Object.freeze({
  A: 0.08167, B: 0.01492, C: 0.02782, D: 0.04253, E: 0.12702, F: 0.02228,
  G: 0.02015, H: 0.06094, I: 0.06966, J: 0.00153, K: 0.00772, L: 0.04025,
  M: 0.02406, N: 0.06749, O: 0.07507, P: 0.01929, Q: 0.00095, R: 0.05987,
  S: 0.06327, T: 0.09056, U: 0.02758, V: 0.00978, W: 0.02360, X: 0.00150,
  Y: 0.01974, Z: 0.00074,
});

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Just the letters, uppercased. Everything here ignores spacing and punctuation. */
export function letters(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

export interface LetterCount {
  letter: string;
  count: number;
  /** Share of all letters, 0–1. */
  share: number;
  /** What English would predict, 0–1, for comparison against `share`. */
  expected: number;
}

/** Every letter, in descending order of how often it appears. */
export function frequency(text: string): LetterCount[] {
  const only = letters(text);
  const counts = new Map<string, number>();
  for (const ch of only) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  return ALPHABET.split('')
    .map((letter) => ({
      letter,
      count: counts.get(letter) ?? 0,
      share: only.length ? (counts.get(letter) ?? 0) / only.length : 0,
      expected: ENGLISH[letter],
    }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
}

/**
 * The chance that two letters drawn at random from the text are the same.
 *
 * This is the single most useful number on the page. English prose sits near
 * 0.066 because its letters are lopsided; a flat, random-looking distribution
 * sits near 0.038. A monoalphabetic cipher only renames letters, so it keeps the
 * lopsidedness and stays near 0.066 however unreadable it looks. A polyalphabetic
 * cipher spreads each plaintext letter across several cipher letters and drags
 * the value down toward random. So this distinguishes "the letters were swapped"
 * from "the letters were swapped differently in different places" before any key
 * is guessed — which is the first fork in every cryptanalysis.
 */
export function indexOfCoincidence(text: string): number {
  const only = letters(text);
  const n = only.length;
  if (n < 2) return 0;

  const counts = new Map<string, number>();
  for (const ch of only) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  let total = 0;
  for (const c of counts.values()) total += c * (c - 1);
  return total / (n * (n - 1));
}

/** Roughly what a text of this shape would score if it were ordinary English. */
export const IOC_ENGLISH = 0.0667;
/** Roughly what it would score if the letters were independent and uniform. */
export const IOC_RANDOM = 1 / 26;

export interface Repeat {
  gram: string;
  positions: number[];
  /** Gaps between consecutive occurrences — what Kasiski factors. */
  distances: number[];
}

/** Repeated blocks of `size` letters, longest-standing first. */
export function repeats(text: string, size = 3): Repeat[] {
  const only = letters(text);
  const seen = new Map<string, number[]>();

  for (let i = 0; i + size <= only.length; i++) {
    const gram = only.slice(i, i + size);
    const at = seen.get(gram);
    if (at) at.push(i);
    else seen.set(gram, [i]);
  }

  const out: Repeat[] = [];
  for (const [gram, positions] of seen) {
    if (positions.length < 2) continue;
    const distances: number[] = [];
    for (let i = 1; i < positions.length; i++) distances.push(positions[i] - positions[i - 1]);
    out.push({ gram, positions, distances });
  }
  return out.sort((a, b) => b.positions.length - a.positions.length || a.gram.localeCompare(b.gram));
}

export interface KeyLengthGuess {
  length: number;
  /** How many observed repeat-distances this length divides. */
  hits: number;
}

/**
 * Candidate key lengths, best first.
 *
 * A repeated plaintext fragment enciphered at the same key offset produces the
 * same ciphertext fragment, so the gap between two identical blocks tends to be
 * a multiple of the key length. Factor every gap, count which factors keep
 * appearing, and the key length rises to the top. Short keys divide more gaps by
 * accident, so ties are broken toward the shorter one only after the count.
 */
export function kasiski(text: string, maxLength = 20): KeyLengthGuess[] {
  const all = repeats(text, 3).flatMap((r) => r.distances);
  if (!all.length) return [];

  const out: KeyLengthGuess[] = [];
  for (let len = 2; len <= maxLength; len++) {
    const hits = all.filter((d) => d % len === 0).length;
    if (hits) out.push({ length: len, hits });
  }
  return out.sort((a, b) => b.hits - a.hits || a.length - b.length);
}

export interface ShiftGuess {
  shift: number;
  /** Lower is a better fit to English. */
  chiSquared: number;
  /** The text as it reads under this shift, truncated for display. */
  preview: string;
}

/**
 * Every Caesar shift ranked by how much the result looks like English.
 *
 * There are only 25 useful keys, so the right answer is always in this list; the
 * chi-squared fit is what puts it first instead of making the student read all
 * 25. This is also the honest demonstration of why a Caesar shift is not a
 * cipher any more — the break is one pass over the text.
 */
export function caesarFit(text: string, previewLength = 48): ShiftGuess[] {
  const only = letters(text);
  const guesses: ShiftGuess[] = [];

  for (let shift = 0; shift < 26; shift++) {
    const rolled = only.replace(/[A-Z]/g, (ch) =>
      ALPHABET[(ALPHABET.indexOf(ch) - shift + 26) % 26],
    );

    const counts = new Map<string, number>();
    for (const ch of rolled) counts.set(ch, (counts.get(ch) ?? 0) + 1);

    let chi = 0;
    for (const letter of ALPHABET) {
      const expected = ENGLISH[letter] * rolled.length;
      const observed = counts.get(letter) ?? 0;
      if (expected > 0) chi += ((observed - expected) ** 2) / expected;
    }

    guesses.push({
      shift,
      chiSquared: chi,
      preview: text.toUpperCase().replace(/[A-Z]/g, (ch) =>
        ALPHABET[(ALPHABET.indexOf(ch) - shift + 26) % 26],
      ).slice(0, previewLength),
    });
  }

  return guesses.sort((a, b) => a.chiSquared - b.chiSquared);
}

/**
 * What the index of coincidence implies about the number of alphabets in use.
 *
 * Friedman's estimate. It is a rough number and says so — it tells a student
 * "about four, not about one and not about twenty", which is enough to know
 * whether to reach for Kasiski at all.
 */
export function friedman(text: string): number {
  const only = letters(text);
  const n = only.length;
  if (n < 2) return 0;

  const ic = indexOfCoincidence(text);
  const denominator = (n - 1) * ic - IOC_RANDOM * n + IOC_ENGLISH;
  if (Math.abs(denominator) < 1e-9) return 0;

  const estimate = (IOC_ENGLISH - IOC_RANDOM) * n / denominator;
  return estimate > 0 ? estimate : 0;
}

export interface Reading {
  ic: number;
  /** What the index of coincidence suggests, as a plain conclusion. */
  verdict: 'monoalphabetic' | 'polyalphabetic' | 'inconclusive';
  /** Friedman's rough count of alphabets, only meaningful when polyalphabetic. */
  alphabets: number;
  /** Enough letters for any of this to mean anything. */
  reliable: boolean;
}

/**
 * The one-line conclusion, so the numbers are not left for the student to
 * interpret unaided.
 *
 * Short texts are called out rather than quietly given a confident answer: an
 * index of coincidence over thirty letters is noise, and presenting it as a
 * finding would be the same failure as a check that passes on an empty sample.
 */
export function read(text: string): Reading {
  const n = letters(text).length;
  const ic = indexOfCoincidence(text);
  const reliable = n >= 80;

  const midpoint = (IOC_ENGLISH + IOC_RANDOM) / 2;
  const verdict = !reliable
    ? 'inconclusive'
    : ic >= midpoint
      ? 'monoalphabetic'
      : 'polyalphabetic';

  return { ic, verdict, alphabets: friedman(text), reliable };
}
