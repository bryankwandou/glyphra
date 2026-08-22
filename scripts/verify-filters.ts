/**
 * The generator honours what it was asked for.
 *
 * This exists because it did not. Selecting the Hill cipher by name while
 * monoalphabetic substitution and difficulty 1 were also ticked returned a
 * Gronsfeld problem at difficulty 2 — every filter silently discarded, nothing
 * on screen admitting it, and the person left believing the tool had answered
 * their request. It was reported from a screenshot, not caught by any check,
 * which is the part worth fixing permanently.
 *
 * The rule being asserted: a named technique wins outright, satisfiable filters
 * are obeyed, and anything that has to be set aside is reported rather than
 * dropped in silence.
 *
 *   npm run verify:filters
 */
import { generateChallenge, UNUSABLE_AS_PROBLEMS, BEGINNER_POOL } from '../src/lib/generator';
import { TECHNIQUES, REVERSIBLE } from '../src/lib/ciphers';
import type { Difficulty, Family } from '../src/lib/ciphers/types';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`[${what}] ${detail}`);

const RUNS = 25;

/* ------------------------------------------- 1. a named technique is honoured */

const named = ['hill-2x2', 'caesar', 'enigma', 'adfgvx', 'playfair', 'bifid', 'rail-fence'];

for (const id of named) {
  for (let i = 0; i < RUNS; i++) {
    const { publicPart } = generateChallenge({ techniqueIds: [id], seed: `named-${id}-${i}` });
    if (publicPart.techniqueId !== id) {
      fail('named technique', `asked for ${id}, received ${publicPart.techniqueId}`);
      break;
    }
  }
}

/* --------------- 2. a named technique still wins against contradictory filters */

// This is the exact combination from the report.
for (let i = 0; i < RUNS; i++) {
  const { publicPart } = generateChallenge({
    techniqueIds: ['hill-2x2'],
    families: ['substitution'] as Family[],
    difficulties: [1] as Difficulty[],
    seed: `clash-${i}`,
  });
  if (publicPart.techniqueId !== 'hill-2x2') {
    fail('contradiction', `hill-2x2 with clashing filters gave ${publicPart.techniqueId}`);
    break;
  }
  if (!publicPart.relaxed.includes('family') || !publicPart.relaxed.includes('difficulty')) {
    fail('silent override', `filters were set aside without being reported: ${JSON.stringify(publicPart.relaxed)}`);
    break;
  }
}

/* ------------------------------- 3. satisfiable filters are actually respected */

const FAMILIES: Family[] = [
  'substitution', 'polyalphabetic', 'transposition', 'encoding', 'fractionation',
];

for (const family of FAMILIES) {
  for (let i = 0; i < RUNS; i++) {
    const { publicPart } = generateChallenge({ families: [family], seed: `fam-${family}-${i}` });
    if (publicPart.family !== family) {
      fail('family filter', `asked for ${family}, received ${publicPart.family}`);
      break;
    }
    if (publicPart.relaxed.length) {
      fail('needless relaxation', `${family} is satisfiable but reported ${JSON.stringify(publicPart.relaxed)}`);
      break;
    }
  }
}

for (const d of [1, 2, 3, 4, 5] as Difficulty[]) {
  for (let i = 0; i < RUNS; i++) {
    const { publicPart } = generateChallenge({ difficulties: [d], seed: `diff-${d}-${i}` });
    if (publicPart.difficulty !== d) {
      fail('difficulty filter', `asked for ${d}, received ${publicPart.difficulty}`);
      break;
    }
  }
}

/* ------------------------------------------ 4. combinations that can both hold */

// "Satisfiable" has to mean satisfiable by something the generator will
// actually set. Barring the two invisible steganography entries made
// steganography-at-difficulty-3 impossible, and this list still called it
// possible, so the check demanded a problem that no longer exists. A verifier
// carrying its own stale model of the catalogue reports the wrong failure.
const combos: { family: Family; difficulty: Difficulty }[] = [];
for (const t of REVERSIBLE) {
  if (UNUSABLE_AS_PROBLEMS.has(t.id)) continue;
  if (!combos.some((c) => c.family === t.family && c.difficulty === t.difficulty)) {
    combos.push({ family: t.family, difficulty: t.difficulty });
  }
}

for (const combo of combos) {
  const { publicPart } = generateChallenge({
    families: [combo.family],
    difficulties: [combo.difficulty],
    seed: `combo-${combo.family}-${combo.difficulty}`,
  });
  if (publicPart.family !== combo.family || publicPart.difficulty !== combo.difficulty) {
    fail(
      'satisfiable combination',
      `${combo.family} + d${combo.difficulty} exists in the catalogue but produced ` +
        `${publicPart.family} + d${publicPart.difficulty}`,
    );
  }
  if (publicPart.relaxed.length) {
    fail('needless relaxation', `${combo.family} + d${combo.difficulty} reported ${JSON.stringify(publicPart.relaxed)}`);
  }
}

/* -------------------------------- 5. impossible combinations say what they drop */

