'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';

interface Field {
  name: string;
  kind: string;
  label: string;
  min?: number;
  max?: number;
}

/**
 * A worked example you can change.
 *
 * The tutorial listed each family's example as fixed text, which tells you what
 * a cipher produced once. Turning one dial and watching the output move is a
 * different thing entirely: it is how somebody works out that a Caesar shift of
 * 13 and a shift of 39 are the same cipher, and no paragraph explains that as
 * quickly as doing it.
 *
 * Deliberately small. Two controls at most, the message and one key field. The
 * full workbench is a link away for anyone who wants the rest, and putting the
 * whole thing inside a tutorial section would bury the reading.
 */
export function TutorialDemo({
  techniqueId,
  fields,
  initialKey,
  initialText,
}: {
  techniqueId: string;
  fields: Field[];
  initialKey: Record<string, string>;
  initialText: string;
}) {
  const id = useLocale() === 'id';

  const [text, setText] = useState(initialText);
  const [key, setKey] = useState<Record<string, string>>(initialKey);
  const [out, setOut] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!text.trim()) { setOut(''); return; }
      setBusy(true);
      try {
        const res = await fetch('/api/encode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ techniqueId, direction: 'encode', text, key }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed');
        setOut(data.output);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [techniqueId, text, JSON.stringify(key)]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = fields.filter((f) => f.kind !== 'none' && f.kind !== 'pad').slice(0, 1);

  return (
    <div className="mt-4 rounded-xl border border-border-subtle bg-bg-sunken p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-accent">
          {id ? 'Coba sendiri' : 'Try it'}
        </span>
        <span className="h-px flex-1 bg-border-subtle" />
        <Link href="/encode" className="text-xs text-accent hover:underline">
          {id ? 'Bengkel lengkap' : 'Full workbench'}
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor={`t-${techniqueId}`}
            className="text-xs text-text-muted"
          >
            {id ? 'Ganti pesannya' : 'Change the message'}
          </label>
          <input
            id={`t-${techniqueId}`}
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        {shown.map((f) => (
          <div key={f.name} className="sm:w-40">
            <label htmlFor={`k-${techniqueId}-${f.name}`} className="text-xs text-text-muted">
              {f.label}
            </label>
            <input
              id={`k-${techniqueId}-${f.name}`}
              type={f.kind === 'int' ? 'number' : 'text'}
              min={f.min}
              max={f.max}
              spellCheck={false}
              value={key[f.name] ?? ''}
              onChange={(e) => setKey((p) => ({ ...p, [f.name]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
          {id ? 'Hasilnya' : 'Comes out as'}
        </span>
        <p
          className={`cipher-text mt-1 min-h-[1.75rem] break-words text-[0.9375rem] leading-relaxed transition-opacity ${
            busy ? 'opacity-50' : ''
          } ${error ? 'text-bad' : 'text-cipher'}`}
          aria-live="polite"
        >
          {error ?? out ?? ''}
        </p>
      </div>
    </div>
  );
}
