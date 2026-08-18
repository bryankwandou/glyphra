import { NextResponse } from 'next/server';
import { checkCredentials, createSession } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Sign-in attempts per address, kept in memory.
 *
 * This resets whenever the serverless instance recycles, so it is a speed bump
 * rather than a real limiter — enough to make online guessing tedious, not
 * enough to stop a determined attacker. A durable store would be needed for
 * that, and is worth adding before this handles anything of consequence.
 */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a few minutes before trying again.' },
      { status: 429 },
    );
  }

  const { username, password } = await request
    .json()
    .catch(() => ({ username: '', password: '' }));

  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    // One message for both failure modes, so the response does not confirm
    // whether the username exists.
    return NextResponse.json(
      { error: 'Those credentials were not accepted.' },
      { status: 401 },
    );
  }

  await createSession(username);
  attempts.delete(ip);
  return NextResponse.json({ ok: true, username });
}
