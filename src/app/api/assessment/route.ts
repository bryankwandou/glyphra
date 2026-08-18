import { NextResponse } from 'next/server';
import { requireInstructor } from '@/lib/auth';
import { buildAssessment, LIMITS } from '@/lib/assessment';
import type { Difficulty, Family } from '@/lib/ciphers/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Build a set of assessment papers.
 *
 * Instructor-gated in full. Unlike the practice range, this route returns the
 * answers alongside the problems, because producing a marking key is the entire
 * point of it. Nothing here may reach a student.
 */
export async function POST(request: Request) {
  const session = await requireInstructor();
  if (!session) {
    return NextResponse.json({ error: 'Instructor sign-in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const papers = Number(body.papers);
  const problemsPerPaper = Number(body.problemsPerPaper);

  if (!Number.isFinite(papers) || papers < 1 || papers > LIMITS.maxPapers) {
    return NextResponse.json(
      { error: `Number of papers must be between 1 and ${LIMITS.maxPapers}.` },
      { status: 400 },
    );
  }
  if (
    !Number.isFinite(problemsPerPaper) ||
    problemsPerPaper < 1 ||
    problemsPerPaper > LIMITS.maxProblemsPerPaper
  ) {
    return NextResponse.json(
      { error: `Problems per paper must be between 1 and ${LIMITS.maxProblemsPerPaper}.` },
      { status: 400 },
    );
  }

  const assessment = buildAssessment({
    title: String(body.title ?? ''),
    masterSeed: String(body.masterSeed ?? '').trim() || Math.random().toString(36).slice(2, 10),
    papers,
    problemsPerPaper,
    techniqueIds: Array.isArray(body.techniqueIds) ? (body.techniqueIds as string[]) : undefined,
    families: Array.isArray(body.families) ? (body.families as Family[]) : undefined,
    difficulties: Array.isArray(body.difficulties) ? (body.difficulties as Difficulty[]) : undefined,
  });

  return NextResponse.json(assessment);
}
