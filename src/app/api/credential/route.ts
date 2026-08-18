import { NextResponse } from 'next/server';
import { unseal } from '@/lib/seal';
import { gradeAnswer } from '@/lib/generator';
import type { Solution } from '@/lib/generator';
import { anchorAttestation, attestationDigest } from '@/lib/solana';
import { getTechnique } from '@/lib/ciphers';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Issue an on-chain credential for a solved problem.
 *
 * The answer is re-checked here rather than trusting a flag from the browser.
 * A client that simply asserted "I solved it" would make the credential
 * meaningless, which would be worse than not having one.
 */
export async function POST(request: Request) {
  const { sealed, answer, solver } = await request
    .json()
    .catch(() => ({ sealed: '', answer: '', solver: '' }));

  if (typeof sealed !== 'string' || typeof answer !== 'string') {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const solution = unseal<Solution & { techniqueId: string }>(sealed);
  if (!solution) {
    return NextResponse.json({ error: 'This challenge envelope is not valid.' }, { status: 400 });
  }

  const graded = gradeAnswer(answer, solution.plaintext);
  if (!graded.correct) {
    return NextResponse.json(
      { error: 'A credential is only issued for a correct solution.' },
      { status: 403 },
    );
  }

  const technique = getTechnique(solution.techniqueId);
  const solverLabel = typeof solver === 'string' && solver.trim() ? solver.trim().slice(0, 44) : 'anonymous';
  const seed = sealed.slice(0, 12);

  const digest = attestationDigest({
    technique: solution.techniqueId,
    seed,
    plaintext: solution.plaintext,
    solver: solverLabel,
  });

  const result = await anchorAttestation({
    technique: solution.techniqueId,
    difficulty: technique?.difficulty ?? 0,
    seed,
    solvedAt: new Date().toISOString(),
    digest,
  });

  return NextResponse.json(
    {
      ...result,
      technique: technique?.name ?? solution.techniqueId,
      difficulty: technique?.difficulty ?? 0,
      digest,
    },
    { status: result.ok ? 200 : 502 },
  );
}
