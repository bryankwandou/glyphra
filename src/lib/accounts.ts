import 'server-only';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db, hasDb, type Account } from './db';
import { env } from './env';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const ACCOUNT_COOKIE = 'glyphra_account';

/**
 * scrypt from the standard library rather than bcrypt or argon2.
 *
 * Both of those are better-studied choices for this job and either would be a
 * reasonable upgrade. scrypt is here because it needs no native module, which
 * on a serverless runtime is the difference between deploying and not. The
 * parameters below are the Node defaults with an explicit cost, and they are
 * the part to raise first if this ever guards anything of consequence.
 */
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), KEYLEN);
  const expected = Buffer.from(hashHex, 'hex');
  // Length has to match before timingSafeEqual, which throws rather than
  // returning false when the buffers differ in size.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/* -------------------------------------------------------------- validation */

export interface FieldError {
  field: 'email' | 'password' | 'displayName';
  message: string;
}

export function checkSignUp(
  email: string,
  password: string,
  displayName: string,
): FieldError | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: 'That does not look like an email address.' };
  }
  if (password.length < 10) {
    // Ten rather than eight. This account can see answer keys for a whole
    // cohort, and length is the only thing that reliably helps.
    return { field: 'password', message: 'Use at least 10 characters.' };
  }
  if (password.length > 200) {
    return { field: 'password', message: 'That is longer than 200 characters.' };
  }
  if (!displayName.trim() || displayName.trim().length > 60) {
    return { field: 'displayName', message: 'A name between 1 and 60 characters.' };
  }
  return null;
}

/* ------------------------------------------------------------------ storage */

export async function createAccount(
  email: string,
  password: string,
  displayName: string,
): Promise<Account | { error: string }> {
  if (!hasDb()) return { error: 'Accounts are unavailable — no database is configured.' };

  const key = email.trim().toLowerCase();
  const existing = (await db()`SELECT id FROM accounts WHERE email_key = ${key} LIMIT 1`) as unknown[];
  if (existing.length) return { error: 'An account already exists for that address.' };

  const id = randomUUID();
  const hash = await hashPassword(password);
  await db()`
    INSERT INTO accounts (id, email, email_key, display_name, password_hash)
    VALUES (${id}, ${email.trim()}, ${key}, ${displayName.trim()}, ${hash})
  `;
  return { id, email: email.trim(), displayName: displayName.trim() };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<Account | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    SELECT id, email, display_name, password_hash
    FROM accounts WHERE email_key = ${email.trim().toLowerCase()} LIMIT 1
  `) as Record<string, unknown>[];
  if (!rows.length) return null;
  const row = rows[0];
  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
  };
}

/* ----------------------------------------------------------------- sessions */

function secret(): Uint8Array {
  return new TextEncoder().encode(env('GLYPHRA_SECRET') ?? 'glyphra-development-secret');
}

/**
 * A signed token in an httpOnly cookie rather than a sessions table.
 *
 * Nothing here needs revoking mid-session, and a table would mean a database
 * round trip on every request that only ever confirms what the signature
 * already proves. Fourteen days, then sign in again.
 */
export async function issueSession(account: Account): Promise<string> {
  return new SignJWT({ email: account.email, name: account.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(account.id)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(secret());
}

export async function currentAccount(): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      displayName: String(payload.name ?? ''),
    };
  } catch {
    // Expired or tampered with. Both mean "not signed in".
    return null;
  }
}
