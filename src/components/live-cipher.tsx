'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Technique, Key } from '@/lib/ciphers/types';

const SHOWCASE = [
  { id: 'caesar', key: { shift: 3 } as Key, note: 'Roman, first century BC' },
  { id: 'vigenere', key: { keyword: 'LANTERN' } as Key, note: 'Unbroken for three centuries' },
  { id: 'playfair', key: { keyword: 'HARBOUR' } as Key, note: 'British field cipher, two wars' },
  { id: 'rail-fence', key: { rails: 4 } as Key, note: 'Order changes, letters do not' },
  { id: 'bifid', key: { keyword: 'ORCHARD', period: 5 } as Key, note: 'Diffusion, decades early' },
  { id: 'enigma', key: { r1: 'I', r2: 'II', r3: 'III', p1: 0, p2: 0, p3: 0 } as Key, note: 'A new alphabet per keystroke' },
  { id: 'morse', key: {} as Key, note: 'Built to survive noise, not eavesdroppers' },
  { id: 'base64', key: {} as Key, note: 'Not a cipher, and never was' },
];

const DEFAULT_TEXT = 'Meet me at the bridge at midnight';

/**
 * The engine is loaded after mount rather than bundled into the first paint.
 * The catalogue is a few hundred kilobytes of arithmetic that nobody needs
 * before the page is on screen.
 */
export function LiveCipher() {
  const [engine, setEngine] = useState<{ get: (id: string) => Technique | undefined } | null>(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    let alive = true;
    import('@/lib/ciphers').then((m) => {
      if (alive) setEngine({ get: m.getTechnique });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SHOWCASE.length), 3400);
    return () => clearInterval(t);
  }, [paused]);

  const current = SHOWCASE[index];
  const technique = engine?.get(current.id);

  const output = useMemo(() => {
    if (!technique) return '';
    try {
      return technique.encode(text || DEFAULT_TEXT, current.key).output;
    } catch {
      return '';
    }
  }, [technique, text, current]);

  return (
    <div
      className="rounded-2xl border border-border-subtle bg-bg-raised shadow-[var(--shadow-lg)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { if (!touched.current) setPaused(false); }}
    >
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        </div>
        <span className="ml-2 text-xs text-text-faint">
          {technique ? technique.name : 'loading the engine'}
        </span>
        <span className="ml-auto text-xs text-text-faint">{current.note}</span>
      </div>

      <div className="p-4 sm:p-5">
        <label htmlFor="live-plain" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
          Plaintext — edit it
        </label>
        <textarea
          id="live-plain"
          value={text}
          rows={2}
          spellCheck={false}
          onChange={(e) => { touched.current = true; setPaused(true); setText(e.target.value); }}
          className="plain-text mt-2 w-full resize-none rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm text-plain outline-none transition-colors focus:border-accent"
        />

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            Ciphertext
          </span>
          <span className="h-px flex-1 bg-border-subtle" />
        </div>

        <div className="relative mt-2 overflow-hidden rounded-lg border border-border-subtle bg-bg-sunken">
          <div className="sheen pointer-events-none absolute inset-0" aria-hidden />
          <output
            className="cipher-text relative block min-h-[4.5rem] px-3 py-2.5 text-sm text-cipher"
            aria-live="polite"
          >
            {output || ' '}
          </output>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {SHOWCASE.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { touched.current = true; setPaused(true); setIndex(i); }}
              aria-pressed={i === index}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                i === index
                  ? 'bg-accent text-accent-text'
                  : 'bg-bg-sunken text-text-muted hover:text-text'
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
