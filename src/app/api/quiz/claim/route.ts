import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { claimQuiz, hasDb, type QuizMode } from '@/lib/db';
import { buildQuiz } from '@/lib/quiz';

export const runtime = 'nodejs';

const MODES: QuizMode[] = ['open', 'first_correct', 'host_only'];

/**
 * Attach ownership and access rules to a code.
 *
 * The code is not created here — it already exists, because it carries its own
 * quiz. This only records who owns it and under what terms, which is why an
 * unclaimed code keeps working exactly as it did before any of this existed.
 */
export async function POST(request: Request) {
  if (!hasDb()) {
    return NextResponse.json({ error: 'No database is configured.' }, { status: 503 });
  }

  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const raw = String(body.code ?? '');
  const mode = String(body.mode ?? 'open') as QuizMode;
  const title = body.title ? String(body.title).slice(0, 120) : null;

  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: 'Unknown mode.' }, { status: 400 });
  }

  // Confirm the code actually decodes before recording anything against it.
  // Storing rules for a code that opens nothing would be a row nobody can use.
  //
  // The builder also hands back the canonical spelling, and that is what the
  // row is keyed on. Claiming under whatever spelling the caller happened to
  // send would put the rules somewhere the reading side never looks.
  const built = buildQuiz(raw);
  if (!built) {
    return NextResponse.json({ error: 'That code does not open a quiz.' }, { status: 404 });
  }
  const code = built.code;

  const policy = await claimQuiz(code, account.id, mode, title);
  if (!policy || policy.ownerId !== account.id) {
    return NextResponse.json(
      { error: 'That code is already claimed by another account.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ policy });
}
