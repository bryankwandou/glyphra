/**
 * One question about who is signed in, asked in one place.
 *
 * The site grew two sign-ins. An older single-instructor cookie came first;
 * accounts replaced it and set a different one. Nothing removed the first, and
 * nothing taught the rest of the app about the second, so every surface that
 * asked `currentSession()` treated an account holder as a stranger:
 *
 *   - the header rendered its signed-out branch on every page, so somebody who
 *     had just signed in was still shown a sign-in button and reasonably signed
 *     in again — the whole of the repeated-login report, and never a session
 *     expiring;
 *   - `requireInstructor()` gates the one route that opens a sealed solution, so
 *     an instructor who signed in on the page headed "Instructor sign-in" could
 *     never open an answer key. The sign-in reported success and the thing it
 *     was for stayed shut.
 *
 * Both are one fault: the question "is this person signed in" had two answers.
 * `currentViewer()` is now the only place that answers it, and this checks
 * nothing has drifted back to asking the narrower one directly.
 *
 *   npm run verify:session
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`[${what}] ${detail}`);

/** Where the narrow check is still correct, and why. */
const ALLOWED = new Map<string, string>([
  ['src/lib/auth.ts', 'defines both, and currentViewer is built on currentSession'],
  ['src/app/api/auth/signin/route.ts', 'issues the legacy cookie'],
  ['src/app/api/auth/signout/route.ts', 'clears the legacy cookie'],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk('src');
let surfaces = 0;

for (const file of files) {
  const rel = file.replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');

  if (!/currentSession\s*\(/.test(text)) continue;

  surfaces++;
  if (ALLOWED.has(rel)) continue;

  fail(
    'narrow check',
    `${rel} calls currentSession() directly. An account holder is not signed in ` +
      `as far as that line is concerned. Use currentViewer().`,
  );
}

/* ---------------------------------- the one gate that opens an answer key --- */

const auth = readFileSync('src/lib/auth.ts', 'utf8');

const requireBody = auth.match(/export async function requireInstructor[\s\S]*?\n}/)?.[0] ?? '';
if (!requireBody) {
  fail('missing', 'requireInstructor() was not found in src/lib/auth.ts');
} else if (!/currentViewer\s*\(/.test(requireBody)) {
  fail(
    'answer key',
    'requireInstructor() does not go through currentViewer(), so an instructor ' +
      'signed in with an account cannot open a sealed solution — the one thing ' +
      'the sign-in exists for.',
  );
}

const viewerBody = auth.match(/export async function currentViewer[\s\S]*?\n}/)?.[0] ?? '';
if (!viewerBody) {
  fail('missing', 'currentViewer() was not found in src/lib/auth.ts');
} else {
  if (!/currentSession\s*\(/.test(viewerBody)) {
    fail('coverage', 'currentViewer() no longer accepts the legacy instructor cookie');
  }
  if (!/currentAccount/.test(viewerBody)) {
    fail('coverage', 'currentViewer() no longer accepts an account');
  }
}

/* ------------------------------------------- the header asks the wide question */

const header = readFileSync('src/components/site-header.tsx', 'utf8');
if (!/currentAccount|currentViewer/.test(header)) {
  fail(
    'header',
    'the site header does not consider an account, so a signed-in person is ' +
      'shown a sign-in button on every page',
  );
}

/* -------------------------------------------------------------------- output */

console.log('\nWho is signed in\n');
console.log(`  files that ask at all           ${surfaces}`);
console.log(`  allowed to ask the narrow one   ${ALLOWED.size}`);

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log('\nOne question, one answer, and the answer key opens for both.\n');
