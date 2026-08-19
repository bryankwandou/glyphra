'use client';

import { useMemo, useState } from 'react';
import { encodeQuizCode, randomQuizSeed } from '@/lib/quiz-code';
import type { Difficulty } from '@/lib/ciphers/types';
import { useT } from '@/lib/i18n/client';

/**
 * Builds a share code for a quiz.
 *
 * Everything is computed in the browser, because the code *is* the quiz — there
 * is no row to create, so there is nothing to ask a server for. Changing a
 * setting simply produces a different code.
 */
export function QuizShare() {
  const d = useT().share;
  const [questions, setQuestions] = useState(6);
  const [low, setLow] = useState<Difficulty>(1);
  const [high, setHigh] = useState<Difficulty>(3);
  const [minutes, setMinutes] = useState(15);
  const [seed, setSeed] = useState(() => randomQuizSeed());
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const code = useMemo(
    () =>
      encodeQuizCode({
        seed,
        questions,
        difficultyLow: low,
        difficultyHigh: Math.max(low, high) as Difficulty,
        minutes,
      }),
    [seed, questions, low, high, minutes],
  );

  const link = typeof window !== 'undefined' ? `${window.location.origin}/q/${code}` : `/q/${code}`;

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard refused; the values are on screen */ }
  };

  return (
    <section className="no-print rounded-2xl border border-border-subtle bg-bg-raised p-6">
      <h2 className="font-medium tracking-[-0.01em]">{d.title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
        {d.lead}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="qq" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.questions}
          </label>
          <input
            id="qq"
            type="number"
            min={1}
            max={16}
            value={questions}
            onChange={(e) => setQuestions(Math.max(1, Math.min(16, Number(e.target.value) || 1)))}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="ql" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.easiest}
          </label>
          <select
            id="ql"
            value={low}
            onChange={(e) => setLow(Number(e.target.value) as Difficulty)}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="qh" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.hardest}
          </label>
          <select
            id="qh"
            value={high}
            onChange={(e) => setHigh(Number(e.target.value) as Difficulty)}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d} disabled={d < low}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="qm" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {d.minutesLabel}
          </label>
          <input
            id="qm"
            type="number"
            min={0}
            max={63}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(63, Number(e.target.value) || 0)))}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border-subtle bg-bg-sunken p-5 text-center">
        <div className="text-[0.6875rem] uppercase tracking-[0.16em] text-text-faint">
          {d.joinCode}
        </div>
        <div className="mt-2 font-mono text-4xl font-semibold tracking-[0.12em] text-accent">
          {code}
        </div>
        <div className="mt-3 break-all font-mono text-xs text-text-muted">{link}</div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => copy('code')}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm transition-colors hover:border-accent"
          >
            {copied === 'code' ? d.codeCopied : d.copyCode}
          </button>
          <button
            type="button"
            onClick={() => copy('link')}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {copied === 'link' ? d.linkCopied : d.copyLink}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm transition-colors hover:border-accent"
          >
            {d.preview}
          </a>
          <button
            type="button"
            onClick={() => setSeed(randomQuizSeed())}
            className="rounded-lg px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            {d.reroll}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs leading-relaxed text-text-faint">
        <p>
          {d.note1}
        </p>
        <p>
          {d.note2}
        </p>
      </div>
    </section>
  );
}
