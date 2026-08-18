import { NextResponse } from 'next/server';
import { unseal } from '@/lib/seal';
import { requireInstructor } from '@/lib/auth';
import type { Solution } from '@/lib/generator';

export const runtime = 'nodejs';

/**
 * The instructor view: full answer key, the key values, and the complete
 * worked solution in both directions.
 *
 * This is the only route that opens a sealed envelope and returns its contents.
 * Everything it serves is gated on a verified session — there is no query
 * parameter, header, or client flag that reaches it another way.
 */
export async function POST(request: Request) {
  const session = await requireInstructor();
  if (!session) {
    return NextResponse.json(
      { error: 'Instructor sign-in required.' },
      { status: 401 },
    );
  }

  const { sealed } = await request.json().catch(() => ({ sealed: '' }));
  if (typeof sealed !== 'string' || !sealed) {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const solution = unseal<Solution & { techniqueId: string }>(sealed);
  if (!solution) {
    return NextResponse.json(
      { error: 'This challenge envelope is not valid.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    plaintext: solution.plaintext,
    key: solution.key,
    encodeSteps: solution.encodeSteps,
    decodeSteps: solution.decodeSteps,
    viewedBy: session.username,
  });
}