const impossible: { family: Family; difficulty: Difficulty }[] = [];
for (const family of FAMILIES) {
  for (const d of [1, 2, 3, 4, 5] as Difficulty[]) {
    const exists = REVERSIBLE.some((t) => t.family === family && t.difficulty === d);
    if (!exists) impossible.push({ family, difficulty: d });
  }
}

for (const combo of impossible) {
  const { publicPart } = generateChallenge({
    families: [combo.family],
    difficulties: [combo.difficulty],
    seed: `imp-${combo.family}-${combo.difficulty}`,
  });
  if (!publicPart.relaxed.length) {
    fail(
      'unreported override',
      `${combo.family} + d${combo.difficulty} cannot both hold, but nothing was reported`,
    );
  }
  // The family is the broader intent and should be the one kept.
  if (publicPart.family !== combo.family) {
    fail(
      'wrong constraint dropped',
      `${combo.family} + d${combo.difficulty} abandoned the family instead of the difficulty`,
    );
  }
}

/* -------------------------------------- 6. beginner mode really shows the key */

let keyed = 0;
let checked = 0;
for (const t of REVERSIBLE) {
  const usable = t.keySpec.filter((f) => f.kind !== 'none' && f.kind !== 'pad');
  if (!usable.length) continue;
  checked++;
  const { publicPart } = generateChallenge({
    techniqueIds: [t.id],
    discloseKey: true,
    seed: `beg-${t.id}`,
  });
  const shown = publicPart.keyFields.filter((f) => f.disclosed && f.value);
  if (shown.length === publicPart.keyFields.length && shown.length > 0) keyed++;
  else {
    fail('beginner mode', `${t.id} withheld a key field even with disclosure requested`);
  }
}

/* ------------------------------------------ 7. a supplied message is the one used */

for (const id of ['caesar', 'vigenere', 'rail-fence', 'base64']) {
  const mine = 'SERANG SAAT FAJAR';
  const { solution } = generateChallenge({ techniqueIds: [id], plaintext: mine, seed: 'own' });
  const stripped = solution.plaintext.replace(/\s+/g, '').toUpperCase();
  const wanted = mine.replace(/\s+/g, '').toUpperCase();
  if (!stripped.startsWith(wanted.slice(0, 10))) {
    fail('own message', `${id} did not use the supplied text (got "${solution.plaintext}")`);
  }
}

/* ------------ a list of techniques is narrowed by the other filters, not just
                checked against them ------------------------------------------- */

/**
 * Beginner mode supplies a seven-technique list rather than one name, and this
 * is where the old rule leaked. It asked whether *any* named technique matched
 * the family, reported nothing when one did, then drew from the whole list —
 * so ticking Transposition against the beginner pool, where rail-fence is the
 * one honest answer, returned Atbash while claiming nothing had been set aside.
 *
 * A report that is accurate about a decision the selection never made is worse
 * than no report, because it is evidence for a claim that is false.
 */
const BEGINNER = ['caesar', 'atbash', 'rot13', 'affine', 'keyword', 'rail-fence', 'a1z26'];

for (const family of FAMILIES) {
  const possible = TECHNIQUES.filter(
    (t) => BEGINNER.includes(t.id) && t.family === family,
  );

  for (let i = 0; i < RUNS; i++) {
    const { publicPart } = generateChallenge({
      techniqueIds: BEGINNER,
      families: [family],
      seed: `narrow-${family}-${i}`,
    });

    const relaxed = publicPart.relaxed ?? [];

    if (possible.length) {
      // The intersection exists, so it has to be used and nothing reported.
      if (publicPart.family !== family) {
        fail(
          'narrowing',
          `a list containing ${possible.map((t) => t.id).join(', ')} was asked for ` +
            `${family} and returned ${publicPart.techniqueId} (${publicPart.family})`,
        );
        break;
      }
      if (relaxed.includes('family')) {
        fail('narrowing', `${family} was satisfiable from the list but reported as set aside`);
        break;
      }
    } else if (!relaxed.includes('family')) {
      // No intersection, so it must say so rather than quietly substituting.
      fail(
        'narrowing',
        `no technique in the list is ${family}, yet ${publicPart.techniqueId} came back ` +
          `with nothing reported as set aside`,
      );
      break;
    }
  }
}

// The same rule for difficulty inside a supplied list.
for (const d of [1, 2, 3, 4, 5] as Difficulty[]) {
  const possible = TECHNIQUES.filter((t) => BEGINNER.includes(t.id) && t.difficulty === d);
  for (let i = 0; i < RUNS; i++) {
    const { publicPart } = generateChallenge({
      techniqueIds: BEGINNER,
      difficulties: [d],
      seed: `narrowd-${d}-${i}`,
    });
    const relaxed = publicPart.relaxed ?? [];
    if (possible.length) {
      if (publicPart.difficulty !== d) {
        fail('narrowing', `difficulty ${d} was satisfiable from the list but got ${publicPart.difficulty}`);
        break;
      }
    } else if (!relaxed.includes('difficulty')) {
      fail('narrowing', `difficulty ${d} is impossible from the list but was not reported`);
      break;
    }
  }
}

