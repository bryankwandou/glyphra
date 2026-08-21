'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';

export interface ProblemEntry {
  code: string;
  techniqueId: string;
  techniqueName: string;
  label: string | null;
  disclose: boolean;
  solvedAt: string | null;
  solvedBy: string | null;
  attempts: number;
  createdAt: string;
}

/**
 * The running list, and what it turned into.
 *
 * Two states only: running, or solved by a named person. That is the whole
 * lifecycle a single-problem code has, and showing anything more elaborate
 * would suggest states that do not exist.
 */
export function ProblemHistory({ problems }: { problems: ProblemEntry[] }) {
  const router = useRouter();
  const id = useLocale() === 'id';
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'solved'>('all');

  const reopen = async (code: string) => {
    setBusy(code);
    await fetch('/api/problem/reopen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(null);
    router.refresh();
  };

  if (!problems.length) {
    return (
      <p className="rounded-2xl border border-border-subtle bg-bg-sunken p-6 text-center text-sm leading-relaxed text-text-muted">
        {id
          ? 'Belum ada soal tunggal. Buat satu di halaman lembar soal — pilih metodenya, dapat QR-nya, dan soal itu akan muncul di sini sampai ada yang memecahkannya.'
          : 'No single problems yet. Make one on the papers page — pick the method, take the QR, and it appears here until somebody solves it.'}
      </p>
    );
  }

  const running = problems.filter((p) => !p.solvedAt).length;
  const shown = problems.filter((p) =>
    filter === 'all' ? true : filter === 'running' ? !p.solvedAt : !!p.solvedAt,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'running', 'solved'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filter === f
                ? 'bg-accent text-accent-text'
                : 'border border-border-subtle text-text-muted hover:border-accent'
            }`}
          >
            {f === 'all'
              ? id ? `Semua (${problems.length})` : `All (${problems.length})`
              : f === 'running'
                ? id ? `Berjalan (${running})` : `Running (${running})`
                : id ? `Terpecahkan (${problems.length - running})` : `Solved (${problems.length - running})`}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map((p) => {
          const solved = !!p.solvedAt;
          return (
            <li
              key={p.code}
              className={`rounded-xl border p-4 ${
                solved ? 'border-border-subtle bg-bg-sunken' : 'border-accent-soft bg-bg-raised'
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-medium tracking-[0.08em] text-accent">
                  {p.code}
                </span>
                <span className="text-sm">{p.techniqueName}</span>
                {p.label && <span className="text-xs text-text-faint">{p.label}</span>}
                <span
                  className={`ml-auto rounded-md px-2 py-0.5 text-xs ${
                    solved ? 'bg-ok-soft text-ok' : 'bg-bg-sunken text-text-muted'
                  }`}
                >
                  {solved
                    ? id ? `dipecahkan · ${p.solvedBy ?? '—'}` : `solved · ${p.solvedBy ?? '—'}`
                    : id ? 'berjalan' : 'running'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
                <span className="tabular-nums">
                  {p.attempts} {id ? 'percobaan' : p.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
                <span>{p.disclose ? (id ? 'kunci ditampilkan' : 'key shown') : (id ? 'kunci disembunyikan' : 'key withheld')}</span>
                <span className="tabular-nums">
                  {new Date(p.createdAt).toLocaleDateString(id ? 'id-ID' : 'en-GB', {
                    day: '2-digit', month: 'short',
                  })}
                </span>

                <span className="ml-auto flex gap-3">
                  {!solved && (
                    <Link href={`/p/${p.code}`} className="text-accent hover:underline">
                      {id ? 'buka' : 'open'}
                    </Link>
                  )}
                  {solved && (
                    <button
                      type="button"
                      disabled={busy === p.code}
                      onClick={() => reopen(p.code)}
                      className="text-accent hover:underline disabled:opacity-50"
                    >
                      {id ? 'jalankan lagi' : 'run it again'}
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
