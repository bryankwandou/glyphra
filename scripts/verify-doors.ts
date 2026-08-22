/**
 * Every door into a quiz obeys the same rules.
 *
 * Written after finding that the /q/[code] page did not. The fetch endpoint and
 * the marking endpoint both checked the policy, so the rules looked enforced —
 * but the page rendered the questions server-side without asking, which meant a
 * host-only quiz refused strangers at the API while handing them every question
 * through the page people actually click. A rule enforced at two of three doors
 * is not enforced.
 *
 * This replaces a shell version that reported fourteen failures which were all
 * one failure. It hard-coded a single quiz code, never removed the accounts it
 * made, and — the part that actually mattered — did not check that its own
 * setup had worked. On the second run the code was already claimed by the
 * previous run's account, the claim was refused, and every assertion after it
 * tested a quiz that was genuinely open. A check that does not verify its
 * preconditions does not report what it appears to report.
 *
 *   npx tsx --conditions=react-server scripts/verify-doors.ts <base-url>
 */
import { encodeQuizCode } from '../src/lib/quiz-code';
import { buildQuiz } from '../src/lib/quiz';
import { db, hasDb } from '../src/lib/db';

const BASE = process.argv[2] ?? 'http://localhost:3133';
const STAMP = `doors${Date.now()}`;

let pass = 0;
const failures: string[] = [];

const chk = (label: string, got: unknown, want: unknown) => {
  if (String(got) === String(want)) {
    console.log(`  ok    ${label.padEnd(44)}${got}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label.padEnd(44)}got ${got}, want ${want}`);
    failures.push(label);
  }
};

/** Fatal: nothing after a broken setup means anything. */
const require_ = (label: string, condition: boolean, detail: string) => {
  if (condition) {
    console.log(`  ok    ${label.padEnd(44)}ready`);
    pass++;
  } else {
    console.error(`\n  SETUP FAILED — ${label}: ${detail}`);
    console.error('  Refusing to run the checks; every result after this would be meaningless.\n');
    process.exit(1);
  }
};

async function cleanup() {
  if (!hasDb()) return;
  try {
    await db()`DELETE FROM attempts WHERE quiz_code IN (
      SELECT code FROM quizzes WHERE owner_id IN (
        SELECT id FROM accounts WHERE email_key LIKE ${'%' + STAMP + '%'}))`;
    await db()`DELETE FROM accounts WHERE email_key LIKE ${'%' + STAMP + '%'}`;
  } catch {
    // Cleanup is best effort; a failure here must not mask a real result.
  }
}

