import { NextResponse } from 'next/server';
import { buildQuiz } from '@/lib/quiz';

export const runtime = 'nodejs';

/**
 * Fetch a shared quiz by its join code.
 *
 * Open to anyone holding the code — that is the whole point of a share link.
 * Only the questions cross the wire; the answers are rebuilt server-side at
 * marking time and never leave.
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

  return NextResponse.json({
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
