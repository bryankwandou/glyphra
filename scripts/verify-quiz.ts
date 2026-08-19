/**
 * Join codes and shared quizzes.
 *
 * The code is the only thing standing between a participant and the right quiz.
 * There is no database row to fall back on, so if the codec is wrong there is
 * nothing to reconcile against — a mis-decoded code silently opens a *different*
 * valid quiz rather than failing. The first version of this codec did exactly
 * that: it emitted its base-32 digits in reverse, and every code decoded to a
 * plausible quiz that was not the one shared.
 *
 *   npm run verify:quiz
 */
import { encodeQuizCode, decodeQuizCode, randomQuizSeed } from '../src/lib/quiz-code';
import { buildQuiz, quizAnswers, markQuiz } from '../src/lib/quiz';
import type { Difficulty } from '../src/lib/ciphers/types';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`[${what}] ${detail}`);

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const rand = (n: number) => Math.floor(Math.random() * n);

/* ------------------------------------------------------- 1. codec round trip */

const codes = new Set<string>();
let exact = 0;
const TRIPS = 4000;

for (let i = 0; i < TRIPS; i++) {
  const lo = (1 + rand(5)) as Difficulty;
  const hi = Math.max(lo, 1 + rand(5)) as Difficulty;
  const config = {
    seed: randomQuizSeed(),
    questions: 1 + rand(16),
    difficultyLow: lo,
    difficultyHigh: hi,
    minutes: rand(64),
  };
  const code = encodeQuizCode(config);
  codes.add(code);
  const back = decodeQuizCode(code);
  if (back && JSON.stringify(back) === JSON.stringify(config)) exact++;
}

if (exact !== TRIPS) {
  fail('codec round trip', `${TRIPS - exact} of ${TRIPS} configurations did not survive encoding`);
}

/* ------------------------------------------------------ 2. typo tolerance */

let typos = 0;
let caught = 0;
for (let i = 0; i < 3000; i++) {
  const raw = encodeQuizCode({
    seed: randomQuizSeed(),
    questions: 6,
    difficultyLow: 2,
    difficultyHigh: 4,
    minutes: 15,
  }).replace('-', '');
  const at = rand(8);
  const ch = ALPHABET[rand(32)];
  if (ch === raw[at]) continue;
  typos++;
  if (decodeQuizCode(raw.slice(0, at) + ch + raw.slice(at + 1)) === null) caught++;
}

// A four-bit checksum rejects fifteen sixteenths of random corruptions by
// itself; field validation catches more. Anything below ninety per cent means
// the checksum is not doing its job.
const typoRate = caught / typos;
if (typoRate < 0.9) {
  fail('typo tolerance', `only ${(typoRate * 100).toFixed(1)}% of single-character typos rejected`);
}

/* -------------------------------------------------------- 3. input tolerance */

const sample = encodeQuizCode({
  seed: 12345,
  questions: 5,
  difficultyLow: 2,
  difficultyHigh: 4,
  minutes: 20,
});
const canonical = JSON.stringify(decodeQuizCode(sample));
for (const variant of [sample.replace('-', ''), sample.toLowerCase(), ` ${sample} `, sample.replace('-', ' ')]) {
  if (JSON.stringify(decodeQuizCode(variant)) !== canonical) {
    fail('input tolerance', `"${variant}" did not decode the same as "${sample}"`);
  }
}

for (const junk of ['', 'ABC', 'ZZZZZZZZZZZZ', '!!!!!!!!', '        ']) {
  if (decodeQuizCode(junk) !== null) {
    fail('garbage rejection', `"${junk}" was accepted as a code`);
  }
}

/* ----------------------------------------------------- 4. quizzes themselves */

const SHAPES = [
  { questions: 5, difficultyLow: 1 as Difficulty, difficultyHigh: 3 as Difficulty, minutes: 10 },
  { questions: 10, difficultyLow: 2 as Difficulty, difficultyHigh: 5 as Difficulty, minutes: 0 },
  { questions: 1, difficultyLow: 4 as Difficulty, difficultyHigh: 4 as Difficulty, minutes: 5 },
  { questions: 16, difficultyLow: 1 as Difficulty, difficultyHigh: 5 as Difficulty, minutes: 45 },
];

