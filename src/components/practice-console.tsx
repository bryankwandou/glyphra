'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Family, Difficulty } from '@/lib/ciphers/types';
import { BEGINNER_POOL } from '@/lib/generator';

interface CatalogueEntry {
  id: string;
  name: string;
  family: Family;
  difficulty: Difficulty;
  era: string;
  summary: string;
  oneWay: boolean;
}

interface Challenge {
  id: string;
  seed: string;
  techniqueId: string;
  techniqueName: string;
  family: Family;
  difficulty: Difficulty;
  era: string;
  summary: string;
  theory: string;
  prompt: string;
  ciphertext: string;
  keyFields: { label: string; disclosed: boolean; value?: string }[];
  relaxed?: string[];
  plaintextLength: number;
  messageSource: 'own' | 'ai' | 'machine';
  sealed: string;
}

interface Verdict {
  correct: boolean;
  proximity: number;
  submittedLength: number;
  expectedLength: number;
}

interface Credential {
  ok: boolean;
  signature?: string;
  explorer?: string;
  issuer?: string;
  cluster: string;
  memo?: string;
  digest?: string;
  technique?: string;
  error?: string;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Introductory',
  2: 'Straightforward',
  3: 'Involved',
  4: 'Demanding',
  5: 'Research-grade',
};

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

