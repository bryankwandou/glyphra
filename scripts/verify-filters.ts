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
import { generateChallenge } from '../src/lib/generator';
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

const combos: { family: Family; difficulty: Difficulty }[] = [];
for (const t of REVERSIBLE) {
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

/* -------------------------------------------------------------------- output */

console.log('\nGenerator honours its filters\n');
console.log(`  named techniques checked        ${named.length}`);
console.log(`  families checked                ${FAMILIES.length}`);
console.log(`  satisfiable combinations        ${combos.length}`);
console.log(`  impossible combinations         ${impossible.length}`);
console.log(`  techniques keyed in beginner    ${keyed}/${checked}`);
console.log(`  catalogue size                  ${TECHNIQUES.length}`);

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log('\nEvery filter is either honoured or reported as set aside.\n');
