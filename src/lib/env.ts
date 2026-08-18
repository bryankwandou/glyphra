/**
 * Environment values arrive untrimmed more often than anyone expects.
 *
 * Piping a value into a deployment CLI appends a newline. Writing an env file
 * from PowerShell prepends a byte-order mark. Neither is visible anywhere: the
 * symptom is a correct password rejected, or a URL that looks right and 404s.
 * Both of those cost a debugging cycle on this project, so every environment
 * read goes through here.
 */
export function env(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/^﻿/, '').trim();
  return cleaned === '' ? undefined : cleaned;
}

/** Same cleaning, for values already in hand rather than read from the env. */
export function clean(value: string | undefined): string {
  return (value ?? '').replace(/^﻿/, '').trim();
}
