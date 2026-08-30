/**
 * Choosing Indonesian changes the words, not only the navigation.
 *
 * Reported from a screenshot: the header, the menu and the question text were
 * all Indonesian while the entire control panel beside them — "Set the problem",
 * "Beginner mode", "DIFFICULTY", "FAMILY", "New problem" — stayed in English.
 * A switch that translates the chrome and leaves the working surface alone is
 * not a partial translation from the reader's side. It is a switch that appears
 * not to work, and it is worse than no switch, because it invites the reader to
 * trust a setting that half-applies.
 *
 * This walks the dictionary structurally rather than checking a handful of
 * strings by hand. Anything added to the English side and forgotten on the
 * Indonesian side fails here rather than in front of a class.
 *
 *   npm run verify:language
 */
import { DICT, LOCALES } from '../src/lib/i18n/dict';
import { generateChallenge, BEGINNER_POOL } from '../src/lib/generator';
import { TECHNIQUES } from '../src/lib/ciphers';
import { TECHNIQUE_ID } from '../src/lib/i18n/techniques';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`[${what}] ${detail}`);

/* ------------------------------------------- 1. both dictionaries agree in shape */

type Node = Record<string, unknown>;

/** Every leaf in one dictionary exists in the other, at the same path. */
function compare(a: Node, b: Node, path: string[] = []): number {
  let leaves = 0;

  for (const key of Object.keys(a)) {
    const here = [...path, key].join('.');
    const av = a[key];
    const bv = b[key];

    if (bv === undefined) {
      fail('missing', `id has no ${here}`);
      continue;
    }

    if (typeof av !== typeof bv) {
      fail('shape', `${here} is ${typeof av} in en and ${typeof bv} in id`);
      continue;
    }

    if (typeof av === 'object' && av !== null) {
      leaves += compare(av as Node, bv as Node, [...path, key]);
      continue;
    }

    leaves++;

    if (typeof av === 'string') {
      if (!av.trim()) fail('empty', `${here} is blank in en`);
      if (!(bv as string).trim()) fail('empty', `${here} is blank in id`);
    }
  }

  for (const key of Object.keys(b)) {
    if (a[key] === undefined) fail('extra', `id has ${[...path, key].join('.')} and en does not`);
  }

  return leaves;
}

const leaves = compare(
  DICT.en as unknown as Node,
  DICT.id as unknown as Node,
);

/* ------------------------------- 2. the Indonesian side is actually translated */

/**
 * A copied English string is the failure this is really watching for, because
 * it is invisible: the key exists, the type checks, and the page renders
 * English while claiming to be Indonesian.
 *
 * Short shared words are not evidence of anything — "Base64", "Enigma", "ID"
 * are the same in both — so only strings long enough to carry a sentence are
 * compared, and a small set of proper nouns is allowed through.
 */
const SAME_ON_PURPOSE = new Set(['Glyphra', 'Solana', 'QR', 'API', 'Vercel']);

function untranslated(a: Node, b: Node, path: string[] = []): number {
  let same = 0;
  for (const key of Object.keys(a)) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'object' && av !== null && typeof bv === 'object' && bv !== null) {
      same += untranslated(av as Node, bv as Node, [...path, key]);
      continue;
    }
    if (typeof av !== 'string' || typeof bv !== 'string') continue;
    if (av.length < 25) continue;
    if (SAME_ON_PURPOSE.has(av.trim())) continue;

    if (av === bv) {
      same++;
      fail(
        'untranslated',
        `${[...path, key].join('.')} is the same in both: "${av.slice(0, 56)}…"`,
      );
    }
  }
  return same;
}

untranslated(DICT.en as unknown as Node, DICT.id as unknown as Node);

/* --------------------------- 3. the question text follows the chosen language */

for (const id of BEGINNER_POOL) {
  const en = generateChallenge({ techniqueIds: [id], seed: `lang:${id}`, discloseKey: true, locale: 'en' });
  const idn = generateChallenge({ techniqueIds: [id], seed: `lang:${id}`, discloseKey: true, locale: 'id' });

  if (en.publicPart.prompt === idn.publicPart.prompt) {
    fail('prompt', `${id} produces the same instruction in both languages`);
  }
  if (!/^Pulihkan pesan aslinya/.test(idn.publicPart.prompt)) {
    fail('prompt', `${id} in Indonesian starts "${idn.publicPart.prompt.slice(0, 40)}…"`);
  }
  if (!/^Recover the plaintext/.test(en.publicPart.prompt)) {
    fail('prompt', `${id} in English starts "${en.publicPart.prompt.slice(0, 40)}…"`);
  }

  // Changing the language must not change the problem itself. If it did, two
  // students in one room would sit different papers from the same code.
  if (en.publicPart.ciphertext !== idn.publicPart.ciphertext) {
    fail('drift', `${id} produces a different ciphertext per language`);
  }
  if (en.solution.plaintext !== idn.solution.plaintext) {
    fail('drift', `${id} produces a different answer per language`);
  }
}

/* ------------------------------- 3. every technique explains itself in both */

// The overlay falls back to English when an entry is missing, which is the
// right behaviour at runtime and the wrong thing to rely on: nothing breaks, so
// nobody notices, and the gap sits in front of a student instead. A technique
// added without Indonesian prose stops the build here.
let explained = 0;
for (const t of TECHNIQUES) {
  const prose = TECHNIQUE_ID[t.id];
  if (!prose) {
    fail('untranslated', `${t.id} has no Indonesian summary or theory`);
    continue;
  }
  if (!prose.summary.trim()) fail('untranslated', `${t.id} has an empty summary`);
  if (!prose.theory.trim()) fail('untranslated', `${t.id} has an empty theory`);

  // A copied English paragraph passes a presence check and fails a reader.
  if (prose.summary === t.summary) fail('copied', `${t.id} summary is still the English one`);
  if (prose.theory === t.theory) fail('copied', `${t.id} theory is still the English one`);
  explained += 1;
}

/* -------------------------------------------------------------------- output */

console.log('\nBoth languages\n');
console.log(`  locales                        ${LOCALES.join(', ')}`);
console.log(`  phrases checked in each        ${leaves}`);
console.log(`  first-problem methods compared ${BEGINNER_POOL.length}`);
console.log(`  techniques explained in both    ${explained} of ${TECHNIQUES.length}`);

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n`);
  for (const f of failures.slice(0, 30)) console.error(`  ${f}`);
  if (failures.length > 30) console.error(`  … and ${failures.length - 30} more`);
  console.error('');
  process.exit(1);
}

console.log('\nEvery phrase exists in both, and the question follows the choice.\n');