(async () => {
  const signUp = async (tag: string) => {
    const res = await fetch(`${BASE}/api/account/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${tag}-${STAMP}@example.invalid`,
        password: 'a-long-enough-password',
        displayName: tag === 'owner' ? 'Doors Owner' : 'Doors Stranger',
      }),
    });
    return { ok: res.ok, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' };
  };

  console.log('\n  setup\n');

  const owner = await signUp('owner');
  const stranger = await signUp('stranger');
  require_('owner account', owner.ok && !!owner.cookie, 'sign-up failed');
  require_('stranger account', stranger.ok && !!stranger.cookie, 'sign-up failed');

  // A fresh code every run. Sharing one across runs is what made the previous
  // version collide with its own leftovers.
  const code = encodeQuizCode({
    seed: Date.now() % 0x100000,
    questions: 4,
    difficultyLow: 1,
    difficultyHigh: 3,
    minutes: 10,
  });

  const claim = async (mode: string, cookie: string) => {
    const res = await fetch(`${BASE}/api/quiz/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ code, mode, title: 'doors' }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  const claimed = await claim('host_only', owner.cookie);
  require_(
    `claimed ${code} as host_only`,
    claimed.status === 200 && claimed.body?.policy?.mode === 'host_only',
    `status ${claimed.status}, mode ${claimed.body?.policy?.mode ?? 'none'}`,
  );

  const get = (path: string, cookie = '') =>
    fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {} });

  /**
   * Does this page actually carry the quiz?
   *
   * Looks for the ciphertext strings themselves, computed here from the code,
   * rather than for the word "Ciphertext". The earlier version looked for the
   * label and was measuring nothing at all: the runner opens in its lobby, so
   * that label never appears in server HTML in any state, and the assertion
   * passed identically whether the page leaked or not. It was a green tick over
   * an untested claim, which is worse than no tick.
   *
   * The values are a different matter. They cross the wire inside the RSC
   * payload the moment the page renders the runner, so their absence means
   * something.
   */
  const secrets = buildQuiz(code)!.questions.map((q) =>
    q.challenge.ciphertext.replace(/\s+/g, ''),
  );

  const quizPresent = async (path: string, cookie = '') => {
    const html = (await (await get(path, cookie)).text())
      .replace(/\\[nrt]/g, '')
      .replace(/\s+/g, '');
    return secrets.filter((sec) => html.includes(sec)).length;
  };

  const leaks = async (path: string, cookie = '') => (await quizPresent(path, cookie)) > 0;

  const mark = (c: string, cookie = '') =>
    fetch(`${BASE}/api/quiz/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ code: c, answers: ['x'], name: 'S' }),
    });

  /* -------------------------------------------- is the probe even sensitive? */

  // The control. A page that should carry every ciphertext must be seen to
  // carry them, otherwise a blind probe reports "no leak" everywhere and the
  // whole run is a row of meaningless ticks.
  await claim('open', owner.cookie);
  const control = await quizPresent(`/q/${code}`);
  require_(
    'probe detects an open quiz',
    control === secrets.length,
    `found ${control} of ${secrets.length} ciphertexts in a page that carries all of them — ` +
      'the probe is blind, so every "no leak" below would mean nothing',
  );
  await claim('host_only', owner.cookie);

  /* ---------------------------------------------- host_only, all three doors */

  console.log('\n  host_only\n');

  chk('api refuses a stranger', (await get(`/api/quiz?code=${code}`, stranger.cookie)).status, 403);
  chk('api refuses anonymous', (await get(`/api/quiz?code=${code}`)).status, 403);
  chk('marking refuses a stranger', (await mark(code, stranger.cookie)).status, 403);
  chk('page leaks nothing to a stranger', await leaks(`/q/${code}`, stranger.cookie), false);
  chk('page leaks nothing to anonymous', await leaks(`/q/${code}`), false);
  chk('the owner still sees it', await leaks(`/q/${code}`, owner.cookie), true);

  /* ------------------------------------------ the same code, spelled otherwise */

  console.log('\n  the same code, spelled differently\n');

  const variants = [code.toLowerCase(), code.replace('-', ''), code.toLowerCase().replace('-', ''), code.replace('-', ' ')];
  for (const v of variants) {
    chk(`api refuses "${v}"`, (await get(`/api/quiz?code=${encodeURIComponent(v)}`, stranger.cookie)).status, 403);
  }
  chk('page leaks nothing, lower case', await leaks(`/q/${code.toLowerCase()}`, stranger.cookie), false);
  chk('page leaks nothing, no hyphen', await leaks(`/q/${code.replace('-', '')}`, stranger.cookie), false);
  chk('marking refuses a lower-case code', (await mark(code.toLowerCase(), stranger.cookie)).status, 403);

  /* -------------------------------------------------------- closed, all doors */

  await claim('open', owner.cookie);
  const closed = await fetch(`${BASE}/api/quiz/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: owner.cookie },
    body: JSON.stringify({ code }),
  });
  require_('closed the quiz', closed.ok, `status ${closed.status}`);

  console.log('\n  closed\n');

  const shut = await (await get(`/q/${code}`)).text();
  // "closed" turns up in the page furniture in every state, so asserting on
  // that word was another check that could not fail. The notice is specific.
  chk('page shows the closed notice',
    shut.includes('This quiz is closed') || shut.includes('Kuis ini sudah ditutup'), true);
  chk('page carries none of the quiz', await quizPresent(`/q/${code}`), 0);
  chk('api refuses', (await get(`/api/quiz?code=${code}`)).status, 423);
  chk('marking refuses', (await mark(code)).status, 423);

  /* ------------------------------------------------------------- reopened */

  await fetch(`${BASE}/api/quiz/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: owner.cookie },
    body: JSON.stringify({ code, reopen: true }),
  });

  console.log('\n  reopened, and an unclaimed code\n');

  chk('api opens again', (await get(`/api/quiz?code=${code}`)).status, 200);
  chk('page shows questions again', await leaks(`/q/${code}`), true);

  const unclaimed = encodeQuizCode({
    seed: (Date.now() + 5000) % 0x100000,
    questions: 4, difficultyLow: 1, difficultyHigh: 3, minutes: 10,
  });
  chk('an unclaimed code is untouched', (await get(`/api/quiz?code=${unclaimed}`)).status, 200);

  /* ------------------------------------------------------------------ done */

  await cleanup();

  console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
  if (failures.length) process.exit(1);
})();
