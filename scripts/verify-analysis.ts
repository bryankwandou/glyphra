/**
 * The analysis tools, against texts whose answers are known in advance.
 *
 * A panel of numbers is worse than no panel if the numbers are wrong: a student
 * cannot tell a broken index of coincidence from a hard problem, and will
 * conclude they are bad at the subject. So every measurement here is checked
 * against a case where the right answer is known before the code runs — English
 * prose scores near 0.066, random letters near 0.038, a substitution keeps the
 * score it started with, a Vigenère drops it, and the shift and key length are
 * recovered rather than asserted.
 *
 *   npm run verify:analysis
 */
import {
  frequency,
  indexOfCoincidence,
  kasiski,
  caesarFit,
  read,
  letters,
  IOC_ENGLISH,
  IOC_RANDOM,
} from '../src/lib/analysis';

let passed = 0;
const failures: string[] = [];

function chk(label: string, got: unknown, want: unknown) {
  if (String(got) === String(want)) {
    console.log(`    ok    ${label.padEnd(52)}${got}`);
    passed++;
  } else {
    console.log(`    FAIL  ${label.padEnd(52)}got ${got}, want ${want}`);
    failures.push(label);
  }
}

function near(label: string, got: number, want: number, tolerance: number) {
  const ok = Math.abs(got - want) <= tolerance;
  if (ok) {
    console.log(`    ok    ${label.padEnd(52)}${got.toFixed(4)}`);
    passed++;
  } else {
    console.log(`    FAIL  ${label.padEnd(52)}got ${got.toFixed(4)}, want ~${want} ±${tolerance}`);
    failures.push(label);
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* A few hundred letters of ordinary English, so the statistics have something
   to stand on. Short samples are noise, which is the point of the last check. */
const PROSE = letters(`
  The art of writing in secret is older than the art of writing about it, and for
  most of that history the two have moved together. A method is invented, it is
  praised as unbreakable, it is used for a generation, and then somebody notices
  that the letters of a language do not appear with equal frequency and the whole
  edifice comes down in an afternoon. The lesson is repeated so often that it has
  become the first thing a student of the subject is taught, and it is still the
  first thing a designer of a new system forgets. Nothing about a cipher is proved
  by the fact that its author cannot break it.
`);

function caesar(text: string, shift: number): string {
  return letters(text).replace(/[A-Z]/g, (c) =>
    ALPHABET[(ALPHABET.indexOf(c) + shift) % 26]);
}

function vigenere(text: string, key: string): string {
  const only = letters(text);
  const k = letters(key);
  return only.replace(/[A-Z]/g, (c, i: number) =>
    ALPHABET[(ALPHABET.indexOf(c) + ALPHABET.indexOf(k[i % k.length])) % 26]);
}

/** A fixed letter-for-letter swap: unreadable, but statistically untouched. */
function substitute(text: string): string {
  const to = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  return letters(text).replace(/[A-Z]/g, (c) => to[ALPHABET.indexOf(c)]);
}

/**
 * Deterministic pseudo-random letters, so the run is reproducible.
 *
 * Taking a linear congruential generator modulo 26 reads its low bits, which
 * cycle with a short period and are not random at all — the first version of
 * this scored 0.048 and made the check fail against correct code. xorshift, and
 * the high bits, because the sample has to actually be flat for the assertion
 * about flatness to mean anything.
 */
function randomLetters(n: number): string {
  let x = 2463534242;
  let out = '';
  for (let i = 0; i < n; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    out += ALPHABET[(x >>> 8) % 26];
  }
  return out;
}

console.log('\nCryptanalysis tools\n');

/* ------------------------------------------- 1. the index of coincidence --- */
console.log('  1. the number that tells you which kind of cipher you have\n');

near('English prose scores near 0.066', indexOfCoincidence(PROSE), IOC_ENGLISH, 0.008);
near('random letters score near 0.038', indexOfCoincidence(randomLetters(600)), IOC_RANDOM, 0.008);

/* A substitution renames letters without changing how lopsided they are, so the
   score must survive it almost exactly. This is the property the whole technique
   rests on, and it is the one worth asserting hardest. */
const substituted = substitute(PROSE);
near('a substitution keeps the score it started with',
  indexOfCoincidence(substituted), indexOfCoincidence(PROSE), 0.0001);
chk('  even though the text is unreadable',
  substituted.slice(0, 10) === PROSE.slice(0, 10), false);

const enciphered = vigenere(PROSE, 'PALIMPSEST');
const dropped = indexOfCoincidence(enciphered) < indexOfCoincidence(PROSE) - 0.015;
chk('a Vigenere drags the score down toward random', dropped, true);

/* ---------------------------------------------------- 2. the conclusion --- */
console.log('\n  2. the conclusion drawn from it\n');

chk('prose reads as monoalphabetic', read(PROSE).verdict, 'monoalphabetic');
chk('a substitution still reads as monoalphabetic', read(substituted).verdict, 'monoalphabetic');
chk('a Vigenere reads as polyalphabetic', read(enciphered).verdict, 'polyalphabetic');

/* Thirty letters cannot support any of this. Saying so is the difference between
   a tool and a number generator — and a confident answer on a tiny sample is the
   same fault as a check that passes on an empty one. */
chk('thirty letters is called inconclusive', read(PROSE.slice(0, 30)).verdict, 'inconclusive');
chk('  and is flagged as unreliable', read(PROSE.slice(0, 30)).reliable, false);

/* ------------------------------------------------- 3. recovering a shift --- */
console.log('\n  3. the key recovered, not assumed\n');

let shiftsFound = 0;
for (let s = 1; s < 26; s++) {
  if (caesarFit(caesar(PROSE, s))[0].shift === s) shiftsFound++;
}
chk('every Caesar shift is recovered from the text alone', shiftsFound, 25);

const best = caesarFit(caesar(PROSE, 7))[0];
chk('  and the best fit reads as English', best.preview.startsWith('THEARTOFWRITING'), true);

/* -------------------------------------------------- 4. Kasiski on a key --- */
console.log('\n  4. the key length, from repeats alone\n');

for (const key of ['PALIMPSEST', 'ORACLE', 'KEY']) {
  const ct = vigenere(PROSE, key);
  const top = kasiski(ct).slice(0, 5).map((g) => g.length);
  const found = top.includes(key.length);
  chk(`"${key}" (${key.length}) is among the top five guesses`, found, true);
  if (!found) console.log(`            top five were ${top.join(', ')}`);
}

/* ------------------------------------------------------ 5. the frequencies */
console.log('\n  5. the letter counts themselves\n');

const f = frequency(PROSE);
/* E and T lead English, but which of the two comes first is a fact about the
   sample, not about the language — this passage is thick with "the", and T wins
   it. Asserting E first would be asserting something untrue about the text. */
const leaders = [f[0].letter, f[1].letter].sort().join('');
chk('E and T are the two commonest letters', leaders, 'ET');
chk('all 26 letters are reported, not just the ones present', f.length, 26);
const total = f.reduce((sum, l) => sum + l.share, 0);
near('the shares sum to one', total, 1, 0.0001);

const empty = frequency('');
chk('an empty text reports zeroes rather than NaN',
  empty.every((l) => l.share === 0 && l.count === 0), true);
chk('  and its index of coincidence is zero', indexOfCoincidence(''), 0);

/* ------------------------------------------------------------------ output */
console.log(`\n  ${passed} passed, ${failures.length} failed`);

if (failures.length) {
  console.error('\n  wrong:');
  for (const f2 of failures) console.error(`    ${f2}`);
  console.error('');
  process.exit(1);
}

console.log('\nThe numbers say what they claim to say.\n');
