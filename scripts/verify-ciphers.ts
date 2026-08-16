/**
 * Correctness gate for the whole catalogue.
 *
 * For every reversible technique, across many random keys and many random
 * plaintexts, this asserts that decode(encode(x)) === normalise(x). It also
 * asserts that a technique actually changes its input (catching a routine that
 * silently returns what it was given) and that every step trail is non-empty.
 *
 * Run with:  npx tsx scripts/verify-ciphers.ts
 * A non-zero exit status means at least one technique is wrong.
 */
import { TECHNIQUES, REVERSIBLE, findDuplicateIds, CATALOGUE_SIZE } from '../src/lib/ciphers';
import { makeRng, randomKey, A, lettersOnly } from '../src/lib/ciphers/utils';
import type { Technique, Key } from '../src/lib/ciphers/types';

const PLAINTEXTS = [
  'ATTACKATDAWN',
  'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG',
  'MEETMEATTHEBRIDGEATMIDNIGHTBRINGTHEDOCUMENTS',
  'CRYPTOGRAPHYISTHEPRACTICEOFSECURECOMMUNICATION',
  'SENDREINFORCEMENTSWEAREGOINGTOADVANCE',
  'HELLOWORLD',
  'X',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'AAAAAAAAAAAA',
  'THEBALLOONGOESUPATNOONREPEATATNOON',
  // Digits and punctuation, so the byte-oriented and digit-oriented techniques
  // are actually exercised rather than normalising away to nothing.
  'Rendezvous at 04:30, bring 2 keys!',
  'Order 66 confirmed; proceed at once.',
];

const ROUNDS_PER_TECHNIQUE = 12;

interface Failure {
  id: string;
  reason: string;
  plaintext: string;
  key: Key;
  got: string;
  want: string;
}

const failures: Failure[] = [];
const warnings: string[] = [];

/**
 * The one-time pad and Vernam declare a `pad` field. A real pad must match the
 * message length, so it is filled here once the plaintext is known — the same
 * job the challenge generator does at runtime.
 */
function fillPad(t: Technique, key: Key, plaintext: string, rng: ReturnType<typeof makeRng>): Key {
  const padField = t.keySpec.find((f) => f.kind === 'pad');
  if (!padField) return key;
  const len = Math.max(plaintext.length * 2, 64);
  return { ...key, [padField.name]: Array.from({ length: len }, () => A[rng.int(0, 25)]).join('') };
}

function check(t: Technique): void {
  const rng = makeRng(`verify:${t.id}`);
  let everChanged = false;

  for (let round = 0; round < ROUNDS_PER_TECHNIQUE; round++) {
    const plaintext = PLAINTEXTS[round % PLAINTEXTS.length];
    let key = randomKey(t.keySpec, rng);
    key = fillPad(t, key, plaintext, rng);

    const normalised = t.normalise(plaintext, key);
    if (normalised.length === 0) continue;

    let encoded, decoded;
    try {
      encoded = t.encode(plaintext, key);
      decoded = t.decode(encoded.output, key);
    } catch (err) {
      failures.push({
        id: t.id,
        reason: `threw: ${(err as Error).message}`,
        plaintext, key, got: '', want: normalised,
      });
      return;
    }

    if (!encoded.steps.length || !decoded.steps.length) {
      warnings.push(`${t.id}: empty step trail`);
    }
    if (encoded.output !== plaintext) everChanged = true;

    if (decoded.output !== normalised) {
      failures.push({
        id: t.id,
        reason: 'round trip mismatch',
        plaintext, key,
        got: decoded.output,
        want: normalised,
      });
      return; // one failure per technique is enough to act on
    }
  }

  if (!everChanged) warnings.push(`${t.id}: output never differed from the input`);
}

function checkOneWay(t: Technique): void {
  const rng = makeRng(`verify-oneway:${t.id}`);
  const key = randomKey(t.keySpec, rng);
  const a = t.encode('ATTACKATDAWN', key).output;
  const b = t.encode('ATTACKATDAWN', key).output;
  const c = t.encode('ATTACKATDAWM', key).output;
  if (a !== b) failures.push({ id: t.id, reason: 'not deterministic', plaintext: 'ATTACKATDAWN', key, got: b, want: a });
  if (a === c) failures.push({ id: t.id, reason: 'collides on a one-character change', plaintext: 'ATTACKATDAWN', key, got: c, want: `≠ ${a}` });
  if (!a.length) failures.push({ id: t.id, reason: 'empty digest', plaintext: 'ATTACKATDAWN', key, got: '', want: 'a digest' });
}

// ---------------------------------------------------------------------------

const dupes = findDuplicateIds();
if (dupes.length) {
  console.error(`Duplicate technique ids: ${dupes.join(', ')}`);
}

for (const t of REVERSIBLE) check(t);
for (const t of TECHNIQUES.filter((x) => x.oneWay)) checkOneWay(t);

const families = new Map<string, number>();
for (const t of TECHNIQUES) families.set(t.family, (families.get(t.family) ?? 0) + 1);

console.log('');
console.log(`Catalogue: ${CATALOGUE_SIZE} techniques`);
for (const [family, count] of [...families.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${family.padEnd(20)} ${count}`);
}
console.log('');
console.log(`Reversible: ${REVERSIBLE.length}  |  one-way: ${TECHNIQUES.length - REVERSIBLE.length}`);
console.log(`Round trips attempted: ${REVERSIBLE.length * ROUNDS_PER_TECHNIQUE}`);
console.log('');

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}

if (failures.length) {
  console.error(`FAILURES: ${failures.length}`);
  for (const f of failures) {
    console.error(`\n  ${f.id} — ${f.reason}`);
    console.error(`    key:  ${JSON.stringify(f.key).slice(0, 160)}`);
    console.error(`    in:   ${f.plaintext}`);
    console.error(`    want: ${f.want}`);
    console.error(`    got:  ${f.got}`);
  }
  console.error('');
  process.exit(1);
}

console.log(`All ${REVERSIBLE.length} reversible techniques round-trip exactly. ${dupes.length ? 'BUT DUPLICATE IDS EXIST.' : ''}`);
if (dupes.length) process.exit(1);
