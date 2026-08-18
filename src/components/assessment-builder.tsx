'use client';

import { useCallback, useState } from 'react';
import type { Difficulty, Family, Step } from '@/lib/ciphers/types';

interface CatalogueEntry {
  id: string;
  name: string;
  family: Family;
  difficulty: Difficulty;
  oneWay: boolean;
}

interface Problem {
  index: number;
  challenge: {
    techniqueName: string;
    difficulty: Difficulty;
    prompt: string;
    ciphertext: string;
    keyFields: { label: string; disclosed: boolean; value?: string }[];
    plaintextLength: number;
  };
  solution: { plaintext: string; key: Record<string, string | number>; decodeSteps: Step[] };
}

interface Paper {
  number: number;
  code: string;
  problems: Problem[];
}

interface Assessment {
  title: string;
  masterSeed: string;
  generatedAt: string;
  papers: Paper[];
  techniquesUsed: string[];
}

const FAMILY_LABEL: Record<Family, string> = {
  substitution: 'Monoalphabetic substitution',
  polyalphabetic: 'Polyalphabetic substitution',
  polygraphic: 'Polygraphic substitution',
  transposition: 'Transposition',
  fractionation: 'Fractionation',
  encoding: 'Encoding and representation',
  'modern-symmetric': 'Modern symmetric',
  asymmetric: 'Asymmetric and number theory',
  hash: 'Hashing and integrity',
  steganography: 'Steganography',
};

