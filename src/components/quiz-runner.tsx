'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/client';

interface Question {
  number: number;
  techniqueName: string;
  family: string;
  difficulty: number;
  era: string;
  summary: string;
  theory: string;
  prompt: string;
  ciphertext: string;
  keyFields: { label: string; disclosed: boolean; value?: string }[];
  plaintextLength: number;
}

interface Quiz {
  code: string;
  timeLimitSeconds: number | null;
  questionCount: number;
  difficultyLow: number;
  difficultyHigh: number;
  questions: Question[];
}

interface QuestionResult {
  number: number;
  correct: boolean;
  proximity: number;
  submitted: string;
  expected: string;
  techniqueName: string;
}

interface Result {
  code: string;
  name: string;
  total: number;
  correct: number;
  score: number;
  results: QuestionResult[];
}

type Phase = 'lobby' | 'running' | 'review' | 'done';

function clockFace(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const storageKey = `glyphra:quiz:${quiz.code}`;
  const d = useT();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [name, setName] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => new Array(quiz.questions.length).fill(''));
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(quiz.timeLimitSeconds);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [copied, setCopied] = useState(false);

  const answerRef = useRef<HTMLTextAreaElement>(null);

  /* -------------------------------------------------------------- persistence
     A tab closed by accident should not cost the attempt. Answers are kept
     locally against the code, so reopening the link picks up where it left off.
     Local only — nothing here is sent anywhere until the attempt is submitted. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.answers) && parsed.answers.length === quiz.questions.length) {
        setAnswers(parsed.answers);
        if (typeof parsed.name === 'string') setName(parsed.name);
      }
    } catch {
      // A corrupted entry is not worth surfacing; the quiz just starts fresh.
    }
  }, [storageKey, quiz.questions.length]);

  useEffect(() => {
    if (phase === 'lobby') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, name }));
    } catch {
      // Private browsing refuses writes. The attempt still works.
    }
  }, [answers, name, phase, storageKey]);

  const answeredCount = answers.filter((a) => a.trim()).length;
  const unanswered = useMemo(
    () => answers.map((a, i) => (a.trim() ? -1 : i)).filter((i) => i >= 0),
    [answers],
  );

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: quiz.code, answers, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Marking failed.');
      setResult(data);
      setPhase('done');
      try {
        localStorage.removeItem(storageKey);
      } catch { /* nothing to clean up */ }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [quiz.code, answers, name, storageKey]);

  /* -------------------------------------------------------------------- timer
     Runs against wall-clock rather than counting ticks, so a backgrounded tab
     that stops firing intervals does not hand out extra minutes. */
  useEffect(() => {
    if (phase !== 'running' || quiz.timeLimitSeconds === null) return;
    const endsAt = Date.now() + (remaining ?? quiz.timeLimitSeconds) * 1000;

    const tick = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        void submit();
      }
    }, 500);

    return () => clearInterval(tick);
    // Deliberately not depending on `remaining`; the deadline is fixed when the
    // attempt starts, and re-deriving it every second would drift.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quiz.timeLimitSeconds, submit]);

  const setAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const go = (index: number) => {
    setCurrent(Math.max(0, Math.min(quiz.questions.length - 1, index)));
    setShowTheory(false);
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  const toggleFlag = (index: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard refused; the URL bar still has it */ }
  };

  /* ------------------------------------------------------------------- lobby */
  if (phase === 'lobby') {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <div className="rounded-2xl border border-border-subtle bg-bg-raised p-7 shadow-[var(--shadow-md)]">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-text-faint">
            {d.quiz.eyebrow}
          </p>
          <h1 className="mt-2 font-mono text-3xl font-semibold tracking-[-0.02em] text-accent">
            {quiz.code}
          </h1>

          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-bg-sunken px-3 py-3">
              <dt className="text-xs text-text-faint">{d.common.questions}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{quiz.questionCount}</dd>
            </div>
            <div className="rounded-lg bg-bg-sunken px-3 py-3">
              <dt className="text-xs text-text-faint">{d.common.difficulty}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {quiz.difficultyLow === quiz.difficultyHigh
                  ? quiz.difficultyLow
                  : `${quiz.difficultyLow}–${quiz.difficultyHigh}`}
              </dd>
            </div>
            <div className="rounded-lg bg-bg-sunken px-3 py-3">
              <dt className="text-xs text-text-faint">{d.common.time}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {quiz.timeLimitSeconds ? `${quiz.timeLimitSeconds / 60}m` : d.common.open}
              </dd>
            </div>
          </dl>

          <label htmlFor="qname" className="mt-6 block text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.quiz.yourName}
          </label>
          <input
            id="qname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={d.quiz.namePlaceholder}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-text-faint">
            {d.quiz.nameNote}
          </p>

          {answeredCount > 0 && (
            <p className="mt-4 rounded-lg border border-ok bg-ok-soft px-3 py-2 text-sm text-ok">
              {d.quiz.resumeFound(answeredCount, quiz.questions.length)}
            </p>
          )}

          <button
            type="button"
            onClick={() => { setPhase('running'); go(0); }}
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {answeredCount > 0 ? d.quiz.resume : d.quiz.start}
          </button>

          <button
            type="button"
            onClick={copyLink}
            className="mt-3 w-full rounded-xl border border-border-strong px-4 py-2.5 text-sm transition-colors hover:border-accent"
          >
            {copied ? d.quiz.linkCopied : d.quiz.copyLink}
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------- done */
  if (phase === 'done' && result) {
    const band =
      result.score >= 80 ? 'text-ok' : result.score >= 50 ? 'text-warn' : 'text-bad';

    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="rounded-2xl border border-border-subtle bg-bg-raised p-7 text-center">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-text-faint">
            {result.name ? `${result.name} — ` : ''}{d.quiz.eyebrow} {result.code}
          </p>
          <div className={`mt-3 text-6xl font-semibold tabular-nums tracking-tight ${band}`}>
            {result.score}%
          </div>
          <p className="mt-2 text-text-muted">
            {d.quiz.recovered(result.correct, result.total)}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/practice"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
            >
              {d.quiz.keepPractising}
            </Link>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl border border-border-strong px-5 py-2.5 text-sm transition-colors hover:border-accent"
            >
              {copied ? d.quiz.linkCopied : d.quiz.shareQuiz}
            </button>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-medium tracking-[-0.01em]">{d.quiz.whereMarks}</h2>
        <ol className="mt-4 space-y-3">
          {result.results.map((r) => (
            <li
              key={r.number}
              className={`rounded-xl border p-4 ${
                r.correct ? 'border-ok bg-ok-soft' : 'border-border-subtle bg-bg-raised'
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium tabular-nums">{r.number}.</span>
                <span className="text-sm text-text-muted">{r.techniqueName}</span>
                <span className={`ml-auto text-xs font-medium ${r.correct ? 'text-ok' : 'text-bad'}`}>
                  {r.correct ? d.quiz.correct : r.submitted.trim() ? d.quiz.notRecovered : d.quiz.leftBlank}
                </span>
              </div>

              {!r.correct && (
                <div className="mt-3 space-y-2">
                  {r.submitted.trim() && (
                    <div>
                      <div className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
                        {d.quiz.youWrote}
                      </div>
                      <p className="plain-text mt-0.5 break-words text-sm text-text-muted">
                        {r.submitted}
                      </p>
                    </div>
                  )}
                  <div>
                    <div className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
                      {d.quiz.messageWas}
                    </div>
                    <p className="plain-text mt-0.5 break-words text-sm text-text">{r.expected}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  /* ------------------------------------------------------------------ review */
  if (phase === 'review') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{d.quiz.reviewTitle}</h1>
        <p className="mt-2 text-text-muted">
          {d.quiz.reviewLead(answeredCount, quiz.questions.length)}
          {unanswered.length > 0 && ` ${d.quiz.reviewBlankWarn}`}
        </p>

        <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {quiz.questions.map((q, i) => (
            <button
              key={q.number}
              type="button"
              onClick={() => { setPhase('running'); go(i); }}
              className={`rounded-lg border px-2 py-3 text-sm tabular-nums transition-colors ${
                answers[i].trim()
                  ? 'border-ok bg-ok-soft text-ok'
                  : 'border-border-strong bg-bg-raised text-text-faint hover:border-accent'
              }`}
            >
              {q.number}
              {flagged.has(i) && <span className="ml-0.5 text-warn">*</span>}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? d.quiz.marking : d.quiz.submit}
          </button>
          <button
            type="button"
            onClick={() => setPhase('running')}
            className="rounded-xl border border-border-strong px-5 py-3 text-sm transition-colors hover:border-accent"
          >
            {d.quiz.backToQuestions}
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- running */
  const q = quiz.questions[current];
  const lowOnTime = remaining !== null && remaining <= 60;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      {/* progress and clock */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm tabular-nums text-text-muted">
          {d.quiz.questionOf(current + 1, quiz.questions.length)}
        </span>
        <span className="text-xs text-text-faint">{d.quiz.answered(answeredCount)}</span>
        {remaining !== null && (
          <span
            className={`ml-auto rounded-lg px-2.5 py-1 font-mono text-sm tabular-nums ${
              lowOnTime ? 'bg-bad-soft text-bad' : 'bg-bg-sunken text-text-muted'
            }`}
            role="timer"
            aria-live={lowOnTime ? 'assertive' : 'off'}
          >
            {clockFace(remaining)}
          </span>
        )}
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-sunken">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* question map */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {quiz.questions.map((item, i) => (
          <button
            key={item.number}
            type="button"
            onClick={() => go(i)}
            aria-current={i === current}
            aria-label={`${d.quiz.questionOf(item.number, quiz.questions.length)} — ${answers[i].trim() ? d.quiz.answered(1) : '0'}`}
            className={`h-7 w-7 rounded-md text-xs tabular-nums transition-colors ${
              i === current
                ? 'bg-accent text-accent-text'
                : answers[i].trim()
                  ? 'bg-ok-soft text-ok'
                  : 'bg-bg-sunken text-text-faint hover:text-text'
            }`}
          >
            {item.number}
          </button>
        ))}
      </div>

      {/* the question */}
      <article className="rise mt-6 space-y-4">
        <header className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent">
              {q.techniqueName}
            </span>
            <span className="text-text-faint">{q.era}</span>
            <span className="ml-auto tabular-nums text-text-faint">{d.common.difficulty} {q.difficulty}</span>
          </div>

          <p className="mt-3 text-[0.9375rem] leading-relaxed">{q.prompt}</p>

          {q.keyFields.length > 0 && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.keyFields.map((f) => (
                <div key={f.label} className="rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2">
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
                    {f.label}
                  </dt>
                  <dd className={`mt-0.5 text-sm ${f.disclosed ? 'font-mono text-text' : 'text-text-faint'}`}>
                    {f.disclosed ? f.value : d.quiz.withheld}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              {d.quiz.ciphertext}
            </h2>
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="text-xs tabular-nums text-text-faint">
              {q.plaintextLength} {d.quiz.characters}
            </span>
          </div>
          <p className="cipher-text slim-scroll mt-3 max-h-60 overflow-y-auto rounded-lg bg-bg-sunken p-4 text-[0.9375rem] leading-loose text-cipher">
            {q.ciphertext}
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
          <label htmlFor="qans" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.quiz.yourAnswer}
          </label>
          <textarea
            id="qans"
            ref={answerRef}
            value={answers[current]}
            rows={3}
            spellCheck={false}
            onChange={(e) => setAnswer(current, e.target.value)}
            placeholder={d.quiz.answerPlaceholder}
            className="plain-text mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFlag(current)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                flagged.has(current)
                  ? 'border-warn bg-warn-soft text-warn'
                  : 'border-border-strong text-text-muted hover:border-accent'
              }`}
            >
              {flagged.has(current) ? d.quiz.flagged : d.quiz.flag}
            </button>
            <button
              type="button"
              onClick={() => setShowTheory((s) => !s)}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent"
            >
              {showTheory ? d.quiz.hideTheory : d.quiz.showTheory}
            </button>
          </div>

          {showTheory && (
            <div className="mt-3 rounded-xl border border-border-subtle bg-bg-sunken p-4">
              <p className="text-sm italic text-text-muted">{q.summary}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{q.theory}</p>
            </div>
          )}
        </div>
      </article>

      {/* navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current === 0}
          className="rounded-xl border border-border-strong px-4 py-2.5 text-sm transition-colors hover:border-accent disabled:opacity-40"
        >
          {d.common.previous}
        </button>
        {current < quiz.questions.length - 1 ? (
          <button
            type="button"
            onClick={() => go(current + 1)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {d.common.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPhase('review')}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {d.quiz.reviewSubmit}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPhase('review')}
          className="ml-auto text-sm text-text-muted transition-colors hover:text-text"
        >
          {d.quiz.finishEarly}
        </button>
      </div>
    </div>
  );
}
