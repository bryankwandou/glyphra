import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

/**
 * Authenticated envelope for challenge answers.
 *
 * A generated problem carries its solution with it, but the solution travels
 * sealed: the student's browser receives an opaque blob it cannot open, and the
 * server unseals it only to mark an attempt or to serve the instructor view.
 * This keeps the whole system stateless — no database, no session storage —
 * while making it impossible to read the answer out of network traffic, local
 * storage, or the page source.
 *
 * AES-256-GCM is used rather than plain encryption because the authentication
 * tag also prevents a student from editing a sealed answer and resubmitting it.
 */

const FALLBACK_WARNING =
  'GLYPHRA_SECRET is not set. Falling back to a build-time constant, which means ' +
  'sealed answers are readable by anyone with the source. Set it before any real use.';

let warned = false;

function keyMaterial(): Buffer {
  // Trimmed for the same reason as in auth.ts: values piped into a deployment
  // CLI arrive with a trailing newline, and an invisible difference in key
  // material is a miserable thing to debug.
  const secret = process.env.GLYPHRA_SECRET?.replace(/^﻿/, '').trim();
  if (!secret) {
    if (!warned && process.env.NODE_ENV === 'production') {
      console.warn(FALLBACK_WARNING);
      warned = true;
    }
    return createHash('sha256').update('glyphra-development-fallback').digest();
  }
  return createHash('sha256').update(secret).digest();
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString('base64url');
}

export function unseal<T>(token: string): T | null {
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const body = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', keyMaterial(), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(body), decipher.final()]);
    return JSON.parse(out.toString('utf8')) as T;
  } catch {
    // A bad tag, a truncated blob or tampered bytes all land here. There is no
    // useful distinction to draw for the caller — the envelope is not valid.
    return null;
  }
}
