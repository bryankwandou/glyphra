import { NextResponse } from 'next/server';
import { buildQuiz } from '@/lib/quiz';
import { currentAccount } from '@/lib/accounts';
import { quizPolicy, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Fetch a shared quiz by its join code.
 *
 * An unclaimed code is open to anyone holding it — that is the whole point of a
 * share link, and it is how every code behaved before accounts existed. A code
 * somebody has claimed carries their rules: it can be closed, or restricted to
 * the person who set it.
 *
 * Either way, only the questions cross the wire. The answers are rebuilt
 * server-side at marking time and never leave.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') ?? '';
  const quiz = buildQuiz(code);

  if (!quiz) {
    return NextResponse.json(
      { error: 'That code does not match a quiz. Check for a mistyped character.' },
      { status: 404 },
    );
  }

  const policy = hasDb() ? await quizPolicy(quiz.code) : null;

  if (policy?.closedAt) {
    return NextResponse.json(
      {
        error:
          policy.mode === 'first_correct'
            ? 'This quiz closed once somebody solved it.'
            : 'This quiz has been closed by the person who set it.',
        closed: true,
        closedBy: policy.closedBy,
        mode: policy.mode,
      },
      { status: 423 },
    );
  }

  if (policy?.mode === 'host_only') {
    const account = await currentAccount();
    if (!account || account.id !== policy.ownerId) {
      return NextResponse.json(
        { error: 'Only the person who set this quiz can open it.', hostOnly: true },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({
    mode: policy?.mode ?? 'open',
    title: policy?.title ?? null,
    code: quiz.code,
    timeLimitSeconds: quiz.timeLimitSeconds,
    questionCount: quiz.questions.length,
    difficultyLow: quiz.config.difficultyLow,
    difficultyHigh: quiz.config.difficultyHigh,
    questions: quiz.questions.map((q) => ({
      number: q.number,
      techniqueName: q.challenge.techniqueName,
      family: q.challenge.family,
      difficulty: q.challenge.difficulty,
      era: q.challenge.era,
      summary: q.challenge.summary,
      theory: q.challenge.theory,
      prompt: q.challenge.prompt,
      ciphertext: q.challenge.ciphertext,
      keyFields: q.challenge.keyFields,
      plaintextLength: q.challenge.plaintextLength,
    })),
  });
}