/* --------------- every problem it will set can actually be read on screen --- */

/**
 * Reported from a screenshot of a live quiz: question three showed the heading
 * "Zero-width character steganography", the label "12 karakter", and an empty
 * frame. The ciphertext was 112 characters of invisible codepoints. Nothing
 * threw, the answer key was real, the marking was correct — and no student
 * could attempt it, which is worse than an error, because from the outside it
 * looks like the tool is inventing questions.
 *
 * A ciphertext is only a question if somebody can read it off a screen.
 */
const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿­᠎]/gu;

let readable = 0;
for (const t of REVERSIBLE) {
  let ciphertext = '';
  try {
    ciphertext = generateChallenge({ techniqueIds: [t.id], seed: `readable:${t.id}` })
      .publicPart.ciphertext;
  } catch {
    continue;
  }

  const visible = ciphertext.replace(INVISIBLE, '').trim().length;

  if (UNUSABLE_AS_PROBLEMS.has(t.id)) continue;

  if (visible === 0) {
    fail(
      'unreadable',
      `${t.id} is offered as a problem but its ciphertext has no visible characters ` +
        `(${ciphertext.length} produced). A student would see an empty box. Add it to ` +
        `NOT_AS_PROBLEMS or give it a printable representation.`,
    );
  } else readable++;
}

// The band-drawn pools are what quizzes use, so check those the same way.
for (let i = 0; i < RUNS * 4; i++) {
  const { publicPart } = generateChallenge({ seed: `bandreadable:${i}` });
  if (publicPart.ciphertext.replace(INVISIBLE, '').trim().length === 0) {
    fail('unreadable', `a plain draw produced an unreadable problem: ${publicPart.techniqueId}`);
    break;
  }
}

/* ------------------- a first problem stays the size of a first problem ------ */

/**
 * Calibrated against the course exercises that were handed over as the
 * standard: five IF-THEN rules to chain, four fractions to multiply, ten points
 * against three centroids. Small data, everything supplied, a handful of steps.
 *
 * Beginner mode used to draw forty-six letters on average and included affine
 * (needs a modular inverse) and keyword substitution (needs a twenty-six letter
 * table built and read backwards). Neither is beyond a final-year student and
 * both are far past a *first* problem. This keeps the size honest, because
 * length creeps back the moment nobody is measuring it.
 */
let beginnerTotal = 0;
for (const id of BEGINNER_POOL) {
  for (let i = 0; i < 8; i++) {
    const { publicPart, solution } = generateChallenge({
      techniqueIds: [id],
      seed: `beginnersize:${id}:${i}`,
      discloseKey: true,
      beginner: true,
    });

    const letters = solution.plaintext.replace(/[^A-Za-z0-9]/g, '').length;
    beginnerTotal += letters;

    if (letters > 22) {
      fail(
        'beginner size',
        `${id} set a first problem of ${letters} letters ("${solution.plaintext}"). The ` +
          `exercises this is calibrated against are five rules or four fractions; twenty-two ` +
          `letters is already the outer edge of comparable.`,
      );
      break;
    }

    // Beginner means the key is in your hand. Recovering an unknown key first is
    // a second lesson, not the first one.
    const withheld = publicPart.keyFields.filter((f) => !f.disclosed);
    if (withheld.length) {
      fail(
        'beginner key',
        `${id} withheld ${withheld.map((f) => f.label).join(', ')} in beginner mode`,
      );
      break;
    }

    if (publicPart.difficulty > 2) {
      fail('beginner difficulty', `${id} is difficulty ${publicPart.difficulty} in the first-problem pool`);
      break;
    }
  }
}

// The two that were removed must stay removed, and for the stated reason.
for (const id of ['affine', 'keyword']) {
  if (BEGINNER_POOL.includes(id)) {
    fail(
      'beginner pool',
      `${id} is back in the first-problem pool; it needs machinery the course does not teach`,
    );
  }
}

/* -------------------------------------------------------------------- output */

console.log('\nGenerator honours its filters\n');
console.log(`  named techniques checked        ${named.length}`);
console.log(`  families checked                ${FAMILIES.length}`);
console.log(`  satisfiable combinations        ${combos.length}`);
console.log(`  impossible combinations         ${impossible.length}`);
console.log(`  techniques keyed in beginner    ${keyed}/${checked}`);
console.log(`  catalogue size                  ${TECHNIQUES.length}`);
console.log(`  list-narrowing cases            ${FAMILIES.length + 5}`);
console.log(`  readable as a problem           ${readable}`);
console.log(`  barred as unreadable            ${UNUSABLE_AS_PROBLEMS.size}`);
console.log(`  first-problem average length    ${Math.round(beginnerTotal / (BEGINNER_POOL.length * 8))} letters`);

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log('\nEvery filter is either honoured or reported as set aside.\n');
