/**
 * The access rules actually hold, against a real database.
 *
 * These three features were refused for weeks on the grounds that they need
 * server state, and that was true. Now that the state exists, the rules have to
 * be checked rather than assumed — an access rule that is enforced only by the
 * interface is not an access rule, because anybody willing to post to the
 * endpoint directly walks past it.
 *
 *   npm run verify:db
 *
 * Everything it writes is namespaced and deleted at the end, so it is safe to
 * run against the same database the site uses.
 */
import {
  hasDb, db, claimQuiz, quizPolicy, closeQuiz, reopenQuiz,
  recordAttempt, attemptsFor, closeOnPerfect, ownedQuizzes,
} from '../src/lib/db';
import { createAccount, authenticate, hashPassword, verifyPassword, checkSignUp } from '../src/lib/accounts';
import { encodeQuizCode } from '../src/lib/quiz-code';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`[${what}] ${detail}`);
const ok = (label: string, detail = '') => console.log(`  ok    ${label.padEnd(46)}${detail}`);

const STAMP = `vtest-${Date.now()}`;
const EMAIL = `${STAMP}@example.invalid`;

(async () => {
  if (!hasDb()) {
    console.error('\nDATABASE_URL is not set. Run: npx vercel env pull .env.local\n');
    process.exit(1);
  }

  console.log('\nAccess rules against the live database\n');

  /* ------------------------------------------------------ password hashing */

  const hash = await hashPassword('correct horse battery');
  if (!(await verifyPassword('correct horse battery', hash))) {
    fail('hashing', 'the right password did not verify');
  } else ok('right password verifies');

  if (await verifyPassword('correct horse batteryX', hash)) {
    fail('hashing', 'a wrong password verified');
  } else ok('wrong password rejected');

  const second = await hashPassword('correct horse battery');
  if (second === hash) fail('hashing', 'two hashes of one password are identical — salt is not applied');
  else ok('same password hashes differently', 'salted');

  if (!checkSignUp('nope', 'x'.repeat(12), 'Ana')) fail('validation', 'accepted an invalid email');
  else ok('invalid email rejected');
  if (!checkSignUp('a@b.co', 'short', 'Ana')) fail('validation', 'accepted a 5-character password');
  else ok('short password rejected');

  /* --------------------------------------------------------------- accounts */

  const account = await createAccount(EMAIL, 'a-long-enough-password', 'Verification Run');
  if ('error' in account) {
    fail('accounts', `could not create: ${account.error}`);
    console.error('\nFAILED early — cannot continue without an account.\n');
    process.exit(1);
  }
  ok('account created', account.id.slice(0, 8));

  const dupe = await createAccount(EMAIL.toUpperCase(), 'another-long-password', 'Impostor');
  if (!('error' in dupe)) fail('accounts', 'a duplicate address in different case was accepted');
  else ok('duplicate email rejected', 'case-insensitive');

  if (!(await authenticate(EMAIL, 'a-long-enough-password'))) fail('accounts', 'correct sign-in failed');
  else ok('sign in with the right password');

  if (await authenticate(EMAIL, 'wrong-password-here')) fail('accounts', 'wrong password signed in');
  else ok('sign in with the wrong password refused');

  /* ------------------------------------------------- ownership and closing */

  const codeOpen = encodeQuizCode({ seed: 11, questions: 4, difficultyLow: 1, difficultyHigh: 3, minutes: 10 });
  const codeFirst = encodeQuizCode({ seed: 22, questions: 4, difficultyLow: 1, difficultyHigh: 3, minutes: 10 });
  const codeHost = encodeQuizCode({ seed: 33, questions: 4, difficultyLow: 1, difficultyHigh: 3, minutes: 10 });

  await claimQuiz(codeOpen, account.id, 'open', 'Open quiz');
  await claimQuiz(codeFirst, account.id, 'first_correct', 'Closes on a perfect score');
  await claimQuiz(codeHost, account.id, 'host_only', 'Host only');

  const pOpen = await quizPolicy(codeOpen);
  const pFirst = await quizPolicy(codeFirst);
  const pHost = await quizPolicy(codeHost);

  if (pOpen?.mode !== 'open' || pFirst?.mode !== 'first_correct' || pHost?.mode !== 'host_only') {
    fail('modes', 'a mode did not round-trip through the database');
  } else ok('all three modes stored and read back');

  const unclaimed = encodeQuizCode({ seed: 44, questions: 4, difficultyLow: 1, difficultyHigh: 3, minutes: 10 });
  if (await quizPolicy(unclaimed)) {
    fail('backwards compatibility', 'an unclaimed code returned a policy');
  } else ok('unclaimed code has no policy', 'stays open');

  /* --------------------------------------- a stranger cannot take a code over */

  const other = await createAccount(`other-${STAMP}@example.invalid`, 'yet-another-password', 'Someone Else');
  if ('error' in other) {
    fail('accounts', 'could not create the second account');
  } else {
    await claimQuiz(codeOpen, other.id, 'host_only', 'Hijacked');
    const after = await quizPolicy(codeOpen);
    if (after?.ownerId !== account.id) fail('ownership', 'a second account took over an existing code');
    else if (after.mode !== 'open') fail('ownership', 'a second account changed the mode of a code it does not own');
    else ok('a stranger cannot claim or alter a code');

    if (await closeQuiz(codeOpen, other.id, 'Someone Else')) {
      fail('ownership', 'a stranger closed a quiz they do not own');
    } else ok('a stranger cannot close a quiz');
  }

  /* --------------------------------------------- first correct answer closes */

  await recordAttempt({ quizCode: codeFirst, participant: 'Partial', score: 50, correct: 2, total: 4, perfect: false });
  await closeOnPerfect(codeFirst, 'Partial');
  if ((await quizPolicy(codeFirst))?.closedAt) {
    fail('first_correct', 'an imperfect score closed the quiz');
  } else ok('a partial score leaves it open');

  await recordAttempt({ quizCode: codeFirst, participant: 'Solver', score: 100, correct: 4, total: 4, perfect: true });
  await closeOnPerfect(codeFirst, 'Solver');
  const closed = await quizPolicy(codeFirst);
  if (!closed?.closedAt) fail('first_correct', 'a perfect score did not close the quiz');
  else if (closed.closedBy !== 'Solver') fail('first_correct', `closed by "${closed.closedBy}" rather than the solver`);
  else ok('a perfect score closes it', `by ${closed.closedBy}`);

  // A quiz that is not in first_correct mode must not close this way.
  await recordAttempt({ quizCode: codeOpen, participant: 'Ace', score: 100, correct: 4, total: 4, perfect: true });
  await closeOnPerfect(codeOpen, 'Ace');
  if ((await quizPolicy(codeOpen))?.closedAt) {
    fail('mode isolation', 'an open quiz closed on a perfect score');
  } else ok('an open quiz ignores perfect scores');

  /* ------------------------------------------------------ close and reopen */

  if (!(await closeQuiz(codeHost, account.id, 'Verification Run'))) fail('closing', 'the owner could not close');
  else ok('owner closes their own quiz');

  if (await closeQuiz(codeHost, account.id, 'Verification Run')) {
    fail('closing', 'closing an already-closed quiz reported success');
  } else ok('closing twice is refused');

  if (!(await reopenQuiz(codeHost, account.id))) fail('closing', 'the owner could not reopen');
  else if ((await quizPolicy(codeHost))?.closedAt) fail('closing', 'reopen left it closed');
  else ok('owner reopens their own quiz');

  /* ------------------------------------------------------------- gradebook */

  const list = await attemptsFor(codeFirst);
  if (list.length !== 2) fail('gradebook', `expected 2 attempts, found ${list.length}`);
  else if (list[0].score < list[1].score) fail('gradebook', 'attempts are not ordered by score');
  else ok('attempts recorded and ranked', `${list.length} rows, top ${list[0].score}%`);

  const mine = await ownedQuizzes(account.id);
  if (mine.length < 3) fail('gradebook', `owner sees ${mine.length} quizzes, expected at least 3`);
  else ok('owner sees their quizzes', `${mine.length} with attempt counts`);

  /* ----------------------------------------------------------------- clean */

  await db()`DELETE FROM attempts WHERE quiz_code IN (${codeOpen}, ${codeFirst}, ${codeHost})`;
  await db()`DELETE FROM accounts WHERE email_key LIKE ${'%' + STAMP + '%'}`;
  const leftover = (await db()`SELECT code FROM quizzes WHERE code IN (${codeOpen}, ${codeFirst}, ${codeHost})`) as unknown[];
  if (leftover.length) {
    fail('cascade', `${leftover.length} quiz rows survived their owner being deleted`);
  } else ok('deleting an account removes its quizzes', 'cascade');

  /* ---------------------------------------------------------------- output */

  if (failures.length) {
    console.error(`\nFAILED — ${failures.length} problem(s):\n`);
    for (const f of failures) console.error(`  ${f}`);
    console.error('');
    process.exit(1);
  }

  console.log('\nEvery access rule holds against the live database.\n');
})();
