import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { closeQuiz, reopenQuiz, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasDb()) {
    return NextResponse.json({ error: 'No database is configured.' }, { status: 503 });
  }

  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? '').toUpperCase();
  const reopen = body.reopen === true;

  const ok = reopen
    ? await reopenQuiz(code, account.id)
    : await closeQuiz(code, account.id, account.displayName);

  if (!ok) {
    return NextResponse.json(
      { error: reopen ? 'Nothing to reopen.' : 'Not yours, or already closed.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, closed: !reopen });
}
