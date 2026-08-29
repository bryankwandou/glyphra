import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from './env';

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
  const raw = env('GLYPHRA_SECRET') ?? 'glyphra-development-fallback';
  return createHash('sha256').update(`${raw}:session`).digest();
}

/** Constant-time comparison, so a wrong guess leaks nothing through timing. */
function matches(supplied: string, expected: string): boolean {
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function checkCredentials(username: string, password: string): boolean {
  const user = env('GLYPHRA_ADMIN_USER') ?? DEFAULT_USER;
  const pass = env('GLYPHRA_ADMIN_PASSWORD') ?? DEFAULT_PASSWORD;
  // Both comparisons always run, so failure timing does not reveal which half
  // was wrong. The submitted values are trimmed too — a password manager or a
  // mobile keyboard adding a trailing space should not read as a wrong password.
  const userOk = matches(username.trim(), user);
  const passOk = matches(password.trim(), pass);
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
  // Either credential. This gates the only route that opens a sealed solution,
  // and it asked solely about the older cookie — so an instructor who signed in
  // with an account, on the page headed "Instructor sign-in", could never open
  // an answer key. The sign-in reported success and the thing it was for stayed
  // shut.
  return currentViewer();
}

/**
 * Signed in as somebody who may see answers — by either credential.
 *
 * Two sign-ins exist. `currentSession` reads the older single-instructor
 * cookie; accounts set a different one. Every page that asked only the first
 * treated an account holder as a stranger, which is how somebody could sign in
 * successfully and still be shown a sign-in button, and how an instructor with
 * an account could not see the worked solutions their account is for.
 *
 * The import is deferred because accounts.ts pulls in the database client, and
 * this module is used on paths that must keep working with no database
 * configured at all.
 */
export async function currentViewer(): Promise<{ username: string } | null> {
  const legacy = await currentSession();
  if (legacy) return legacy;

  try {
    const { currentAccount } = await import('./accounts');
    const account = await currentAccount();
    return account ? { username: account.displayName } : null;
  } catch {
    return null;
  }
}
