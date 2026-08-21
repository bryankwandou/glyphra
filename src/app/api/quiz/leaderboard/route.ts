import { NextResponse } from 'next/server';
import { canonicalQuizCode } from '@/lib/quiz-code';
import { attemptsFor, quizPolicy, hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * The standings for a claimed quiz.
 *
 * Open to participants, unlike the owner's gradebook, and narrower on purpose:
 * a rank, a display name and a score. No timestamps, no attempt counts, nothing
 * that says who tried and failed how many times. Seeing where you placed is
 * motivating; publishing somebody's five failed attempts to the rest of a class
 * is not, and the two are easy to conflate when the data sits in one table.
 *
 * An unclaimed quiz has no standings at all, because nothing was ever recorded
 * against it. That is the same trade as everywhere else here.
 */
export async function GET(request: Request) {
  if (!hasDb()) return NextResponse.json({ available: false, rows: [] });

  const code = canonicalQuizCode(new URL(request.url).searchParams.get('code') ?? '') ?? '';
  const policy = await quizPolicy(code);
  if (!policy) return NextResponse.json({ available: false, rows: [] });

  const attempts = await attemptsFor(code);

  // One row per person: their best score, and the earliest time they reached
  // it. Ranking every attempt separately would let one participant fill the
  // whole board by retrying, which turns a leaderboard into a patience contest.
  const best = new Map<string, { participant: string; score: number; correct: number; total: number; at: string }>();
  for (const a of attempts) {
    const key = a.participant.toLowerCase();
    const seen = best.get(key);
    if (!seen || a.score > seen.score || (a.score === seen.score && a.submittedAt < seen.at)) {
      best.set(key, {
        participant: a.participant,
        score: a.score,
        correct: a.correct,
        total: a.total,
        at: a.submittedAt,
      });
    }
  }

  const rows = [...best.values()]
    .sort((x, y) => y.score - x.score || x.at.localeCompare(y.at))
    .slice(0, 50)
    .map((r, i) => ({
      rank: i + 1,
      participant: r.participant,
      score: r.score,
      correct: r.correct,
      total: r.total,
    }));

  return NextResponse.json({
    available: true,
    mode: policy.mode,
    closed: !!policy.closedAt,
    title: policy.title,
    participants: rows.length,
    rows,
  });
}
