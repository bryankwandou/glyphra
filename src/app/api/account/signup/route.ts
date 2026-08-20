import { NextResponse } from 'next/server';
import { createAccount, checkSignUp, issueSession, ACCOUNT_COOKIE } from '@/lib/accounts';
import { hasDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasDb()) {
    return NextResponse.json(
      { error: 'Accounts are unavailable here — no database is configured.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');
  const displayName = String(body.displayName ?? '');

  const problem = checkSignUp(email, password, displayName);
  if (problem) {
    return NextResponse.json({ error: problem.message, field: problem.field }, { status: 400 });
  }

  const account = await createAccount(email, password, displayName);
  if ('error' in account) {
    return NextResponse.json({ error: account.error, field: 'email' }, { status: 409 });
  }

  const res = NextResponse.json({ account });
  res.cookies.set(ACCOUNT_COOKIE, await issueSession(account), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
