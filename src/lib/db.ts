import 'server-only';
import { neon } from '@neondatabase/serverless';
import { env } from './env';

/**
 * The database is optional, and the application has to work without it.
 *
 * Everything that existed before it — practice problems, the workbench,
 * assessment papers, and any quiz code already handed out — is a pure function
 * of a seed and needs no storage at all. The database adds accounts, access
 * rules and a gradebook on top. If it is unreachable, those features report
 * themselves unavailable and the rest of the site carries on.
 *
 * This is why every call site checks `hasDb()` rather than assuming a
 * connection. A missing DATABASE_URL should degrade the product, not break it.
 */
let cached: ReturnType<typeof neon> | null = null;

export function hasDb(): boolean {
  return !!env('DATABASE_URL');
}

export function db() {
  const url = env('DATABASE_URL');
  if (!url) throw new Error('DATABASE_URL is not set.');
  if (!cached) cached = neon(url);
  return cached;
}

/* ------------------------------------------------------------------- types */

export type QuizMode = 'open' | 'first_correct' | 'host_only';

export interface Account {
  id: string;
  email: string;
  displayName: string;
}

export interface QuizPolicy {
  code: string;
  ownerId: string;
  title: string | null;
  mode: QuizMode;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
}

export interface Attempt {
  id: string;
  quizCode: string;
  participant: string;
  score: number;
  correct: number;
  total: number;
  perfect: boolean;
  submittedAt: string;
}

/* ------------------------------------------------------------------ quizzes */

/**
 * The access rules for a code, or null.
 *
 * Null is a normal answer, not an error: a code nobody has claimed is an open
 * quiz. Treating "no row" as "no access" would have silently broken every link
 * shared before this table existed.
 */
export async function quizPolicy(code: string): Promise<QuizPolicy | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    SELECT code, owner_id, title, mode, closed_at, closed_by, created_at
    FROM quizzes WHERE code = ${code} LIMIT 1
  `) as Record<string, unknown>[];
  if (!rows.length) return null;
  const r = rows[0];
  return {
    code: String(r.code),
    ownerId: String(r.owner_id),
    title: r.title === null ? null : String(r.title),
    mode: String(r.mode) as QuizMode,
    closedAt: r.closed_at ? new Date(r.closed_at as string).toISOString() : null,
    closedBy: r.closed_by === null ? null : String(r.closed_by),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function claimQuiz(
  code: string,
  ownerId: string,
  mode: QuizMode,
  title: string | null,
): Promise<QuizPolicy | null> {
  if (!hasDb()) return null;
  // Re-claiming your own code updates its rules. Someone else's is left alone,
  // which is what stops a code being taken over by whoever claims it second.
  await db()`
    INSERT INTO quizzes (code, owner_id, title, mode)
    VALUES (${code}, ${ownerId}, ${title}, ${mode})
    ON CONFLICT (code) DO UPDATE
      SET mode = EXCLUDED.mode,
          title = EXCLUDED.title
      WHERE quizzes.owner_id = ${ownerId}
  `;
  return quizPolicy(code);
}

export async function closeQuiz(code: string, ownerId: string, by: string): Promise<boolean> {
  if (!hasDb()) return false;
  const rows = (await db()`
    UPDATE quizzes SET closed_at = now(), closed_by = ${by}
    WHERE code = ${code} AND owner_id = ${ownerId} AND closed_at IS NULL
    RETURNING code
  `) as unknown[];
  return rows.length > 0;
}

export async function reopenQuiz(code: string, ownerId: string): Promise<boolean> {
  if (!hasDb()) return false;
  const rows = (await db()`
    UPDATE quizzes SET closed_at = NULL, closed_by = NULL
    WHERE code = ${code} AND owner_id = ${ownerId}
    RETURNING code
  `) as unknown[];
  return rows.length > 0;
}

export async function ownedQuizzes(ownerId: string): Promise<(QuizPolicy & { attempts: number; best: number | null })[]> {
  if (!hasDb()) return [];
  const rows = (await db()`
    SELECT q.code, q.owner_id, q.title, q.mode, q.closed_at, q.closed_by, q.created_at,
           COUNT(a.id)::int AS attempts,
           MAX(a.score)::int AS best
    FROM quizzes q
    LEFT JOIN attempts a ON a.quiz_code = q.code
    WHERE q.owner_id = ${ownerId}
    GROUP BY q.code
    ORDER BY q.created_at DESC
    LIMIT 100
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    code: String(r.code),
    ownerId: String(r.owner_id),
    title: r.title === null ? null : String(r.title),
    mode: String(r.mode) as QuizMode,
    closedAt: r.closed_at ? new Date(r.closed_at as string).toISOString() : null,
    closedBy: r.closed_by === null ? null : String(r.closed_by),
    createdAt: new Date(r.created_at as string).toISOString(),
    attempts: Number(r.attempts ?? 0),
    best: r.best === null || r.best === undefined ? null : Number(r.best),
  }));
}

/* ----------------------------------------------------------------- attempts */

export async function recordAttempt(a: Omit<Attempt, 'id' | 'submittedAt'>): Promise<void> {
  if (!hasDb()) return;
  await db()`
    INSERT INTO attempts (quiz_code, participant, score, correct, total, perfect)
    VALUES (${a.quizCode}, ${a.participant}, ${a.score}, ${a.correct}, ${a.total}, ${a.perfect})
  `;
}

