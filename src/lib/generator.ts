import {
  TECHNIQUES, REVERSIBLE, getTechnique, A, makeRng, randomKey, lettersOnly,
} from './ciphers';
import type { Technique, Key, Difficulty, Family, Step, Rng } from './ciphers/types';
import { ALL_PLAINTEXTS, SHORT, TINY } from './plaintexts';
import { TECHNIQUE_ID } from './i18n/techniques';

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
  /** Overrides the message bank — used by the AI mode and by typed input. */
  plaintext?: string;
  /** A first problem: short message, so the work is the method and not the length. */
  beginner?: boolean;
  /** The reader's language, for the instruction line. */
  locale?: 'en' | 'id';
  /**
   * Show every key field instead of withholding it.
   *
   * A beginner decoding with the key in front of them is doing the mechanism.
   * A beginner asked to recover an unknown keyword first is doing cryptanalysis,
   * which is a different and much harder skill. Difficulty 1 should be the
   * former, and without this flag it was silently the latter.
   */
  discloseKey?: boolean;
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
  /**
   * Filters that could not all be satisfied together and were set aside.
   *
   * Never silently. Asking for the Hill cipher while also restricting to
   * monoalphabetic substitution is a contradiction, and the old behaviour was
   * to quietly discard every filter and return something unrelated — a person
   * who asked for Hill got Gronsfeld with no indication anything had been
   * ignored. The UI reports whatever appears here.
   */
  relaxed: string[];
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

interface Picked {
  technique: Technique;
  /** Which constraints had to be set aside, so the UI can say so. */
  relaxed: string[];
}

/**
 * Choose the technique, honouring the most specific instruction available.
 *
 * The previous version intersected every filter and, when the intersection came
 * out empty, fell back to the entire catalogue. That turned a contradiction
 * into a silent lie: selecting the Hill cipher while monoalphabetic
 * substitution was also ticked produced a Gronsfeld problem at a difficulty
 * nobody had asked for, with nothing on screen admitting the request had been
 * dropped. Falling back to everything is the one behaviour that is worse than
 * failing, because the person cannot tell it happened.
 *
 * Two rules now. A technique named outright wins over the broader filters,
 * since picking one cipher by name is the least ambiguous thing a person can
 * do. Otherwise constraints are relaxed one at a time, in a fixed order, and
 * each one set aside is reported.
 */
