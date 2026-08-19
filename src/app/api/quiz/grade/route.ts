import { NextResponse } from 'next/server';
import { markQuiz } from '@/lib/quiz';

export const runtime = 'nodejs';

/**
 * Mark a finished attempt.
 *
 * The whole submission is marked in one call, at the end. Marking question by
 * question would let a participant probe one answer at a time and walk their
 * way to the solution, which is the same reason the practice route never
 * returns the expected text mid-attempt.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  const answers = Array.isArray(body.answers) ? body.answers.map((a: unknown) => String(a ?? '')) : [];
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';

  const result = markQuiz(code, answers);
  if (!result) {
    return NextResponse.json({ error: 'That code does not match a quiz.' }, { status: 404 });
  }

  return NextResponse.json({ ...result, name });
}
