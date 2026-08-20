import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { attemptsFor, quizPolicy, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * The gradebook for one quiz. Owner only.
 *
 * Participants see their own result on their own screen and nothing else. The
 * person who set the quiz sees the list. Anyone else sees 403, because a join
 * code is meant to let you take a quiz, not to read what a class scored.
 */
export async function GET(request: Request) {
  if (!hasDb()) {
    return NextResponse.json({ error: 'No database is configured.' }, { status: 503 });
  }

  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const code = (new URL(request.url).searchParams.get('code') ?? '').toUpperCase();
  const policy = await quizPolicy(code);

  if (!policy) return NextResponse.json({ error: 'No such quiz.' }, { status: 404 });
  if (policy.ownerId !== account.id) {
    return NextResponse.json({ error: 'That quiz is not yours.' }, { status: 403 });
  }

  return NextResponse.json({ policy, attempts: await attemptsFor(code) });
}
