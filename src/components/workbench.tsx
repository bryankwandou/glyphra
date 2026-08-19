'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT, useLocale } from '@/lib/i18n/client';

export interface WorkbenchTechnique {
  id: string;
  name: string;
  family: string;
  difficulty: number;
  summary: string;
  theory: string;
  era: string;
  oneWay: boolean;
  keySpec: {
    name: string;
    kind: string;
    label: string;
    min?: number;
    max?: number;
    options?: string[];
  }[];
}

interface Result {
  technique: { id: string; name: string; oneWay: boolean };
  key: Record<string, string | number>;
  input: string;
  normalised?: string;
  output: string;
  steps: { label: string; detail: string }[];
  verified?: boolean | null;
}

/**
 * Type a sentence, pick a cipher, watch it transform.
 *
 * This is the piece the application was missing. It could generate problems to
 * solve but could not encipher a sentence somebody actually wanted, which meant
 * a teacher preparing a worked example for a whiteboard had nowhere to go — and
 * "there is no box to type text into" was, fairly, the first thing people said
 * about it.
 *
 * Nothing here is withheld. The visitor supplied both the message and the key,
 * so showing the result and every intermediate step gives away nothing they did
 * not already hold.
 */
export function Workbench({ techniques }: { techniques: WorkbenchTechnique[] }) {
  const d = useT();
  const locale = useLocale();
  const id = locale === 'id';

  const [techniqueId, setTechniqueId] = useState('caesar');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [text, setText] = useState(id ? 'SERANG SAAT FAJAR' : 'MEET ME AT DAWN');
  const [key, setKey] = useState<Record<string, string>>({ shift: '3' });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [copied, setCopied] = useState(false);

  const technique = useMemo(
    () => techniques.find((t) => t.id === techniqueId) ?? techniques[0],
    [techniques, techniqueId],
  );

  const usableKeyFields = useMemo(
    () => technique.keySpec.filter((f) => f.kind !== 'none' && f.kind !== 'pad'),
    [technique],
  );

  const run = useCallback(async () => {
    if (!text.trim()) {
      setError(id ? 'Ketik sesuatu dulu.' : 'Type something first.');
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/encode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techniqueId, direction, text, key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed.');
      setResult(data);
      // Adopt whatever the server filled in, so the fields show the key that
      // was actually used rather than sitting empty.
      setKey((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.key ?? {})) next[k] = String(v);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [techniqueId, direction, text, key, id]);

  // Run as things change, with a short pause so typing is not one request per
  // keystroke.
  useEffect(() => {
    const timer = setTimeout(() => void run(), 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniqueId, direction, text, JSON.stringify(key)]);

  const swap = () => {
    if (technique.oneWay) return;
    if (result?.output) setText(result.output);
    setDirection((p) => (p === 'encode' ? 'decode' : 'encode'));
  };

  const copyOut = async () => {
    if (!result?.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard refused */ }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* ------------------------------------------------------------ controls */}
      <aside className="space-y-5 rounded-2xl border border-border-subtle bg-bg-raised p-5 lg:sticky lg:top-20 lg:self-start">
        <div>
          <h2 className="font-medium tracking-[-0.01em]">
            {id ? 'Atur' : 'Set it up'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            {id
              ? 'Ketik teks Anda sendiri, pilih metodenya, dan hasilnya muncul seketika beserta langkah kerjanya.'
              : 'Type your own text, choose a method, and the result appears immediately with the working shown.'}
          </p>
        </div>

        {/* direction */}
        <div>
          <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Arah' : 'Direction'}
          </span>
          <div className="mt-1.5 flex rounded-lg border border-border-subtle bg-bg-sunken p-0.5">
            {(['encode', 'decode'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setDirection(dir)}
                disabled={dir === 'decode' && technique.oneWay}
                aria-pressed={direction === dir}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                  direction === dir
                    ? 'bg-accent text-accent-text'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {dir === 'encode'
                  ? id ? 'Sandikan' : 'Encipher'
                  : id ? 'Pecahkan' : 'Decipher'}
              </button>
            ))}
          </div>
        </div>

        {/* technique */}
        <div>
          <label
            htmlFor="wb-tech"
            className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint"
          >
            {id ? 'Metode — termudah di atas' : 'Method — easiest first'}
          </label>
          <select
            id="wb-tech"
            value={techniqueId}
            onChange={(e) => { setTechniqueId(e.target.value); setKey({}); }}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            {techniques.map((t) => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.difficulty)} {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-text-faint">
            {technique.summary}
          </p>
        </div>

        {/* key fields */}
        {usableKeyFields.length > 0 && (
          <div className="space-y-3">
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              {id ? 'Kunci' : 'The key'}
            </span>
            {usableKeyFields.map((f) => (
              <div key={f.name}>
                <label htmlFor={`k-${f.name}`} className="text-xs text-text-muted">
                  {f.label}
                </label>
                {f.kind === 'choice' && f.options ? (
                  <select
                    id={`k-${f.name}`}
                    value={key[f.name] ?? ''}
                    onChange={(e) => setKey((p) => ({ ...p, [f.name]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent"
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    id={`k-${f.name}`}
                    type={f.kind === 'int' ? 'number' : 'text'}
                    min={f.min}
                    max={f.max}
                    spellCheck={false}
                    value={key[f.name] ?? ''}
                    onChange={(e) => setKey((p) => ({ ...p, [f.name]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {technique.oneWay && (
          <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
            {id
              ? 'Ini fungsi satu arah. Tidak ada yang bisa dibalik — itu memang sifatnya, bukan keterbatasan.'
              : 'This is one-way. Nothing can be reversed — that is the property, not a limitation.'}
          </p>
        )}
      </aside>

      {/* ------------------------------------------------------------- surface */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
          <label
            htmlFor="wb-text"
            className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint"
          >
            {direction === 'encode'
              ? id ? 'Teks Anda' : 'Your text'
              : id ? 'Cipherteks yang mau dipecahkan' : 'Ciphertext to work on'}
          </label>
          <textarea
            id="wb-text"
            rows={4}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={id ? 'Ketik apa saja di sini' : 'Type anything here'}
            className="plain-text mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-[0.9375rem] outline-none transition-colors focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-faint">
            <span className="tabular-nums">
              {text.length} {id ? 'karakter' : 'characters'}
            </span>
            {!technique.oneWay && (
              <button
                type="button"
                onClick={swap}
                className="rounded-md border border-border-strong px-2.5 py-1 text-text-muted transition-colors hover:border-accent"
              >
                {id ? 'Tukar arah dan pakai hasilnya' : 'Swap direction, feed the result back'}
              </button>
            )}
          </div>
        </section>

        {error && (
          <p className="rounded-xl border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}

        {result && !error && (
          <>
            <section className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                  {direction === 'encode'
                    ? id ? 'Hasil' : 'Result'
                    : id ? 'Pesan aslinya' : 'The message'}
                </h3>
                <span className="h-px flex-1 bg-border-subtle" />
                {result.verified === true && (
                  <span className="rounded-md bg-ok-soft px-2 py-0.5 text-xs text-ok">
                    {id ? 'terbukti bolak-balik' : 'round trip confirmed'}
                  </span>
                )}
                {result.verified === false && (
                  <span className="rounded-md bg-bad-soft px-2 py-0.5 text-xs text-bad">
                    {id ? 'gagal dibalik' : 'did not invert'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={copyOut}
                  className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-accent"
                >
                  {copied ? (id ? 'Tersalin' : 'Copied') : (id ? 'Salin' : 'Copy')}
                </button>
              </div>

              <p className="cipher-text slim-scroll mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-bg-sunken p-4 text-[0.9375rem] leading-loose text-cipher">
                {busy ? '…' : result.output}
              </p>

              {result.normalised && result.normalised !== result.input && (
                <p className="mt-3 text-xs leading-relaxed text-text-faint">
                  {id
                    ? 'Metode ini membuang spasi dan tanda baca lebih dulu, jadi yang benar-benar disandikan adalah: '
                    : 'This method strips spacing and punctuation first, so what actually got enciphered was: '}
                  <span className="font-mono text-text-muted">{result.normalised}</span>
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="flex w-full items-center gap-2 text-left"
              >
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                  {id ? 'Langkah kerjanya' : 'The working'}
                </h3>
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="text-xs text-text-muted">
                  {showSteps ? (id ? 'Sembunyikan' : 'Hide') : (id ? 'Tampilkan' : 'Show')}
                </span>
              </button>

              {showSteps && (
                <ol className="mt-4 space-y-3">
                  {result.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 font-mono text-xs tabular-nums text-text-faint">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.label}</div>
                        <pre className="artefact slim-scroll mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-text-muted">
                          {s.detail}
                        </pre>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-sunken p-5">
              <h3 className="text-sm font-medium">
                {id ? 'Cara kerja metode ini' : 'How this method works'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{technique.theory}</p>
              <p className="mt-3 text-xs text-text-faint">
                {technique.era} · {id ? 'kesulitan' : 'difficulty'} {technique.difficulty}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
