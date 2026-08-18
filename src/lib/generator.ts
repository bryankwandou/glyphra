import {
  TECHNIQUES, REVERSIBLE, getTechnique, A, makeRng, randomKey, lettersOnly,
} from './ciphers';
import type { Technique, Key, Difficulty, Family, Step, Rng } from './ciphers/types';
import { ALL_PLAINTEXTS, SHORT } from './plaintexts';

/** Techniques whose output balloons, so they get a shorter message. */
const VERBOSE = new Set([
  'baconian', 'nato-phonetic', 'whitespace-stego', 'zero-width-stego',
  'null-cipher', 'case-stego', 'binary', 'octal', 'morse', 'tap-code',
  'gray-code', 'html-entities', 'trifid',
]);

export interface GeneratorOptions {
  /** Restrict to these technique ids. Empty means the whole catalogue. */
  techniqueIds?: string[];
  families?: Family[];
  difficulties?: Difficulty[];
  /** Supplying a seed makes the entire problem reproducible. */
  seed?: string;
  /** Overrides the message bank — used by the AI mode. */
  plaintext?: string;
}

/** What the student is allowed to see. */
export interface PublicChallenge {
  id: string;
  seed: string;
  techniqueId: string;
  techniqueName: string;
  family: Family;
  difficulty: Difficulty;
  era: string;
  summary: string;
  theory: string;
  prompt: string;
  ciphertext: string;
  /**
   * Field labels only. The student is told a keyword exists and what it is
   * called; they are never told its value.
   */
  keyFields: { label: string; disclosed: boolean; value?: string }[];
  plaintextLength: number;
}

/** What only the instructor view may see. */
export interface Solution {
  plaintext: string;
  key: Key;
  encodeSteps: Step[];
  decodeSteps: Step[];
}

export interface GeneratedChallenge {
  publicPart: PublicChallenge;
  solution: Solution;
}

/**
 * Some techniques are unsolvable in practice without a partial hint, because
 * the key space is far too large to search by hand within an exercise. For
 * those, one component of the key is disclosed with the problem — which is
 * exactly how these appear in a textbook.
 */
const DISCLOSE_KEY_FIELD: Record<string, string[]> = {
  'simple-substitution': ['alphabet'],
  'one-time-pad': ['pad'],
  'vernam-binary': ['pad'],
  'running-key': ['passage'],
  'chacha20': ['key', 'nonce'],
  'aes-128-ecb': ['key'],
  'aes-128-cbc': ['key', 'iv'],
  'tea': ['key'],
  'xtea': ['key'],
  'rsa-textbook': ['pqe'],
  'elgamal': ['pgx'],
  'exponentiation-cipher': ['pe'],
  'diffie-hellman': ['pgab'],
  'hill-2x2': ['matrix'],
  'hill-3x3': ['matrix'],
  'enigma': ['r1', 'r2', 'r3'],
  'quagmire-4': ['ind'],
  'chaocipher': ['left'],
};

function pickTechnique(opts: GeneratorOptions, rng: Rng): Technique {
  // The default pool excludes techniques that cannot make a real problem. An
  // explicit request by id still honours the request — an instructor asking for
  // quoted-printable by name presumably wants to demonstrate exactly that it
  // does nothing.
  let pool = REVERSIBLE.filter((t) => !NOT_AS_PROBLEMS.has(t.id));
  if (opts.techniqueIds?.length) {
    const wanted = new Set(opts.techniqueIds);
    pool = TECHNIQUES.filter((t) => wanted.has(t.id));
  }
  if (opts.families?.length) {
    const wanted = new Set(opts.families);
    pool = pool.filter((t) => wanted.has(t.family));
  }
  if (opts.difficulties?.length) {
    const wanted = new Set(opts.difficulties);
    pool = pool.filter((t) => wanted.has(t.difficulty));
  }
  // Filters that exclude everything fall back to the whole usable pool rather
  // than failing — a problem from outside the requested band beats no problem.
  if (!pool.length) pool = REVERSIBLE.filter((t) => !NOT_AS_PROBLEMS.has(t.id));
  return rng.pick(pool);
}

/**
 * Fill any `pad` field with material matched to the message length. Doing this
 * after the plaintext is known is what keeps a one-time pad an actual one-time
 * pad rather than a repeating-key cipher wearing its name.
 */
function completeKey(technique: Technique, key: Key, plaintext: string, rng: Rng): Key {
  const padField = technique.keySpec.find((f) => f.kind === 'pad');
  if (!padField) return key;
  const needed = Math.max(lettersOnly(plaintext).length * 2, plaintext.length * 2, 64);
  const pad = Array.from({ length: needed }, () => A[rng.int(0, 25)]).join('');
  return { ...key, [padField.name]: pad };
}

