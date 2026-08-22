/**
 * A composed paper deals the methods it was told to, in the order it was told.
 *
 * The claim: "question three is a Playfair question" is an instruction the
 * composer gave, not a description generated afterwards. This checks the paper
 * a participant receives against the arrangement that was saved.
 *
 * The part most likely to break silently is shuffling. Reordering the questions
 * without reordering the answer key marks every student wrong while nothing
 * throws, so both are checked: the shuffled paper must contain the same
 * questions, and the marking must still accept the right answers.
 *
 *   npx tsx --conditions=react-server scripts/verify-compose.ts <base-url>
 */
import { db, hasDb } from '../src/lib/db';

const BASE = process.argv[2] ?? 'http://localhost:3133';
const STAMP = `comp${Date.now()}`;

let pass = 0;
const failures: string[] = [];
const chk = (label: string, got: unknown, want: unknown) => {
  if (String(got) === String(want)) {
    console.log(`  ok    ${label.padEnd(48)}${got}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label.padEnd(48)}got ${got}, want ${want}`);
    failures.push(label);
  }
};

(async () => {
  const up = await fetch(`${BASE}/api/account/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${STAMP}@example.invalid`,
      password: 'a-long-enough-password',
      displayName: 'Compose Check',
    }),
  });
  const cookie = up.headers.get('set-cookie')?.split(';')[0] ?? '';

  const compose = async (techniques: string[], shuffle = false) => {
    const res = await fetch(`${BASE}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ techniques, shuffle, disclose: true, minutes: 0, mode: 'open' }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  /* -------------------- 1. the paper deals exactly what was asked for ------- */

  console.log('\n  the arrangement is the instruction\n');

  const plan = ['playfair', 'caesar', 'bifid', 'rail-fence', 'vigenere'];
  const made = await compose(plan);

  if (made.status !== 200) {
    console.error(`\n  SETUP FAILED — compose returned ${made.status}: ${made.body.error}\n`);
    process.exit(1);
  }

  const code: string = made.body.code;
  const got: string[] = made.body.questions.map((q: { techniqueId: string }) => q.techniqueId);
  chk('question count matches the plan', got.length, plan.length);
  plan.forEach((want, i) => {
    chk(`question ${i + 1} is ${want}`, got[i] ?? 'missing', want);
  });

  /* ---------------------- 2. the participant receives that same paper ------- */

  const fetched = await (await fetch(`${BASE}/api/quiz?code=${code}`)).json();
  const served: string[] = (fetched.questions ?? []).map(
    (q: { techniqueName: string }) => q.techniqueName,
  );
  chk('the served paper has the same length', served.length, plan.length);

  // Names rather than ids at this boundary, so compare loosely but meaningfully.
  chk('question 1 served is a Playfair', /playfair/i.test(served[0] ?? ''), true);
  chk('question 2 served is a Caesar', /caesar/i.test(served[1] ?? ''), true);
  chk('question 4 served is a rail fence', /rail/i.test(served[3] ?? ''), true);

  /* ------------------------------- 3. a band quiz is untouched by any of it -- */

  const band = await (await fetch(`${BASE}/api/quiz?code=CY9J-8B59`)).json();
  chk('an ordinary band quiz still works', Array.isArray(band.questions), true);

  /* ------------------------------------- 4. shuffling reorders, not rewrites -- */

  console.log('\n  shuffling\n');

  const shuffled = await compose(['caesar', 'atbash', 'rot13', 'a1z26', 'rail-fence', 'affine'], true);
  const scode: string = shuffled.body.code;

  const paperFor = async (who: string) => {
    const r = await fetch(`${BASE}/api/quiz?code=${scode}&who=${encodeURIComponent(who)}`);
    const j = await r.json();
    return (j.questions ?? []).map((q: { techniqueName: string }) => q.techniqueName);
  };

  const base = await paperFor('');
  chk('a shuffled paper has every question', base.length, 6);
  chk('and no duplicates', new Set(base).size, base.length);

  const ana = await paperFor('Ana');
  const budi = await paperFor('Budi');
  chk('Ana gets the same six questions', [...ana].sort().join(','), [...base].sort().join(','));
  chk('Budi gets the same six questions', [...budi].sort().join(','), [...base].sort().join(','));
  chk('two people get different orders', ana.join(',') !== budi.join(','), true);

  const anaAgain = await paperFor('Ana');
  chk('and a refresh does not reshuffle', anaAgain.join(','), ana.join(','));
  chk('case does not change an order', (await paperFor('ana')).join(','), ana.join(','));

  /* ----------- the shuffled paper is marked against that person's order ----- */

  console.log('
  marking a shuffled paper
');

  const splan = hasDb()
    ? ((await db()`SELECT techniques, seed, disclose FROM quiz_plans WHERE code = ${scode}`) as {
        techniques: string[]; seed: number; disclose: boolean;
      }[])[0]
    : null;

  if (splan) {
    const gen = await import('../src/lib/generator');
    // Answers keyed by technique-and-position in the *plan*, which is how the
    // server seeds them; the participant's paper is a permutation of these.
    const bySource = splan.techniques.map((t, i) =>
      gen.generateChallenge({
        techniqueIds: [t],
        seed: `plan:${splan.seed}:q${i}`,
        discloseKey: splan.disclose,
      }),
    );

    // Reorder Ana's answers to match the paper she was actually shown.
    const anaAnswers = ana.map((name: string) => {
      const hit = bySource.find((c) => c.publicPart.techniqueName === name);
      return hit ? hit.solution.plaintext : '';
    });

    const anaMarked = await (await fetch(`${BASE}/api/quiz/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: scode, answers: anaAnswers, name: 'Ana' }),
    })).json();
    chk("Ana's own order marks 100", anaMarked.score, 100);

    // The same answers submitted as Budi must not score full marks, because his
    // paper is in a different order. If it did, ordering is being ignored.
    const budiMarked = await (await fetch(`${BASE}/api/quiz/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: scode, answers: anaAnswers, name: 'Budi' }),
    })).json();
    chk("Ana's answers do not fit Budi's paper", budiMarked.score < 100, true);
  }

  /* --------------------------------------- 5. marking follows the same paper -- */

  console.log('\n  marking a composed paper\n');

  // Read the answers the same way the server will: rebuild from the plan.
  const planRow = hasDb()
    ? ((await db()`SELECT techniques, seed FROM quiz_plans WHERE code = ${code}`) as {
        techniques: string[]; seed: number;
      }[])[0]
    : null;

  if (!planRow) {
    console.error('\n  Cannot read the plan back to derive answers.\n');
    process.exit(1);
  }

  chk('the stored plan matches what was sent', planRow.techniques.join(','), plan.join(','));

  const { generateChallenge } = await import('../src/lib/generator');
  const answers = planRow.techniques.map((t, i) =>
    generateChallenge({
      techniqueIds: [t],
      seed: `plan:${planRow.seed}:q${i}`,
      discloseKey: true,
    }).solution.plaintext,
  );

  const marked = await (await fetch(`${BASE}/api/quiz/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, answers, name: 'Composer Check' }),
  })).json();

  chk('every right answer is accepted', marked.score, 100);
  chk('and the total is the plan length', marked.total, plan.length);

  const wrong = await (await fetch(`${BASE}/api/quiz/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, answers: answers.map(() => 'NONSENSE'), name: 'Wrong' }),
  })).json();
  chk('and nonsense scores zero', wrong.score, 0);

  /* ---------------------------------------------------------------- cleanup */

  if (hasDb()) {
    try {
      await db()`DELETE FROM attempts WHERE quiz_code IN (SELECT code FROM quiz_plans WHERE owner_id IN (SELECT id FROM accounts WHERE email_key LIKE ${'%' + STAMP + '%'}))`;
      await db()`DELETE FROM accounts WHERE email_key LIKE ${'%' + STAMP + '%'}`;
    } catch { /* best effort */ }
  }

  console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
  if (failures.length) process.exit(1);
})();