export async function attemptsFor(code: string): Promise<Attempt[]> {
  if (!hasDb()) return [];
  const rows = (await db()`
    SELECT id, quiz_code, participant, score, correct, total, perfect, submitted_at
    FROM attempts WHERE quiz_code = ${code}
    ORDER BY score DESC, submitted_at ASC
    LIMIT 500
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    quizCode: String(r.quiz_code),
    participant: String(r.participant),
    score: Number(r.score),
    correct: Number(r.correct),
    total: Number(r.total),
    perfect: Boolean(r.perfect),
    submittedAt: new Date(r.submitted_at as string).toISOString(),
  }));
}

/**
 * Close a quiz because somebody solved it outright.
 *
 * Separate from `closeQuiz` because there is no owner in hand at that moment —
 * the person who triggered it is a participant, not the owner — and because the
 * reason matters to whoever comes back to look at it later.
 *
 * The EXISTS clause is the whole point. An earlier version simply closed
 * whatever it was pointed at and left "was this actually a perfect score?" to
 * the caller, which meant the rule lived at one call site instead of in the
 * rule itself. A verification run called it after a 50% attempt and the quiz
 * duly closed. Now the database confirms a full-marks attempt is on record
 * before it will close anything, so no caller can get this wrong.
 */
export async function closeOnPerfect(code: string, participant: string): Promise<void> {
  if (!hasDb()) return;
  await db()`
    UPDATE quizzes SET closed_at = now(), closed_by = ${participant}
    WHERE code = ${code}
      AND mode = 'first_correct'
      AND closed_at IS NULL
      AND EXISTS (
        SELECT 1 FROM attempts
        WHERE attempts.quiz_code = ${code}
          AND attempts.perfect
          AND attempts.participant = ${participant}
      )
  `;
}

/* ----------------------------------------------------------------- problems */

export interface ProblemRow {
  code: string;
  ownerId: string;
  techniqueId: string;
  label: string | null;
  disclose: boolean;
  solvedAt: string | null;
  solvedBy: string | null;
  attempts: number;
  createdAt: string;
}

function toProblem(r: Record<string, unknown>): ProblemRow {
  return {
    code: String(r.code),
    ownerId: String(r.owner_id),
    techniqueId: String(r.technique_id),
    label: r.label === null ? null : String(r.label),
    disclose: Boolean(r.disclose),
    solvedAt: r.solved_at ? new Date(r.solved_at as string).toISOString() : null,
    solvedBy: r.solved_by === null ? null : String(r.solved_by),
    attempts: Number(r.attempts ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function problemRow(code: string): Promise<ProblemRow | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    SELECT code, owner_id, technique_id, label, disclose, solved_at, solved_by, attempts, created_at
    FROM problems WHERE code = ${code} LIMIT 1
  `) as Record<string, unknown>[];
  return rows.length ? toProblem(rows[0]) : null;
}

export async function createProblem(
  code: string,
  ownerId: string,
  techniqueId: string,
  disclose: boolean,
  label: string | null,
): Promise<ProblemRow | null> {
  if (!hasDb()) return null;
  await db()`
    INSERT INTO problems (code, owner_id, technique_id, label, disclose)
    VALUES (${code}, ${ownerId}, ${techniqueId}, ${label}, ${disclose})
    ON CONFLICT (code) DO UPDATE
      SET label = EXCLUDED.label
      WHERE problems.owner_id = ${ownerId}
  `;
  return problemRow(code);
}

/**
 * Record an attempt, and close the problem if this one solved it.
 *
 * Both halves in one statement pair rather than a read-then-write, because two
 * people submitting the right answer within the same second would otherwise
 * both read "unsolved" and the second would overwrite the first. The UPDATE
 * carries `solved_at IS NULL` in its WHERE clause, so exactly one of them wins
 * and it is whoever the database serialises first.
 */
export async function recordProblemAttempt(
  code: string,
  participant: string,
  correct: boolean,
): Promise<{ solvedByYou: boolean; alreadySolved: boolean }> {
  if (!hasDb()) return { solvedByYou: false, alreadySolved: false };

  await db()`UPDATE problems SET attempts = attempts + 1 WHERE code = ${code}`;

  if (!correct) {
    const row = await problemRow(code);
    return { solvedByYou: false, alreadySolved: !!row?.solvedAt };
  }

  const won = (await db()`
    UPDATE problems SET solved_at = now(), solved_by = ${participant}
    WHERE code = ${code} AND solved_at IS NULL
    RETURNING code
  `) as unknown[];

  return { solvedByYou: won.length > 0, alreadySolved: won.length === 0 };
}

export async function ownedProblems(ownerId: string): Promise<ProblemRow[]> {
  if (!hasDb()) return [];
  const rows = (await db()`
    SELECT code, owner_id, technique_id, label, disclose, solved_at, solved_by, attempts, created_at
    FROM problems WHERE owner_id = ${ownerId}
    ORDER BY created_at DESC LIMIT 200
  `) as Record<string, unknown>[];
  return rows.map(toProblem);
}

export async function reopenProblem(code: string, ownerId: string): Promise<boolean> {
  if (!hasDb()) return false;
  const rows = (await db()`
    UPDATE problems SET solved_at = NULL, solved_by = NULL
    WHERE code = ${code} AND owner_id = ${ownerId}
    RETURNING code
  `) as unknown[];
  return rows.length > 0;
}
