import { NextResponse } from 'next/server';
import { markQuiz } from '@/lib/quiz';
import { currentAccount } from '@/lib/accounts';
import { quizPolicy, recordAttempt, closeOnPerfect, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Mark a finished attempt, then apply whatever rules the owner set.
 *
 * The whole submission is marked in one call, at the end. Marking question by
 * question would let a participant probe one answer at a time and walk their
 * way to the solution, which is the same reason the practice route never
 * returns the expected text mid-attempt.
 *
 * Access is checked here as well as when the quiz is opened. Checking only at
 * the door would leave the rules enforced by the interface rather than by the
 * server, and anybody willing to post to this endpoint directly would walk
 * straight past them.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.toUpperCase() : '';
  const answers = Array.isArray(body.answers) ? body.answers.map((a: unknown) => String(a ?? '')) : [];
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';

  const policy = hasDb() ? await quizPolicy(code) : null;

  if (policy) {
    if (policy.closedAt) {
      return NextResponse.json(
        {
          error: 'This quiz is closed.',
          closed: true,
          closedBy: policy.closedBy,
          mode: policy.mode,
        },
        { status: 423 },
      );
    }

    if (policy.mode === 'host_only') {
      const account = await currentAccount();
      if (!account || account.id !== policy.ownerId) {
        return NextResponse.json(
          { error: 'Only the person who set this quiz can attempt it.', hostOnly: true },
          { status: 403 },
        );
      }
    }
  }

  const result = markQuiz(code, answers);
  if (!result) {
    return NextResponse.json({ error: 'That code does not match a quiz.' }, { status: 404 });
  }

  // Recording happens only for a claimed quiz. An anonymous code stays
  // anonymous, which is the property the whole thing was built on.
  if (policy) {
    const perfect = result.correct === result.total && result.total > 0;
    try {
      await recordAttempt({
        quizCode: code,
        participant: name || 'anonymous',
        score: result.score,
        correct: result.correct,
        total: result.total,
        perfect,
      });
      if (perfect && policy.mode === 'first_correct') {
        await closeOnPerfect(code, name || 'anonymous');
      }
    } catch {
      // A recording failure must not cost somebody their marks. They finished
      // the work; the gradebook missing a row is the lesser harm, and it is
      // repairable while a lost attempt is not.
    }
  }

  return NextResponse.json({
    ...result,
    name,
    recorded: !!policy,
    closedNow: !!policy && policy.mode === 'first_correct' && result.correct === result.total,
  });
}