function pickTechnique(opts: GeneratorOptions, rng: Rng): Picked {
  const usable = REVERSIBLE.filter((t) => !NOT_AS_PROBLEMS.has(t.id));

  if (opts.techniqueIds?.length) {
    const wanted = new Set(opts.techniqueIds);
    const named = TECHNIQUES.filter((t) => wanted.has(t.id));
    if (named.length) {
      // An id given explicitly is honoured even for the degenerate encodings —
      // asking for quoted-printable by name is presumably a demonstration that
      // it does nothing.
      //
      // Narrowed by the other filters, not merely checked against them. The
      // first version asked whether any named technique matched the family,
      // reported nothing when one did, and then drew from the whole named list
      // anyway. Beginner mode supplies a seven-technique list; ticking
      // Transposition against it left rail-fence as the only honest answer, and
      // the generator returned Atbash while claiming nothing had been set
      // aside. That is the same silent override the catalogue-wide fallback
      // was, wearing a smaller coat: the report was accurate about a decision
      // the selection did not make.
      const relaxed: string[] = [];
      let pool = named;

      if (opts.families?.length) {
        const next = pool.filter((t) => opts.families!.includes(t.family));
        if (next.length) pool = next;
        else relaxed.push('family');
      }

      if (opts.difficulties?.length) {
        const next = pool.filter((t) => opts.difficulties!.includes(t.difficulty));
        if (next.length) pool = next;
        else relaxed.push('difficulty');
      }

      return { technique: rng.pick(pool), relaxed };
    }
  }

  const relaxed: string[] = [];
  let pool = usable;

  if (opts.families?.length) {
    const wanted = new Set(opts.families);
    const next = pool.filter((t) => wanted.has(t.family));
    if (next.length) pool = next;
    else relaxed.push('family');
  }

  if (opts.difficulties?.length) {
    const wanted = new Set(opts.difficulties);
    const next = pool.filter((t) => wanted.has(t.difficulty));
    if (next.length) pool = next;
    else relaxed.push('difficulty');
  }

  return { technique: rng.pick(pool), relaxed };
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

/**
 * The instruction, in the reader's language.
 *
 * The language switch reached the navigation and the surrounding page but not
 * this line, so choosing Indonesian left the one sentence that actually tells
 * you what to do in English. From the reader's side that is not a partial
 * translation, it is a switch that does not work — the chrome changes and the
 * task does not.
 *
 * Technique names stay as they are. "Playfair" and "Vigenère" are proper names,
 * and the catalogue's mechanism descriptions are deliberately left in English
 * because a half-accurate translation of how a cipher works teaches the wrong
 * method. A key label is translated where the dictionary has it and left alone
 * where it does not, which is honest either way.
 */
function buildPrompt(
  technique: Technique,
  keyFields: { label: string; value?: string; disclosed: boolean }[],
  locale: 'en' | 'id' = 'en',
): string {
  const disclosed = keyFields.filter((f) => f.disclosed);

  // Three states, not two. The version with two told thirty-six keyless
  // techniques — ROT13, Atbash, A1Z26, reverse writing, every Base encoding —
  // that "the key is not supplied, recover it as part of your working", because
  // an empty list of disclosed fields was read as a withheld key rather than as
  // no key at all.
  //
  // Four of the six methods in the first-problem pool are keyless, so beginner
  // mode promised the key was shown and then set students hunting for one that
  // does not exist. Somebody who already knows ROT13 sees a wording slip;
  // somebody meeting it for the first time concludes they have missed something
  // and stops. The people worst served were the ones the mode exists for.
  const state = keyFields.length === 0 ? 'none' : disclosed.length ? 'given' : 'withheld';

  if (locale === 'id') {
    const known =
      state === 'given'
        ? ` Anda diberi ${disclosed.map((d) => d.label.toLowerCase()).join(' dan ')}.`
        : state === 'withheld'
          ? ' Kuncinya tidak diberikan — temukan sendiri sebagai bagian dari pengerjaan.'
          : ' Metode ini tidak memakai kunci: caranya selalu sama.';
    return `Pulihkan pesan aslinya dari cipherteks di bawah ini. Pesan itu disandikan dengan ${technique.name}.${known}`;
  }

  const known =
    state === 'given'
      ? ` You are given ${disclosed.map((d) => d.label.toLowerCase()).join(' and ')}.`
      : state === 'withheld'
        ? ' The key is not supplied — recover it as part of your working.'
        : ' This method takes no key: the procedure is always the same.';
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
/**
 * What a first problem is allowed to ask.
 *
 * Calibrated against the exercises in the course this is used alongside, which
 * were supplied as the standard to match. Their shape is consistent: a
 * rule-based question gives five IF-THEN rules and asks you to chain them; a
 * Naive Bayes question multiplies four fractions and compares two numbers; a
 * k-means question walks ten points against three centroids. Everything needed
 * is on the page, the procedure is a handful of steps, and the data is small.
 *
 * Beginner mode was not that. It drew forty-six letters on average — around ten
 * times the hand-work of any exercise in those decks — and two of its seven
 * techniques asked for machinery the course never teaches. Affine decryption
 * needs a modular multiplicative inverse. Keyword substitution needs a
 * twenty-six letter alphabet built and then read backwards. Neither is
 * conceptually beyond a final-year student; both are far past a *first*
 * problem, and a first problem that takes twenty minutes is where people stop.
 *
 * What is left is one mechanical step each, with the key in hand: shift,
 * mirror, count, or read in a different order.
 */
export const BEGINNER_POOL: readonly string[] = Object.freeze([
  'caesar',
  'atbash',
  'rot13',
  'a1z26',
  'reverse',
]);

/**
 * Techniques that belong in the catalogue but cannot be set as problems.
 *
 * Two different reasons, and both end with a student staring at a box they
 * cannot work from.
 *
 * ROT5 and quoted-printable hand over the plaintext almost verbatim, so the
 * question answers itself.
 *
 * The two steganography entries are worse, and were reported from a screenshot
 * of a real quiz: their whole point is that the ciphertext is invisible. A
 * zero-width problem renders 112 characters of nothing, and the whitespace one
 * renders 120 spaces and tabs. The page said "12 karakter" above an empty
 * frame. Nothing threw, the marking was correct, the answer key was real — and
 * the question could not be attempted by anybody, which makes it worse than an
 * error, because from the outside it looks like the tool is lying.
 *
 * They stay in the catalogue and in the workbench, where you can select the
 * output and paste it somewhere that shows it. What they cannot be is a
 * question somebody is expected to read off a projector.
 */
const NOT_AS_PROBLEMS = new Set([
  'rot5',
  'quoted-printable',
  'zero-width-stego',
  'whitespace-stego',
]);

/** The same set, for anything that offers a list of techniques to choose from. */
export const UNUSABLE_AS_PROBLEMS: ReadonlySet<string> = NOT_AS_PROBLEMS;

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
  const { technique, relaxed } = pickTechnique(opts, rng);

  // A beginner problem is short for the same reason the course's exercises are
  // small: the point is whether the method is understood, and forty-six letters
  // of correct substitution demonstrates stamina instead.
  // A first problem gets one word, not a sentence: the same single step
  // repeated fifteen times is not more cryptography, only more places to
  // lose your count.
  const bank = opts.beginner ? TINY : VERBOSE.has(technique.id) ? SHORT : ALL_PLAINTEXTS;
  const plaintext = opts.plaintext?.trim() || rng.pick(bank);

  let key = randomKey(technique.keySpec, rng);
  key = completeKey(technique, key, plaintext, rng);

  const normalised = technique.normalise(plaintext, key);
  const encoded = technique.encode(plaintext, key);
  const decoded = technique.decode(encoded.output, key);

  const disclose = new Set(DISCLOSE_KEY_FIELD[technique.id] ?? []);
  const keyFields = technique.keySpec
    .filter((f) => f.kind !== 'none')
    .map((f) => {
      const shown = opts.discloseKey || disclose.has(f.name);
      return {
        label: f.label,
        disclosed: shown,
        value: shown ? String(key[f.name]) : undefined,
      };
    });

  return {
    publicPart: {
      id: `${technique.id}-${seed}`,
      seed,
      techniqueId: technique.id,
      techniqueName: technique.name,
      family: technique.family,
      difficulty: technique.difficulty,
      era: technique.era,
      // A technique with an Indonesian entry is read in Indonesian; one without
      // falls back to the English beside its implementation. The list is
      // deliberately partial and the fallback is what keeps that honest.
      summary: (opts.locale === 'id' && TECHNIQUE_ID[technique.id]?.summary) || technique.summary,
      theory: (opts.locale === 'id' && TECHNIQUE_ID[technique.id]?.theory) || technique.theory,
      prompt: buildPrompt(technique, keyFields, opts.locale ?? 'en'),
      ciphertext: encoded.output,
      keyFields,
      plaintextLength: normalised.length,
      relaxed,
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
