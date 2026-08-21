import { NextResponse } from 'next/server';
import { markProblem } from '@/lib/problem';
import { canonicalProblemCode } from '@/lib/problem-code';
import { problemRow, recordProblemAttempt, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Submit an answer to a single problem.
 *
 * A problem that has been solved is closed to everybody, including the person
 * who solved it — the whole point of the mode is that the first correct answer
 * ends it. The check happens here rather than only in the interface, for the
 * same reason every other rule does.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = canonicalProblemCode(String(body.code ?? '')) ?? '';
  const answer = String(body.answer ?? '');
  const name = String(body.name ?? '').trim().slice(0, 40) || 'anonymous';

  const row = hasDb() ? await problemRow(code) : null;

  if (row?.solvedAt) {
    return NextResponse.json(
      {
        error: 'This problem has already been solved.',
        solved: true,
        solvedBy: row.solvedBy,
      },
      { status: 423 },
    );
  }

  const marked = markProblem(code, answer);
  if (!marked) {
    return NextResponse.json({ error: 'That code does not open a problem.' }, { status: 404 });
  }

  let solvedByYou = false;
  if (row) {
    try {
      const outcome = await recordProblemAttempt(code, name, marked.correct);
      solvedByYou = outcome.solvedByYou;
      if (marked.correct && outcome.alreadySolved) {
        // Somebody won the race between the check above and this write.
        return NextResponse.json(
          { error: 'Somebody solved it a moment before you did.', solved: true },
          { status: 423 },
        );
      }
    } catch {
      // The marking stands even if the history could not be written.
    }
  }

  return NextResponse.json({
    correct: marked.correct,
    proximity: marked.proximity,
    solvedByYou,
    recorded: !!row,
  });
}
