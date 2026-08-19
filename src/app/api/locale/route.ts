import { NextResponse } from 'next/server';
import { LOCALES, type Locale } from '@/lib/i18n/dict';
import { LOCALE_COOKIE } from '@/lib/i18n';

export const runtime = 'nodejs';

/**
 * Record the language choice.
 *
 * A year-long cookie rather than an account setting, because there are no
 * accounts. It is not marked httpOnly: nothing here is a secret, and a student
 * who wants to flip it from the console is welcome to.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const wanted = String(body.locale ?? '');

  if (!(LOCALES as readonly string[]).includes(wanted)) {
    return NextResponse.json({ error: 'Unknown language.' }, { status: 400 });
  }

  const res = NextResponse.json({ locale: wanted as Locale });
  res.cookies.set(LOCALE_COOKIE, wanted, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return res;
}
