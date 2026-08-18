import { NextResponse } from 'next/server';
import { unseal } from '@/lib/seal';
import { gradeAnswer } from '@/lib/generator';
import type { Solution } from '@/lib/generator';

export const runtime = 'nodejs';

/**
 * Mark a student's attempt.
 *
 * The response deliberately withholds the expected plaintext even when the
 * attempt is wrong. Returning it — or returning a per-character diff — would
 * turn the endpoint into an oracle that hands over the answer one request at a
 * time. A single similarity figure is coarse enough to be useful feedback and
 * too coarse to reconstruct anything from.
 */
export async function POST(request: Request) {
  const { sealed, answer } = await request.json().catch(() => ({ sealed: '', answer: '' }));

  if (typeof sealed !== 'string' || typeof answer !== 'string') {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const solution = unseal<Solution & { techniqueId: string }>(sealed);
  if (!solution) {
    return NextResponse.json(
      { error: 'This challenge envelope is not valid. Generate a fresh problem.' },
      { status: 400 },
    );
  }

  const result = gradeAnswer(answer, solution.plaintext);

  return NextResponse.json({
    correct: result.correct,
    // Rounded hard, so repeated submissions cannot be used to hill-climb toward
    // the answer character by character.
    proximity: result.correct ? 1 : Math.floor(result.similarity * 4) / 4,
    submittedLength: result.normalisedSubmitted.length,
    expectedLength: result.normalisedExpected.length,
  });
}