const notes: string[] = [];

for (const shape of SHAPES) {
  const code = encodeQuizCode({ seed: randomQuizSeed(), ...shape });
  const quiz = buildQuiz(code);
  const answers = quizAnswers(code);

  if (!quiz || !answers) {
    fail('quiz build', `${code} did not produce a quiz`);
    continue;
  }

  if (quiz.questions.length !== shape.questions) {
    fail('question count', `${code} produced ${quiz.questions.length} of ${shape.questions}`);
  }

  // The one that matters most. Questions and answers come from a single pass,
  // and this asserts they stayed in step — misalignment marks everyone against
  // the wrong questions and reports no error at all.
  if (answers.length !== quiz.questions.length) {
    fail('alignment', `${code} has ${quiz.questions.length} questions but ${answers.length} answers`);
  }

  for (let i = 0; i < quiz.questions.length; i++) {
    const ct = quiz.questions[i].challenge.ciphertext.replace(/\s+/g, '').toUpperCase();
    const pt = answers[i].replace(/\s+/g, '').toUpperCase();
    if (ct === pt) {
      fail('no transformation', `${code} question ${i + 1} gives back the plaintext`);
    }
    if (!answers[i] || answers[i].length < 4) {
      fail('empty answer', `${code} question ${i + 1} has no answer`);
    }
  }

  // Rebuilding from the code must give the identical quiz, or a participant who
  // reloads the page mid-attempt gets different questions than they started.
  const rebuilt = buildQuiz(code);
  const same =
    JSON.stringify(rebuilt?.questions.map((q) => q.challenge.ciphertext)) ===
    JSON.stringify(quiz.questions.map((q) => q.challenge.ciphertext));
  if (!same) {
    fail('quiz determinism', `${code} produced different questions on a second build`);
  }

  // Marking: all correct scores 100, all blank scores 0.
  const perfect = markQuiz(code, answers);
  if (!perfect || perfect.score !== 100) {
    fail('marking', `${code} did not score 100 for a fully correct submission (got ${perfect?.score})`);
  }
  const blank = markQuiz(code, answers.map(() => ''));
  if (!blank || blank.score !== 0) {
    fail('marking', `${code} did not score 0 for a blank submission (got ${blank?.score})`);
  }

  // A partially correct attempt should land in between, not at an extreme.
  if (quiz.questions.length >= 4) {
    const half = answers.map((a, i) => (i % 2 === 0 ? a : 'not the answer'));
    const mid = markQuiz(code, half);
    if (!mid || mid.score === 0 || mid.score === 100) {
      fail('marking', `${code} scored ${mid?.score} for a half-correct submission`);
    }
  }

  const band = new Set(quiz.questions.map((q) => q.challenge.difficulty));
  for (const d of band) {
    if (d < shape.difficultyLow || d > shape.difficultyHigh) {
      fail('difficulty band', `${code} drew difficulty ${d}, outside ${shape.difficultyLow}-${shape.difficultyHigh}`);
    }
  }

  notes.push(
    `  ${code}  ${String(shape.questions).padStart(2)} questions, ` +
      `difficulty ${shape.difficultyLow}-${shape.difficultyHigh}, ` +
      `${shape.minutes ? shape.minutes + ' min' : 'untimed'}`,
  );
}

/* -------------------------------------------------------------------- output */

console.log('\nJoin codes and shared quizzes\n');
console.log(notes.join('\n'));
console.log(`\n  codec round trips     ${exact}/${TRIPS} exact`);
console.log(`  distinct codes seen   ${codes.size}`);
console.log(`  typos rejected        ${caught}/${typos} (${(typoRate * 100).toFixed(1)}%)`);

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log('\nAll quiz invariants hold.\n');
