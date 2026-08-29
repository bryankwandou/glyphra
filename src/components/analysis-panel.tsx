'use client';

/**
 * The workbench a student uses to find a key.
 *
 * Everything else on the practice page hands over a key or withholds one. This
 * is the part where the ciphertext is interrogated: how lopsided its letters
 * are, which kind of cipher that implies, what the repeats say about a key
 * length, and — for the one case where brute force is honest — all 25 shifts
 * ranked by how much each reads like English.
 *
 * The numbers are computed in the browser from the ciphertext already on the
 * page, so this reveals nothing the student did not already have. The sealed
 * solution stays sealed.
 */

import { useMemo, useState } from 'react';
import { useT } from '@/lib/i18n/client';
import {
  frequency,
  read,
  kasiski,
  caesarFit,
  letters,
  IOC_ENGLISH,
  IOC_RANDOM,
} from '@/lib/analysis';

export function AnalysisPanel({ ciphertext }: { ciphertext: string }) {
  const d = useT();
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<'letters' | 'shifts' | 'length'>('letters');

  const only = useMemo(() => letters(ciphertext), [ciphertext]);
  const reading = useMemo(() => read(ciphertext), [ciphertext]);
  const freq = useMemo(() => frequency(ciphertext), [ciphertext]);
  const shifts = useMemo(() => caesarFit(ciphertext).slice(0, 5), [ciphertext]);
  const lengths = useMemo(() => kasiski(ciphertext).slice(0, 6), [ciphertext]);

  // Nothing here means anything on a handful of letters, and a confident-looking
  // panel over twelve characters would teach the wrong lesson.
  if (only.length < 12) return null;

  const peak = Math.max(...freq.map((f) => Math.max(f.share, f.expected)), 0.01);

  // Where this text's score falls between "random" and "ordinary English",
  // which is the whole of the first decision a cryptanalyst makes.
  const position = Math.min(
    100,
    Math.max(0, ((reading.ic - IOC_RANDOM) / (IOC_ENGLISH - IOC_RANDOM)) * 100),
  );

  const verdictText =
    reading.verdict === 'monoalphabetic'
      ? d.analysis.verdictMono
      : reading.verdict === 'polyalphabetic'
        ? d.analysis.verdictPoly
        : d.analysis.verdictShort;

  const TABS = [
    { id: 'letters' as const, label: d.analysis.tabLetters },
    { id: 'shifts' as const, label: d.analysis.tabShifts },
    { id: 'length' as const, label: d.analysis.tabLength },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium">{d.analysis.title}</h3>
        <span className="h-px flex-1 bg-border-subtle" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-md border border-border-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent"
        >
          {open ? d.analysis.hide : d.analysis.show}
        </button>
      </div>

      {!open && <p className="mt-2 text-xs leading-relaxed text-text-faint">{d.analysis.blurb}</p>}

      {open && (
        <>
          {/* The one number that decides which way to go next. */}
          <div className="mt-4 rounded-xl border border-border-subtle bg-bg-sunken p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
                {d.analysis.iocLabel}
              </span>
              <span className="font-mono text-lg tabular-nums text-accent">
                {reading.ic.toFixed(4)}
              </span>
              <span className="ml-auto text-xs tabular-nums text-text-faint">
                {d.analysis.letterCount.replace('{n}', String(only.length))}
              </span>
            </div>

            <div className="relative mt-3 h-1.5 rounded-full bg-bg-raised">
              <div
                className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-accent"
                style={{ left: `${position}%` }}
                aria-hidden
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[0.625rem] text-text-faint">
              <span>{d.analysis.scaleRandom}</span>
              <span>{d.analysis.scaleEnglish}</span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-text-muted">{verdictText}</p>
            {reading.verdict === 'polyalphabetic' && reading.alphabets > 1 && (
              <p className="mt-1.5 text-xs text-text-faint">
                {d.analysis.friedman.replace('{n}', reading.alphabets.toFixed(1))}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tool === t.id}
                onClick={() => setTool(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tool === t.id
                    ? 'bg-accent text-white'
                    : 'border border-border-subtle text-text-muted hover:border-border-strong'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ------------------------------------------------ letter counts */}
          {tool === 'letters' && (
            <div className="mt-4">
              <p className="text-xs leading-relaxed text-text-faint">{d.analysis.lettersHint}</p>
              <ul className="slim-scroll mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                {freq.map((f) => (
                  <li key={f.letter} className="flex items-center gap-2 text-xs">
                    <span className="w-4 font-mono text-text-muted">{f.letter}</span>
                    <span className="relative h-4 flex-1 rounded bg-bg-sunken">
                      {/* what English would predict, behind */}
                      <span
                        className="absolute inset-y-0 left-0 rounded border border-dashed border-border-strong"
                        style={{ width: `${(f.expected / peak) * 100}%` }}
                        aria-hidden
                      />
                      {/* what this text actually does, in front */}
                      <span
                        className="absolute inset-y-0 left-0 rounded bg-accent/70"
                        style={{ width: `${(f.share / peak) * 100}%` }}
                        aria-hidden
                      />
                    </span>
                    <span className="w-8 text-right font-mono tabular-nums text-text-faint">
                      {f.count}
                    </span>
                    <span className="w-12 text-right font-mono tabular-nums text-text-faint">
                      {(f.share * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.625rem] text-text-faint">{d.analysis.lettersLegend}</p>
            </div>
          )}

          {/* ----------------------------------------------------- 25 shifts */}
          {tool === 'shifts' && (
            <div className="mt-4">
              <p className="text-xs leading-relaxed text-text-faint">{d.analysis.shiftsHint}</p>
              <ol className="mt-3 space-y-2">
                {shifts.map((s, i) => (
                  <li
                    key={s.shift}
                    className={`rounded-lg border px-3 py-2 ${
                      i === 0 ? 'border-ok bg-ok-soft' : 'border-border-subtle bg-bg-sunken'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs tabular-nums text-text-muted">
                        {d.analysis.shiftLabel.replace('{n}', String(s.shift))}
                      </span>
                      <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-text-faint">
                        χ² {s.chiSquared.toFixed(0)}
                      </span>
                    </div>
                    <p className="cipher-text mt-1 break-all text-xs text-cipher">{s.preview}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ------------------------------------------------- key length */}
          {tool === 'length' && (
            <div className="mt-4">
              <p className="text-xs leading-relaxed text-text-faint">{d.analysis.lengthHint}</p>
              {lengths.length === 0 ? (
                <p className="mt-3 rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-xs text-text-faint">
                  {d.analysis.noRepeats}
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {lengths.map((g, i) => (
                    <li key={g.length} className="flex items-center gap-2 text-xs">
                      <span className="w-16 font-mono tabular-nums text-text-muted">
                        {d.analysis.lengthLabel.replace('{n}', String(g.length))}
                      </span>
                      <span className="relative h-4 flex-1 rounded bg-bg-sunken">
                        <span
                          className={`absolute inset-y-0 left-0 rounded ${i === 0 ? 'bg-accent/70' : 'bg-border-strong'}`}
                          style={{ width: `${(g.hits / lengths[0].hits) * 100}%` }}
                          aria-hidden
                        />
                      </span>
                      <span className="w-20 text-right font-mono tabular-nums text-text-faint">
                        {d.analysis.hits.replace('{n}', String(g.hits))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
