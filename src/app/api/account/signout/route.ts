import { NextResponse } from 'next/server';
import { ACCOUNT_COOKIE } from '@/lib/accounts';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCOUNT_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
