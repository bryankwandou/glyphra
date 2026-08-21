/**
 * One QR, one problem, one method — the whole lifecycle, over HTTP.
 *
 * The claim under test is the one that was asked for directly: an administrator
 * picks a single method, gets a code, and that code produces a problem using
 * that method and no other. It runs until the first correct answer, then closes
 * against that person's name.
 *
 * Two things make this a proof rather than a demonstration. The method is read
 * back by decoding the code independently, not by reading a label off the page —
 * a label is only what the page says. And the correct answer is derived from the
 * code the same way any third party could derive it, so "it accepted the right
 * answer" is not taking the server's word for what the right answer was.
 *
 *   npx tsx --conditions=react-server scripts/verify-problem-flow.ts <base-url>
 */
import { decodeProblemCode } from '../src/lib/problem-code';
import { buildProblem } from '../src/lib/problem';

const BASE = process.argv[2] ?? 'http://localhost:3133';
const STAMP = `flow${Date.now()}`;

let pass = 0;
const failures: string[] = [];
const chk = (label: string, got: unknown, want: unknown) => {
  if (String(got) === String(want)) {
    console.log(`  ok    ${label.padEnd(46)}${got}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label.padEnd(46)}got ${got}, want ${want}`);
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
      displayName: 'Flow Owner',
    }),
  });
  const cookie = up.headers.get('set-cookie')?.split(';')[0] ?? '';

  const make = async (techniqueId: string, disclose = true, label = 'flow') => {
    const res = await fetch(`${BASE}/api/problem/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ techniqueId, disclose, label }),
    });
    return res.json();
  };

  /* -------------- 1. the method asked for is the method inside the code ----- */

  console.log('\n  one method in, one method out — checked by decoding the code\n');

  for (const method of ['playfair', 'caesar', 'rail-fence', 'vigenere', 'bifid', 'hill-2x2', 'adfgvx']) {
    const data = await make(method);
    const code: string = data.problem?.code ?? '';

    // Decoded here, independently of anything the server said about it.
    const decoded = decodeProblemCode(code);
    chk(`${method}: code decodes to ${method}`, decoded?.techniqueId ?? 'null', method);

    // And the problem that code builds really uses it.
    const built = buildProblem(code);
    chk(`${method}: the problem it builds`, built?.public.techniqueId ?? 'null', method);
  }

  /* ------------------------------------------- 2. the full lifecycle -------- */

  const made = await make('caesar', true, 'lifecycle');
  const code: string = made.problem.code;
  const built = buildProblem(code)!;

  console.log(`\n  lifecycle for ${code} (${built.public.techniqueName})\n`);

  const page1 = await (await fetch(`${BASE}/p/${code}`)).text();
  chk('page shows the ciphertext', page1.includes('Ciphertext') || page1.includes('Cipherteks'), true);
  chk('page names the method', page1.includes(built.public.techniqueName), true);

  const answer = async (a: string, name: string) => {
    const res = await fetch(`${BASE}/api/problem/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, answer: a, name }),
    });
    return { status: res.status, body: await res.json() };
  };

  const wrong = await answer('DEFINITELY NOT THE ANSWER AT ALL', 'Wrong');
  chk('a wrong answer is marked wrong', wrong.body.correct, false);
  chk('a wrong answer does not close it', wrong.body.solvedByYou, false);
  chk('still open after a wrong answer',
    (await fetch(`${BASE}/api/problem/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, answer: 'x', name: 'probe' }),
    })).status, 200);

  // Derived from the code, not taken from the server.
  const right = await answer(built.answer, 'Solver');
  chk('the right answer is accepted', right.body.correct, true);
  chk('and it closes the problem', right.body.solvedByYou, true);

  const late = await answer(built.answer, 'Latecomer');
  chk('a second solver is refused', late.status, 423);
  chk('and told who won', late.body.solvedBy ?? '', 'Solver');

  const page2 = await fetch(`${BASE}/p/${code}`);
  const html2 = await page2.text();
  chk('page now says solved',
    html2.includes('Already solved') || html2.includes('Sudah dipecahkan'), true);
  chk('page hides the ciphertext', html2.includes('Ciphertext'), false);
  chk('page names the solver', html2.includes('Solver'), true);

  /* ------------------------------------------- 3. a mistyped code fails ----- */

  const flat = code.replace('-', '');
  const broken = `${flat.slice(0, 3)}${flat[3] === 'Z' ? 'Y' : 'Z'}${flat.slice(4)}`;
  chk('a mistyped code opens nothing', buildProblem(broken) === null, true);

  console.log(`\n  ${pass} passed, ${failures.length} failed`);
  console.log(`  cleanup key: ${STAMP}\n`);
  if (failures.length) process.exit(1);
})();