function buildPrompt(technique: Technique, disclosed: { label: string; value?: string }[]): string {
  const known = disclosed.length
    ? ` You are given ${disclosed.map((d) => d.label.toLowerCase()).join(' and ')}.`
    : ' The key is not supplied — recover it as part of your working.';
  return `Recover the plaintext from the ciphertext below. It was enciphered with ${technique.name}.${known}`;
}

/**
 * Techniques that belong in the catalogue but must never become a problem,
 * because against ordinary prose they do nothing at all.
 *
 * ROT5 rotates digits and leaves letters alone; every exercise message here is
 * letters, so it hands the student the answer verbatim. Quoted-printable only
 * escapes characters outside a printable ASCII range, so plain English passes
 * through untouched. Both are worth teaching — a student should know that an
 * encoding is not a cipher — and neither is worth setting as a question.
 *
 * A generated problem is checked against this failure mode regardless, since
 * some techniques are degenerate only for particular keys. Block rotation with
 * a block size that divides the message evenly is the example that turned up.
 */
const NOT_AS_PROBLEMS = new Set(['rot5', 'quoted-printable']);

/** True when the "ciphertext" is just the plaintext wearing a hat. */
function isDegenerate(ciphertext: string, plaintext: string): boolean {
  const strip = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  return strip(ciphertext) === strip(plaintext);
}

export function generateChallenge(opts: GeneratorOptions = {}): GeneratedChallenge {
  const seed = opts.seed ?? Math.random().toString(36).slice(2, 12);

  // Attempts are ordered and the salt is derived from the attempt number, so
  // the same seed still produces the same problem — retrying stays
  // deterministic, which is what lets a lost paper be rebuilt from its seed.
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = buildOne(opts, seed, attempt);
    if (!isDegenerate(candidate.publicPart.ciphertext, candidate.solution.plaintext)) {
      return candidate;
    }
  }
  // Ten attempts all degenerate means the caller pinned a technique that cannot
  // produce a real problem. Returning it is still better than throwing, and the
  // verification script will have caught it long before a student does.
  return buildOne(opts, seed, 0);
}

function buildOne(opts: GeneratorOptions, seed: string, attempt: number): GeneratedChallenge {
  const rng = makeRng(attempt === 0 ? seed : `${seed}#${attempt}`);
  const technique = pickTechnique(opts, rng);

  const bank = VERBOSE.has(technique.id) ? SHORT : ALL_PLAINTEXTS;
  const plaintext = opts.plaintext?.trim() || rng.pick(bank);

  let key = randomKey(technique.keySpec, rng);
  key = completeKey(technique, key, plaintext, rng);

  const normalised = technique.normalise(plaintext, key);
  const encoded = technique.encode(plaintext, key);
  const decoded = technique.decode(encoded.output, key);

  const disclose = new Set(DISCLOSE_KEY_FIELD[technique.id] ?? []);
  const keyFields = technique.keySpec
    .filter((f) => f.kind !== 'none')
    .map((f) => ({
      label: f.label,
      disclosed: disclose.has(f.name),
      value: disclose.has(f.name) ? String(key[f.name]) : undefined,
    }));

  return {
    publicPart: {
      id: `${technique.id}-${seed}`,
      seed,
      techniqueId: technique.id,
      techniqueName: technique.name,
      family: technique.family,
      difficulty: technique.difficulty,
      era: technique.era,
      summary: technique.summary,
      theory: technique.theory,
      prompt: buildPrompt(technique, keyFields.filter((f) => f.disclosed)),
      ciphertext: encoded.output,
      keyFields,
      plaintextLength: normalised.length,
    },
    solution: {
      plaintext: normalised,
      key,
      encodeSteps: encoded.steps,
      decodeSteps: decoded.steps,
    },
  };
}

/**
 * Compare a submitted answer against the sealed plaintext.
 *
 * Marking is forgiving about the things a student cannot recover — classical
 * ciphers destroy spacing, punctuation and case, so requiring them back would
 * be marking on transcription rather than cryptanalysis. Padding letters added
 * during preparation are tolerated at the end for the same reason.
 */
export function gradeAnswer(submitted: string, expected: string): {
  correct: boolean;
  normalisedSubmitted: string;
  normalisedExpected: string;
  similarity: number;
} {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const a = clean(submitted);
  const b = clean(expected);

  const trimPad = (s: string) => s.replace(/X+$/, '');
  const correct = a === b || trimPad(a) === trimPad(b);

  const len = Math.max(a.length, b.length) || 1;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) matches++;

  return {
    correct,
    normalisedSubmitted: a,
    normalisedExpected: b,
    similarity: matches / len,
  };
}

/** Catalogue metadata for the browser, with no solving machinery attached. */
export function catalogueSummary() {
  return TECHNIQUES.map((t) => ({
    id: t.id,
    name: t.name,
    family: t.family,
    difficulty: t.difficulty,
    era: t.era,
    summary: t.summary,
    oneWay: Boolean(t.oneWay),
  }));
}

export { getTechnique };