export function PracticeConsole({
  catalogue,
  instructorSignedIn,
}: {
  catalogue: CatalogueEntry[];
  instructorSignedIn: boolean;
}) {
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [techniqueId, setTechniqueId] = useState<string>('');
  const [source, setSource] = useState<'machine' | 'ai'>('machine');
  const [beginner, setBeginner] = useState(false);
  const [ownText, setOwnText] = useState('');
  const [theme, setTheme] = useState('');
  const [seed, setSeed] = useState('');

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [anchoring, setAnchoring] = useState(false);

  const answerRef = useRef<HTMLTextAreaElement>(null);

  const reversible = catalogue.filter((c) => !c.oneWay);
  const availableFamilies = [...new Set(reversible.map((c) => c.family))];

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setVerdict(null);
    setAnswer('');
    setShowTheory(false);
    setCredential(null);
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Beginner mode draws from what an introductory syllabus actually
          // opens with, checked against a real course: Caesar dominates, then
          // simple substitution, Atbash, affine and the rail fence. Without
          // this the mode was still free to serve a Quagmire. Simple
          // substitution is left out despite being mechanical with the key in
          // hand: copying a 26-letter table across forty characters is tedium
          // rather than difficulty, and tedium on a first attempt is what makes
          // people stop.
          techniqueIds: techniqueId
            ? [techniqueId]
            : beginner
              ? [...BEGINNER_POOL]
              : undefined,
          families: families.length ? families : undefined,
          difficulties: difficulties.length ? difficulties : undefined,
          seed: seed.trim() || undefined,
          source,
          theme: theme.trim() || undefined,
          discloseKey: beginner || undefined,
          beginner: beginner || undefined,
          plaintext: ownText.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('The generator did not respond.');
      const data: Challenge = await res.json();
      setChallenge(data);
      requestAnimationFrame(() => answerRef.current?.focus());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [techniqueId, families, difficulties, seed, source, theme, beginner, ownText]);

  const submit = useCallback(async () => {
    if (!challenge || !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealed: challenge.sealed, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Marking failed.');
      setVerdict(data);
      setAttempts((a) => a + 1);
      if (data.correct) setSolved((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [challenge, answer]);

  /**
   * Anchoring re-sends the answer, because the server re-marks it before
   * signing. A client claiming success is not evidence of anything.
   */
  const anchor = useCallback(async () => {
    if (!challenge) return;
    setAnchoring(true);
    try {
      const res = await fetch('/api/credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealed: challenge.sealed, answer }),
      });
      setCredential(await res.json());
    } catch (e) {
      setCredential({ ok: false, cluster: 'devnet', error: (e as Error).message });
    } finally {
      setAnchoring(false);
    }
  }, [challenge, answer]);

  // Enter submits, Shift+Enter breaks the line — the expected behaviour in a
  // single-answer field that still needs to accept multi-line paste.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void submit();
      }
      if (e.key === 'g' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void generate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, generate]);

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  /**
   * Beginner mode.
   *
   * Difficulty 1 was not a beginner setting. It still withheld the key, so a
   * first problem could be "here is some ciphertext, work out the keyword and
   * then decode it" — two unknowns at once, and cryptanalysis rather than
   * mechanism. Somebody meeting a cipher for the first time should be doing the
   * method with the key in front of them.
   */
  const startBeginner = () => {
    setBeginner(true);
    setDifficulties([1, 2]);
    setFamilies([]);
    setTechniqueId('');
    setSource('machine');
    setOwnText('');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[300px_1fr] lg:items-start">
      {/* ------------------------------------------------------------ controls */}
      <aside className="rounded-2xl border border-border-subtle bg-bg-raised p-5 lg:sticky lg:top-20">
        <h2 className="text-sm font-medium tracking-[-0.01em]">Set the problem</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Leave everything untouched to draw from the whole catalogue.
        </p>

        <div className={`mt-4 rounded-xl border p-3 ${beginner ? 'border-ok bg-ok-soft' : 'border-border-subtle bg-bg-sunken'}`}>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={beginner}
              onChange={(e) => (e.target.checked ? startBeginner() : setBeginner(false))}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span className="text-xs leading-relaxed">
              <span className={`font-medium ${beginner ? 'text-ok' : 'text-text'}`}>
                Beginner mode
              </span>
              <span className="block text-text-muted">
                The key is shown, so you decode with it rather than having to work it out first.
                Start here if a cipher is new to you.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4">
          <label htmlFor="owntext" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Your own message
          </label>
          <textarea
            id="owntext"
            rows={2}
            spellCheck={false}
            value={ownText}
            onChange={(e) => setOwnText(e.target.value)}
            placeholder="Leave blank to use a drawn message"
            className="mt-1.5 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-2.5 py-2 text-xs outline-none transition-colors focus:border-accent"
          />
          <p className="mt-1 text-xs leading-relaxed text-text-faint">
            Type a sentence and the problem is built from it. To simply encipher text and see every
            step, the workbench is the better tool.
          </p>
        </div>

        <fieldset className="mt-5">
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
                title={DIFFICULTY_LABEL[d]}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Family
          </legend>
          <div className="mt-2 space-y-1">
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

        <div className="mt-5">
          <label htmlFor="technique" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Or one specific technique
          </label>
          <select
            id="technique"
            value={techniqueId}
            onChange={(e) => setTechniqueId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-subtle bg-bg-sunken px-2.5 py-2 text-xs outline-none transition-colors focus:border-accent"
          >
            <option value="">Any</option>
            {/* Easiest first. Alphabetical order put Chaocipher two lines
                from Caesar, which is no help to somebody choosing where to
                begin. */}
            {reversible
              .slice()
              .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {'\u2605'.repeat(c.difficulty)} {c.name}
                </option>
              ))}
          </select>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Message source
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(['machine', 'ai'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => setSource(s)}
                className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                  source === s ? 'bg-accent text-accent-text' : 'bg-bg-sunken text-text-muted hover:text-text'
                }`}
              >
                {s === 'machine' ? 'Randomiser' : 'Language model'}
              </button>
            ))}
          </div>
          {source === 'ai' && (
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Subject, if you want one"
              className="mt-2 w-full rounded-lg border border-border-subtle bg-bg-sunken px-2.5 py-2 text-xs outline-none transition-colors focus:border-accent"
            />
          )}
        </fieldset>

        <div className="mt-5">
          <label htmlFor="seed" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Seed
          </label>
          <input
            id="seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Blank for random"
            className="mt-2 w-full rounded-lg border border-border-subtle bg-bg-sunken px-2.5 py-2 font-mono text-xs outline-none transition-colors focus:border-accent"
          />
          <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-text-faint">
            The same seed and settings reproduce the same problem, so a whole class can sit the
            identical paper.
          </p>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Working…' : challenge ? 'New problem' : 'Generate'}
        </button>

        {attempts > 0 && (
          <p className="mt-4 text-center text-xs tabular-nums text-text-muted">
            {solved} solved of {attempts} attempted
          </p>
        )}
      </aside>

      {/* ----------------------------------------------------------- challenge */}
      <section className="min-w-0">
        {error && (
          <div className="mb-5 rounded-xl border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
            {error}
          </div>
        )}

        {!challenge ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-raised px-6 py-20 text-center">
            <h2 className="text-lg font-medium tracking-[-0.01em]">Nothing generated yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
              Choose your constraints on the left, or press Generate and take whatever the catalogue
              hands you.
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Generate a problem
            </button>
          </div>
        ) : (
          <article className="rise space-y-5">
            <header className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent">
                  {challenge.techniqueName}
                </span>
                <span className="text-text-faint">{FAMILY_LABEL[challenge.family]}</span>
                <span className="text-text-faint" aria-hidden>·</span>
                <span className="text-text-faint">{challenge.era}</span>
                <span className="ml-auto tabular-nums text-text-faint">
                  Difficulty {challenge.difficulty} — {DIFFICULTY_LABEL[challenge.difficulty]}
                </span>
              </div>

              {challenge.relaxed && challenge.relaxed.length > 0 && (
                <p className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                  Those filters could not all hold at once, so the{' '}
                  {challenge.relaxed.join(' and ')} setting
                  {challenge.relaxed.length > 1 ? 's were' : ' was'} set aside for this problem.
                  A named technique always wins over the broader filters.
                </p>
              )}

              <p className="mt-3 text-[0.9375rem] leading-relaxed">{challenge.prompt}</p>

              {challenge.keyFields.length > 0 && (
                <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                  {challenge.keyFields.map((f) => (
                    <div
                      key={f.label}
                      className="rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2"
                    >
                      <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
                        {f.label}
                      </dt>
                      <dd className={`mt-0.5 text-sm ${f.disclosed ? 'font-mono text-text' : 'text-text-faint'}`}>
                        {f.disclosed ? f.value : 'withheld — recover it'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-faint">
                <span className="font-mono">seed {challenge.seed}</span>
                <span aria-hidden>·</span>
                {/* Named for each case rather than "ai, else bank".
                    The API has always returned 'own' when the visitor supplies
                    their own sentence, but this type did not list it and the
                    else-branch swallowed it, so a page built from your own words
                    said the message came from the built-in bank. The sentence was
                    right and the caption describing it was wrong, which is the
                    worse of the two failures: nothing looks broken, so the
                    natural conclusion is that the box does nothing. */}
                <span>
                  {challenge.messageSource === 'own'
                    ? 'your own message'
                    : challenge.messageSource === 'ai'
                      ? 'message from a language model'
                      : 'message from the built-in bank'}
                </span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{challenge.plaintextLength} characters to recover</span>
              </div>
            </header>

            <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <div className="flex items-center gap-2">
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                  Ciphertext
                </h3>
                <span className="h-px flex-1 bg-border-subtle" />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(challenge.ciphertext)}
                  className="rounded-md px-2 py-0.5 text-xs text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
                >
                  Copy
                </button>
              </div>
              <p className="cipher-text slim-scroll mt-3 max-h-72 overflow-y-auto rounded-lg bg-bg-sunken p-4 text-[0.9375rem] leading-loose text-cipher">
                {challenge.ciphertext}
              </p>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <label htmlFor="answer" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                Your plaintext
              </label>
              <textarea
                id="answer"
                ref={answerRef}
                value={answer}
                rows={3}
                spellCheck={false}
                onChange={(e) => { setAnswer(e.target.value); setVerdict(null); }}
                placeholder="Spacing, punctuation and case are ignored when marking."
                className="plain-text mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || !answer.trim()}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-40"
                >
                  Check my answer
                </button>
                <button
                  type="button"
                  onClick={() => setShowTheory((s) => !s)}
                  className="rounded-xl border border-border-strong px-4 py-2.5 text-sm transition-colors hover:border-accent"
                >
                  {showTheory ? 'Hide the mechanism' : 'How this cipher works'}
                </button>
                <span className="text-xs text-text-faint">Ctrl+Enter to submit, Ctrl+G for a new problem</span>
              </div>

              {verdict && (
                <div
                  role="status"
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    verdict.correct
                      ? 'border-ok bg-ok-soft text-ok'
                      : 'border-warn bg-warn-soft text-warn'
                  }`}
                >
                  {verdict.correct ? (
                    <div className="space-y-3">
                      <p>Correct. That is the message.</p>
                      {!credential && (
                        <button
                          type="button"
                          onClick={anchor}
                          disabled={anchoring}
                          className="rounded-lg border border-ok px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                          {anchoring ? 'Writing to devnet…' : 'Anchor this on Solana devnet'}
                        </button>
                      )}
                      {credential && (
                        <div className="rounded-lg border border-border-subtle bg-bg-raised p-3 text-text">
                          {credential.ok ? (
                            <>
                              <p className="text-xs font-medium text-ok">
                                Recorded on {credential.cluster}
                              </p>
                              <a
                                href={credential.explorer}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="mt-1 block break-all font-mono text-[0.6875rem] text-accent hover:underline"
                              >
                                {credential.signature}
                              </a>
                              <p className="mt-2 text-[0.6875rem] leading-relaxed text-text-faint">
                                Open it on Solana Explorer and read the memo instruction. The
                                attestation is in plain sight; the hash binds it to this problem
                                without revealing the answer.
                              </p>
                            </>
                          ) : (
                            <p className="text-xs leading-relaxed text-warn">{credential.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p>Not yet.</p>
                      <p className="text-xs opacity-90">
                        You submitted {verdict.submittedLength} characters against an expected{' '}
                        {verdict.expectedLength}.{' '}
                        {verdict.proximity >= 0.75
                          ? 'Most positions line up — check the start, and check for an off-by-one in the key.'
                          : verdict.proximity >= 0.5
                            ? 'Roughly half the positions line up. The method looks right and the key looks wrong.'
                            : verdict.proximity >= 0.25
                              ? 'Some positions line up. Worth re-reading which technique this is.'
                              : 'Very little lines up. Try the mechanism explanation below.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showTheory && (
                <div className="mt-4 rounded-xl border border-border-subtle bg-bg-sunken p-4">
                  <h4 className="text-sm font-medium">{challenge.techniqueName}</h4>
                  <p className="mt-1 text-sm italic text-text-muted">{challenge.summary}</p>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">{challenge.theory}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <h3 className="text-sm font-medium">Answer key and worked solution</h3>
              {instructorSignedIn ? (
                <>
                  <p className="mt-1.5 text-sm text-text-muted">
                    You are signed in as an instructor. Open this problem in the instructor view to
                    see the key and every step in both directions.
                  </p>
                  <Link
                    href={`/instructor?sealed=${encodeURIComponent(challenge.sealed)}`}
                    className="mt-3 inline-block rounded-lg border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:border-accent"
                  >
                    Open the solution
                  </Link>
                </>
              ) : (
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Held back. The solution is encrypted and only the server can open it, so it is not
                  in this page, not in the network response you can read, and not in storage.
                  Instructors sign in to see it.
                </p>
              )}
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
