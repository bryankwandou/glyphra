import { NextResponse } from 'next/server';
import { currentViewer } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await currentViewer();
  return NextResponse.json({ signedIn: Boolean(session), username: session?.username ?? null });
}
