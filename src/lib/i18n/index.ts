import 'server-only';
import { cookies } from 'next/headers';
import { LOCALES, type Locale, type Dict, DICT } from './dict';

export const LOCALE_COOKIE = 'glyphra_lang';

/**
 * The chosen language, read on the server.
 *
 * A cookie rather than a URL prefix. Prefixed routes are the better answer when
 * a site needs each language indexed separately, and this one does not: it is a
 * tool people sign in to and share codes for, not a page anybody arrives at
 * from a search. A cookie keeps every route working unchanged and lets server
 * components render already-translated markup, so nothing flashes in English
 * before switching.
 */
export async function currentLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(raw ?? '') ? (raw as Locale) : 'en';
}

export async function t(): Promise<Dict> {
  return DICT[await currentLocale()];
}
