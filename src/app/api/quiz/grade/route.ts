import { NextResponse } from 'next/server';
import { markQuiz } from '@/lib/quiz';
import { buildComposed } from '@/lib/composed';
import { gradeAnswer } from '@/lib/generator';
import { canonicalQuizCode } from '@/lib/quiz-code';
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
  // Upper-casing is not enough: a code without its hyphen upper-cases to a
  // different string again, and every lookup here is keyed on this value.
  const code = canonicalQuizCode(typeof body.code === 'string' ? body.code : '') ?? '';
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

  // A composed quiz has to be marked against its arrangement. Marking it with
  // the band the code describes would compare a student's answers to a paper
  // they were never shown — every answer wrong, and no error anywhere.
  const composed = hasDb() ? await buildComposed(code, name) : null;

  const result = composed
    ? (() => {
        const rows = composed.questions.map((q, i) => {
          const given = answers[i] ?? '';
          const graded = gradeAnswer(given, composed.answers[i]);
          return {
            number: q.number,
            correct: graded.correct,
            proximity: graded.similarity,
            submitted: given,
            expected: composed.answers[i],
            techniqueName: q.challenge.techniqueName,
          };
        });
        const right = rows.filter((r) => r.correct).length;
        return {
          code: composed.code,
          total: rows.length,
          correct: right,
          score: rows.length ? Math.round((right / rows.length) * 100) : 0,
          results: rows,
        };
      })()
    : markQuiz(code, answers);

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
