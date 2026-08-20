import { NextResponse } from 'next/server';
import { authenticate, issueSession, ACCOUNT_COOKIE } from '@/lib/accounts';
import { hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * In-memory, so it resets whenever a serverless instance recycles. A speed bump
 * against a script, not a limiter — the same honest caveat the instructor login
 * carries. A durable store is the fix if this ever guards anything real.
 */
const recent = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 8;

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = recent.get(key);
  if (!entry || now > entry.until) {
    recent.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

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

  if (throttled(email.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 });
  }

  const account = await authenticate(email, password);
  if (!account) {
    // One message for both a missing account and a wrong password, so this
    // cannot be used to find out which addresses are registered.
    return NextResponse.json({ error: 'Those details did not match.' }, { status: 401 });
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
