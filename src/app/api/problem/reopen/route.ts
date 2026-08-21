import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { reopenProblem, hasDb } from '@/lib/db';
import { canonicalProblemCode } from '@/lib/problem-code';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasDb()) return NextResponse.json({ error: 'No database is configured.' }, { status: 503 });

  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = canonicalProblemCode(String(body.code ?? '')) ?? '';

  const ok = await reopenProblem(code, account.id);
  if (!ok) return NextResponse.json({ error: 'Not yours.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
