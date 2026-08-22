import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { createProblem, hasDb } from '@/lib/db';
import { buildProblem } from '@/lib/problem';
import { encodeProblemCode, randomProblemSeed, PROBLEM_ROSTER } from '@/lib/problem-code';
import { UNUSABLE_AS_PROBLEMS } from '@/lib/generator';

export const runtime = 'nodejs';

/**
 * Mint one code for one problem, locked to one technique.
 *
 * The code is generated here but not *stored* here in any meaningful sense —
 * it already contains the technique and seed, so the row exists to give the
 * owner a history and a solved flag, not to make the code work. Delete the row
 * and the code still opens the same problem.
 */
export async function POST(request: Request) {
  if (!hasDb()) {
    return NextResponse.json({ error: 'No database is configured.' }, { status: 503 });
  }

  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const techniqueId = String(body.techniqueId ?? '');
  const disclose = body.disclose === true;
  const label = body.label ? String(body.label).slice(0, 120) : null;

  if (!PROBLEM_ROSTER.includes(techniqueId)) {
    return NextResponse.json({ error: 'Unknown technique.' }, { status: 400 });
  }

  // Refused at creation rather than filtered only in the dropdown, because the
  // dropdown is not the only way to reach this. Codes already minted for these
  // still decode — breaking a QR somebody printed would be the worse fault.
  if (UNUSABLE_AS_PROBLEMS.has(techniqueId)) {
    return NextResponse.json(
      {
        error:
          'That method hides its output, so the problem would show an empty box. ' +
          'It is in the catalogue and the workbench, but it cannot be set as a question.',
      },
      { status: 400 },
    );
  }

  // Retry rather than trust the first draw. A seed that produced an unusable
  // problem would otherwise be minted into a QR somebody prints.
  let code: string | null = null;
  let built: ReturnType<typeof buildProblem> = null;
  for (let attempt = 0; attempt < 8 && !built; attempt++) {
    code = encodeProblemCode({ techniqueId, seed: randomProblemSeed(), disclose });
    built = code ? buildProblem(code) : null;
  }

  if (!code || !built) {
    return NextResponse.json(
      { error: 'That technique could not produce a problem just now.' },
      { status: 500 },
    );
  }

  const row = await createProblem(code, account.id, techniqueId, disclose, label);
  if (!row || row.ownerId !== account.id) {
    return NextResponse.json({ error: 'Could not record that problem.' }, { status: 409 });
  }

  return NextResponse.json({ problem: row, preview: built.public });
}
