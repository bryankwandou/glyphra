'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import type { QuizMode } from '@/lib/db';

export interface OwnedQuiz {
  code: string;
  title: string | null;
  mode: QuizMode;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  attempts: number;
  best: number | null;
}

interface AttemptRow {
  id: string;
  participant: string;
  score: number;
  correct: number;
  total: number;
  perfect: boolean;
  submittedAt: string;
}

const MODE_LABEL: Record<QuizMode, { en: string; id: string; note: { en: string; id: string } }> = {
  open: {
    en: 'Open',
    id: 'Terbuka',
    note: {
      en: 'Anyone with the code, as many attempts as they like.',
      id: 'Siapa pun yang punya kodenya, sebanyak yang mereka mau.',
    },
  },
  first_correct: {
    en: 'Closes on a full score',
    id: 'Tutup saat ada yang sempurna',
    note: {
      en: 'The code stops working the moment somebody gets everything right.',
      id: 'Kodenya berhenti berfungsi begitu ada yang menjawab semuanya benar.',
    },
  },
  host_only: {
    en: 'Only you',
    id: 'Hanya Anda',
    note: {
      en: 'Nobody but this account can open it, even holding the code.',
      id: 'Tidak ada yang bisa membukanya selain akun ini, walau punya kodenya.',
    },
  },
};

export function QuizDashboard({ quizzes }: { quizzes: OwnedQuiz[] }) {
  const router = useRouter();
  const id = useLocale() === 'id';
  const L = (pair: { en: string; id: string }) => (id ? pair.id : pair.en);

  const [open, setOpen] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, AttemptRow[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadResults = async (code: string) => {
    if (open === code) { setOpen(null); return; }
    setOpen(code);
    if (rows[code]) return;
    const res = await fetch(`/api/quiz/results?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (res.ok) setRows((p) => ({ ...p, [code]: data.attempts }));
  };

  const toggleClosed = async (code: string, reopen: boolean) => {
    setBusy(code);
    await fetch('/api/quiz/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, reopen }),
    });
    setBusy(null);
    router.refresh();
  };

  if (!quizzes.length) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-bg-sunken p-6 text-center">
        <p className="text-sm leading-relaxed text-text-muted">
          {id
            ? 'Belum ada kuis yang Anda klaim. Buat satu di halaman lembar soal, lalu tekan klaim untuk mengatur siapa yang boleh mengerjakannya dan melihat hasilnya di sini.'
            : 'No quizzes claimed yet. Create one on the papers page, then claim it to control who may attempt it and to see the results here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quizzes.map((q) => {
        const closed = !!q.closedAt;
        const label = MODE_LABEL[q.mode];

        return (
          <article
            key={q.code}
            className={`rounded-2xl border bg-bg-raised p-5 ${
              closed ? 'border-border-subtle opacity-75' : 'border-border-subtle'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-lg font-semibold tracking-[0.08em] text-accent">
                {q.code}
              </span>
              {q.title && <span className="text-sm text-text-muted">{q.title}</span>}
              <span className="ml-auto rounded-md bg-bg-sunken px-2 py-0.5 text-xs text-text-muted">
                {L(label)}
              </span>
              {closed && (
                <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs text-warn">
                  {id ? 'ditutup' : 'closed'}
                  {q.closedBy ? ` · ${q.closedBy}` : ''}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-text-faint">{L(label.note)}</p>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-text-faint">{id ? 'Pengerjaan' : 'Attempts'}</dt>
                <dd className="tabular-nums">{q.attempts}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">{id ? 'Nilai tertinggi' : 'Best score'}</dt>
                <dd className="tabular-nums">{q.best === null ? '—' : `${q.best}%`}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadResults(q.code)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                {open === q.code
                  ? id ? 'Sembunyikan hasil' : 'Hide results'
                  : id ? 'Lihat hasil' : 'See results'}
              </button>
              <button
                type="button"
                disabled={busy === q.code}
                onClick={() => toggleClosed(q.code, closed)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent disabled:opacity-50"
              >
                {closed
                  ? id ? 'Buka kembali' : 'Reopen'
                  : id ? 'Tutup sekarang' : 'Close it now'}
              </button>
              <a
                href={`/q/${q.code}`}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                {id ? 'Buka kuisnya' : 'Open the quiz'}
              </a>
            </div>

            {open === q.code && (
              <div className="mt-4 border-t border-border-subtle pt-4">
                {!rows[q.code] ? (
                  <p className="text-xs text-text-faint">{id ? 'Memuat…' : 'Loading…'}</p>
                ) : rows[q.code].length === 0 ? (
                  <p className="text-xs text-text-faint">
                    {id ? 'Belum ada yang mengerjakan.' : 'Nobody has attempted it yet.'}
                  </p>
                ) : (
                  <div className="slim-scroll overflow-x-auto">
                    <table className="w-full min-w-[26rem] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-text-faint">
                          <th className="pb-2 font-medium">{id ? 'Nama' : 'Name'}</th>
                          <th className="pb-2 text-right font-medium">{id ? 'Benar' : 'Correct'}</th>
                          <th className="pb-2 text-right font-medium">{id ? 'Nilai' : 'Score'}</th>
                          <th className="pb-2 text-right font-medium">{id ? 'Waktu' : 'When'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows[q.code].map((r) => (
                          <tr key={r.id} className="border-t border-border-subtle">
                            <td className="py-2">
                              {r.participant}
                              {r.perfect && (
                                <span className="ml-2 rounded bg-ok-soft px-1.5 py-0.5 text-[0.6875rem] text-ok">
                                  {id ? 'sempurna' : 'full marks'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right tabular-nums text-text-muted">
                              {r.correct}/{r.total}
                            </td>
                            <td className="py-2 text-right tabular-nums">{r.score}%</td>
                            <td className="py-2 text-right text-xs tabular-nums text-text-faint">
                              {new Date(r.submittedAt).toLocaleString(id ? 'id-ID' : 'en-GB', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
