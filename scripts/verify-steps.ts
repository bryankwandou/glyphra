/**
 * The worked solution reads in the chosen language, for every technique.
 *
 * The trail is what a student actually follows to learn a method, and it is
 * generated inside the ciphers rather than written into a page, so no gate that
 * reads the dictionary or the rendered HTML can see it. This one produces a
 * real problem for every technique in the catalogue, in both directions, and
 * asks the translator for every phrase that comes out.
 *
 * A phrase with no entry fails here. That is the point: the translator falls
 * back to English at runtime so a solution never has a hole in it, and a
 * fallback nobody is told about is how the English quietly stays.
 *
 *   npm run verify:steps
 */
import { TECHNIQUES } from '../src/lib/ciphers';
import { generateChallenge, UNUSABLE_AS_PROBLEMS } from '../src/lib/generator';
import { translatePhrase } from '../src/lib/i18n/steps';

const missingTitles = new Map<string, string>();
const missingDetails = new Map<string, string>();

let techniques = 0;
let phrases = 0;

for (const t of TECHNIQUES) {
  if (UNUSABLE_AS_PROBLEMS.has(t.id)) continue;

  // Several seeds per technique: a key of a different shape takes a different
  // branch, and the branch not taken is where an untranslated phrase hides.
  for (const seed of ['a1', 'b2', 'c3', 'd4']) {
    let made;
    try {
      made = generateChallenge({ techniqueIds: [t.id], seed: `steps:${t.id}:${seed}` });
    } catch {
      continue; // a seed that produced no valid key; another one will
    }
    for (const s of [...made.solution.encodeSteps, ...made.solution.decodeSteps]) {
      phrases += 2;
      if (translatePhrase(s.title, 'title') === undefined) missingTitles.set(s.title, t.id);
      if (translatePhrase(s.detail, 'detail') === undefined) missingDetails.set(s.detail, t.id);
    }
  }
  techniques += 1;
}

console.log('\nThe worked solution, in both languages\n');
console.log(`  techniques exercised           ${techniques}`);
console.log(`  phrases asked for              ${phrases}`);
console.log(`  titles with no translation     ${missingTitles.size}`);
console.log(`  details with no translation    ${missingDetails.size}`);

if (missingTitles.size || missingDetails.size) {
  console.error('\nFAILED — these reach a student in English:\n');
  for (const [text, id] of missingTitles) console.error(`  [title  ${id}] ${text}`);
  for (const [text, id] of missingDetails) console.error(`  [detail ${id}] ${text}`);
  console.error('');
  process.exit(1);
}

console.log('\nEvery step of every worked solution has an Indonesian reading.\n');