export function AssessmentBuilder({ catalogue }: { catalogue: CatalogueEntry[] }) {
  const [title, setTitle] = useState('Cryptography — mid-semester assessment');
  const [masterSeed, setMasterSeed] = useState('');
  const [papers, setPapers] = useState(12);
  const [problemsPerPaper, setProblemsPerPaper] = useState(4);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([2, 3]);
  const [families, setFamilies] = useState<Family[]>([]);

  const [result, setResult] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const availableFamilies = [...new Set(catalogue.filter((c) => !c.oneWay).map((c) => c.family))];

  const build = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          masterSeed: masterSeed.trim() || undefined,
          papers,
          problemsPerPaper,
          difficulties: difficulties.length ? difficulties : undefined,
          families: families.length ? families : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not build the papers.');
      setResult(data);
      setMasterSeed(data.masterSeed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [title, masterSeed, papers, problemsPerPaper, difficulties, families]);

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      {/* --------------------------------------------------------- controls */}
      <section className="no-print rounded-2xl border border-border-subtle bg-bg-raised p-6">
        <h2 className="font-medium tracking-[-0.01em]">Paper setup</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
          Every student gets a different paper covering the same techniques at the same difficulty.
          Nothing is stored — the papers are a function of the seed, so the identical set can be
          rebuilt months later from the seed alone.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="t" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Title printed on each sheet
            </label>
            <input
              id="t"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="n" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Number of papers
            </label>
            <input
              id="n"
              type="number"
              min={1}
              max={120}
              value={papers}
              onChange={(e) => setPapers(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="q" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Problems per paper
            </label>
            <input
              id="q"
              type="number"
              min={1}
              max={12}
              value={problemsPerPaper}
              onChange={(e) => setProblemsPerPaper(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="s" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Master seed
            </label>
            <input
              id="s"
              value={masterSeed}
              onChange={(e) => setMasterSeed(e.target.value)}
              placeholder="Leave blank and one will be chosen"
              className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-text-faint">
              Keep this. It is the only thing needed to reproduce the papers and the marking key
              exactly, and it is printed on every sheet.
            </p>
          </div>

          <fieldset>
            <legend className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Difficulty
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={difficulties.includes(d)}
                  onClick={() => toggle(difficulties, d, setDifficulties)}
                  className={`rounded-md px-2.5 py-1 text-xs tabular-nums transition-colors ${
                    difficulties.includes(d)
                      ? 'bg-accent text-accent-text'
                      : 'bg-bg-sunken text-text-muted hover:text-text'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              Families — blank means all
            </legend>
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto slim-scroll pr-1">
              {availableFamilies.map((f) => (
                <label key={f} className="flex cursor-pointer items-start gap-2 text-xs text-text-muted hover:text-text">
                  <input
                    type="checkbox"
                    checked={families.includes(f)}
                    onChange={() => toggle(families, f, setFamilies)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="leading-snug">{FAMILY_LABEL[f]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={build}
            disabled={busy}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? 'Building…' : result ? 'Rebuild' : 'Build the papers'}
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent"
              >
                Print or save as PDF
              </button>
              <button
                type="button"
                onClick={() => setShowAnswers((s) => !s)}
                className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent"
              >
                {showAnswers ? 'Hide the marking key' : 'Show the marking key'}
              </button>
            </>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ output */}
      {result && (
        <div className="mt-10">
          <div className="no-print rounded-xl border border-border-subtle bg-bg-sunken p-4 text-sm">
            <p className="text-text">
              <span className="tabular-nums font-medium">{result.papers.length}</span> papers,{' '}
              <span className="tabular-nums font-medium">{result.papers[0]?.problems.length ?? 0}</span>{' '}
              problems each. Seed{' '}
              <code className="rounded bg-bg-raised px-1.5 py-0.5 font-mono text-xs">{result.masterSeed}</code>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              Techniques drawn: {result.techniquesUsed.join(', ')}
            </p>
            <p className="mt-2 text-xs text-warn">
              Printing includes the marking key only while it is shown above. Hide it before printing
              the student copies.
            </p>
          </div>

          <div className="print-root mt-8 space-y-10">
            {result.papers.map((paper) => (
              <article key={paper.number} className="paper-sheet rounded-2xl border border-border-subtle bg-bg-raised p-6">
                <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="font-semibold tracking-[-0.01em]">{result.title}</h3>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Paper <span className="font-mono">{paper.code}</span> · seed{' '}
                      <span className="font-mono">{result.masterSeed}</span>
                    </p>
                  </div>
                  <div className="text-xs text-text-muted">
                    Name: <span className="inline-block w-48 border-b border-border-strong" />
                  </div>
                </header>

                <ol className="mt-5 space-y-6">
                  {paper.problems.map((p) => (
                    <li key={p.index}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium tabular-nums">{p.index}.</span>
                        <span className="text-sm">{p.challenge.prompt}</span>
                        <span className="ml-auto text-xs text-text-faint">
                          {p.challenge.plaintextLength} characters
                        </span>
                      </div>

                      {p.challenge.keyFields.some((f) => f.disclosed) && (
                        <p className="mt-1.5 text-xs text-text-muted">
                          Given:{' '}
                          {p.challenge.keyFields
                            .filter((f) => f.disclosed)
                            .map((f) => `${f.label} = ${f.value}`)
                            .join('; ')}
                        </p>
                      )}

                      <p className="cipher-text mt-2 rounded-lg bg-bg-sunken p-3 text-sm leading-loose text-cipher">
                        {p.challenge.ciphertext}
                      </p>

                      <div className="mt-2 h-16 rounded-lg border border-dashed border-border-strong" aria-hidden />
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {showAnswers && (
            <div className="print-root mt-12">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-bad">
                Marking key — not for distribution
              </h2>
              <div className="mt-5 space-y-6">
                {result.papers.map((paper) => (
                  <article key={paper.number} className="answer-sheet rounded-2xl border border-bad bg-bad-soft p-5">
                    <h3 className="text-sm font-medium">
                      Paper <span className="font-mono">{paper.code}</span>
                    </h3>
                    <ol className="mt-3 space-y-3">
                      {paper.problems.map((p) => (
                        <li key={p.index} className="text-sm">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="tabular-nums font-medium">{p.index}.</span>
                            <span className="text-text-muted">{p.challenge.techniqueName}</span>
                            <span className="text-xs text-text-faint">
                              key {JSON.stringify(p.solution.key)}
                            </span>
                          </div>
                          <p className="plain-text mt-1 break-words text-text">{p.solution.plaintext}</p>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
