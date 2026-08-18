import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Instructor session.
 *
 * One privileged account gates the answer keys and the worked solutions.
 * Credentials come from the environment; the defaults below exist so the
 * project runs immediately after cloning, and they are the account the brief
 * specified.
 *
 * Worth stating plainly: a single shared credential committed to a public
 * repository is not a security boundary against anyone who reads the source.
 * It keeps answers away from a student poking at the running application, which
 * is the actual threat here, and nothing more. Set GLYPHRA_ADMIN_USER and
 * GLYPHRA_ADMIN_PASSWORD in the deployment environment to change them.
 */
const DEFAULT_USER = 'nayrbryanGaming';
const DEFAULT_PASSWORD = 'nayrbryanGaming';

const COOKIE = 'glyphra_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secretKey(): Uint8Array {
  const raw = process.env.GLYPHRA_SECRET ?? 'glyphra-development-fallback';
  return createHash('sha256').update(`${raw}:session`).digest();
}

/** Constant-time comparison, so a wrong guess leaks nothing through timing. */
function matches(supplied: string, expected: string): boolean {
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function checkCredentials(username: string, password: string): boolean {
  const user = process.env.GLYPHRA_ADMIN_USER ?? DEFAULT_USER;
  const pass = process.env.GLYPHRA_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  // Both comparisons always run, so failure timing does not reveal which half
  // was wrong.
  const userOk = matches(username, user);
  const passOk = matches(password, pass);
  return userOk && passOk;
}

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ sub: username, role: 'instructor' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function currentSession(): Promise<{ username: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== 'instructor') return null;
    return { username: String(payload.sub ?? 'instructor') };
  } catch {
    return null;
  }
}

export async function requireInstructor(): Promise<{ username: string } | null> {
  return currentSession();
}
