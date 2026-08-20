'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/client';

interface Row {
  rank: number;
  participant: string;
  score: number;
  correct: number;
  total: number;
}

/**
 * Where you placed, shown once the attempt is over.
 *
 * Only for a claimed quiz — an unclaimed code records nothing, so there is
 * nothing to rank and the component renders nothing rather than an empty table
 * with an explanation nobody asked for.
 *
 * The participant's own row is marked. Every quiz platform does this and the
 * reason is sound: a list of forty names is data, and a list of forty names
 * with yours highlighted is feedback.
 */
export function Leaderboard({ code, you }: { code: string; you: string }) {
  const id = useLocale() === 'id';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/leaderboard?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!alive) return;
        if (!data.available) { setAvailable(false); return; }
        setRows(data.rows ?? []);
      } catch {
        if (alive) setAvailable(false);
      }
    })();
    return () => { alive = false; };
  }, [code]);

  if (!available || !rows || rows.length === 0) return null;

  const mine = you.trim().toLowerCase();

  return (
    <section className="mt-10 rounded-2xl border border-border-subtle bg-bg-raised p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-medium tracking-[-0.01em]">
          {id ? 'Papan peringkat' : 'Standings'}
        </h2>
        <span className="text-xs text-text-faint">
          {id ? `${rows.length} peserta` : `${rows.length} taking part`}
        </span>
      </div>

      <p className="mt-1 text-xs leading-relaxed text-text-faint">
        {id
          ? 'Nilai terbaik tiap orang. Mengulang tidak menambah baris, jadi papan ini bukan lomba kesabaran.'
          : 'Each person’s best score. Retrying does not add a row, so this is not a patience contest.'}
      </p>

      <ol className="mt-4 space-y-1">
        {rows.map((r) => {
          const isMe = r.participant.trim().toLowerCase() === mine && mine.length > 0;
          return (
            <li
              key={`${r.rank}-${r.participant}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isMe ? 'bg-accent-soft ring-1 ring-accent' : r.rank <= 3 ? 'bg-bg-sunken' : ''
              }`}
            >
              <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-text-faint">
                {r.rank}
              </span>
              <span className={`min-w-0 flex-1 truncate ${isMe ? 'font-medium' : ''}`}>
                {r.participant}
                {isMe && (
                  <span className="ml-2 text-xs text-accent">{id ? 'Anda' : 'you'}</span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-text-muted">
                {r.correct}/{r.total}
              </span>
              <span className="w-12 shrink-0 text-right font-medium tabular-nums">
                {r.score}%
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
