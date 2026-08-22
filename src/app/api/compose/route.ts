import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { saveQuizPlan, claimQuiz, hasDb } from '@/lib/db';
import { buildComposed } from '@/lib/composed';
import { PROBLEM_ROSTER } from '@/lib/problem-code';
import { encodeQuizCode, randomQuizSeed } from '@/lib/quiz-code';
import type { QuizMode } from '@/lib/db';

export const runtime = 'nodejs';

const MODES: QuizMode[] = ['open', 'first_correct', 'host_only'];
const MAX_QUESTIONS = 20;

/**
 * Save an arrangement: the method for each question, in the order given.
 *
 * The code is a normal quiz code, so it looks and shares the same way — but it
 * carries the plan's identity rather than the plan, because an arrangement of
 * named methods does not fit in forty bits. That is the trade this endpoint
 * makes on the caller's behalf, and the interface states it before they choose.
 */
export async function POST(request: Request) {
  if (!hasDb()) {
    return NextResponse.json(
      { error: 'Composing a quiz needs a database, and none is configured here.' },
      { status: 503 },
    );
  }

  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const techniques: string[] = Array.isArray(body.techniques)
    ? body.techniques.map((t: unknown) => String(t)).slice(0, MAX_QUESTIONS)
    : [];
  const shuffle = body.shuffle === true;
  const disclose = body.disclose === true;
  const minutes = Math.max(0, Math.min(63, Number(body.minutes ?? 0) || 0));
  const mode = MODES.includes(body.mode) ? (body.mode as QuizMode) : 'open';
  const title = body.title ? String(body.title).slice(0, 120) : null;

  if (!techniques.length) {
    return NextResponse.json({ error: 'Add at least one question.' }, { status: 400 });
  }

  const unknown = techniques.filter((t) => !PROBLEM_ROSTER.includes(t));
  if (unknown.length) {
    return NextResponse.json(
      { error: `Not a technique this can set: ${unknown[0]}` },
      { status: 400 },
    );
  }

  const seed = randomQuizSeed();
  // The code's own band fields are unused by a composed quiz but still have to
  // decode, so the code stays a valid quiz code everywhere else in the system.
  const code = encodeQuizCode({
    seed,
    questions: Math.min(16, techniques.length),
    difficultyLow: 1,
    difficultyHigh: 5,
    minutes,
  });

  const plan = await saveQuizPlan(code, account.id, techniques, seed, shuffle, disclose, minutes);
  if (!plan || plan.ownerId !== account.id) {
    return NextResponse.json({ error: 'Could not save that arrangement.' }, { status: 409 });
  }

  await claimQuiz(code, account.id, mode, title);

  // Built once here so a plan that cannot produce its paper is reported now,
  // rather than when a class of students opens the link.
  const built = await buildComposed(code);
  if (!built) {
    return NextResponse.json(
      { error: 'That arrangement could not produce a paper. Try different methods.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    code,
    questions: built.questions.map((q) => ({
      number: q.number,
      techniqueId: q.challenge.techniqueId,
      techniqueName: q.challenge.techniqueName,
      difficulty: q.challenge.difficulty,
    })),
  });
}
