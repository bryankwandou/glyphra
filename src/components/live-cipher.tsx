'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Technique, Key } from '@/lib/ciphers/types';
import { useLocale } from '@/lib/i18n/client';

// The note beside each technique is a claim about it, not a caption, so both
// languages say the same thing rather than one being a gloss of the other.
const SHOWCASE = [
  { id: 'caesar', key: { shift: 3 } as Key, en: 'Roman, first century BC', id_: 'Romawi, abad pertama SM' },
  { id: 'vigenere', key: { keyword: 'LANTERN' } as Key, en: 'Unbroken for three centuries', id_: 'Tak terpecahkan selama tiga abad' },
  { id: 'playfair', key: { keyword: 'HARBOUR' } as Key, en: 'British field cipher, two wars', id_: 'Sandi lapangan Inggris, dua perang' },
  { id: 'rail-fence', key: { rails: 4 } as Key, en: 'Order changes, letters do not', id_: 'Urutannya berubah, hurufnya tidak' },
  { id: 'bifid', key: { keyword: 'ORCHARD', period: 5 } as Key, en: 'Diffusion, decades early', id_: 'Difusi, berpuluh tahun lebih awal' },
  { id: 'enigma', key: { r1: 'I', r2: 'II', r3: 'III', p1: 0, p2: 0, p3: 0 } as Key, en: 'A new alphabet per keystroke', id_: 'Satu abjad baru setiap ketukan tombol' },
  { id: 'morse', key: {} as Key, en: 'Built to survive noise, not eavesdroppers', id_: 'Dibuat untuk menembus derau, bukan penyadap' },
  { id: 'base64', key: {} as Key, en: 'Not a cipher, and never was', id_: 'Bukan sandi, dan tidak pernah menjadi sandi' },
];

const DEFAULT_TEXT = { en: 'Meet me at the bridge at midnight', id: 'Temui aku di jembatan tengah malam' };

/**
 * The engine is loaded after mount rather than bundled into the first paint.
 * The catalogue is a few hundred kilobytes of arithmetic that nobody needs
 * before the page is on screen.
 */
export function LiveCipher() {
  const id = useLocale() === 'id';
  const fallback = id ? DEFAULT_TEXT.id : DEFAULT_TEXT.en;
  const [engine, setEngine] = useState<{ get: (id: string) => Technique | undefined } | null>(null);
  const [text, setText] = useState(fallback);
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
      return technique.encode(text || fallback, current.key).output;
    } catch {
      return '';
    }
  }, [technique, text, current, fallback]);

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
          {technique ? technique.name : id ? 'memuat mesinnya' : 'loading the engine'}
        </span>
        <span className="ml-auto text-xs text-text-faint">{id ? current.id_ : current.en}</span>
      </div>

      <div className="p-4 sm:p-5">
        <label htmlFor="live-plain" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
          {id ? 'Teks asli — silakan diubah' : 'Plaintext — edit it'}
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
            {id ? 'Cipherteks' : 'Ciphertext'}
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
