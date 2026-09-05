'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { errorText } from '@/lib/i18n/errors';
import type { QuizMode } from '@/lib/db';

const MODES: { value: QuizMode; en: string; id: string; noteEn: string; noteId: string }[] = [
  {
    value: 'open',
    en: 'Open to anyone',
    id: 'Terbuka untuk siapa saja',
    noteEn: 'Anyone holding the code, as many attempts as they like. This is how a code behaves if you never claim it.',
    noteId: 'Siapa pun yang memegang kodenya, sebanyak yang mereka mau. Beginilah perilaku kode kalau tidak Anda klaim.',
  },
  {
    value: 'first_correct',
    en: 'Close on a full score',
    id: 'Tutup saat ada yang sempurna',
    noteEn: 'The code stops working the moment somebody answers everything correctly. Useful for a race, or a single prize.',
    noteId: 'Kodenya berhenti berfungsi begitu ada yang menjawab semuanya benar. Cocok untuk lomba, atau satu hadiah.',
  },
  {
    value: 'host_only',
    en: 'Only me',
    id: 'Hanya saya',
    noteEn: 'Nobody else can open it, even holding the code. For checking a quiz before you hand it out.',
    noteId: 'Tidak ada orang lain yang bisa membukanya, walau punya kodenya. Untuk memeriksa kuis sebelum dibagikan.',
  },
];

/**
 * Attach ownership and rules to a code that already exists.
 *
 * Claiming is optional and deliberately so. The code carries its own quiz, so
 * an unclaimed one works for anybody forever — which is what every link handed
 * out before accounts existed relies on. Claiming adds control and a
 * gradebook on top of that, and takes nothing away from a code that stays
 * unclaimed.
 */
export function QuizClaim({
  code,
  signedIn,
  hasSession = false,
}: {
  code: string;
  signedIn: boolean;
  /* See quiz-composer: signed in by the shared login, short of an account. */
  hasSession?: boolean;
}) {
  const id = useLocale() === 'id';
  const locale = useLocale();
  const [mode, setMode] = useState<QuizMode>('open');
  const [title, setTitle] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <div className="mt-5 rounded-xl border border-border-subtle bg-bg-sunken p-4">
        <p className="text-sm leading-relaxed text-text-muted">
          {id
            ? 'Kode ini terbuka untuk siapa pun yang memegangnya, dan hasilnya tidak dikumpulkan. '
            : 'This code is open to anyone holding it, and results are not collected. '}
          <Link href="/account" className="text-accent hover:underline">
            {hasSession
              ? id
                ? 'Tambahkan akun'
                : 'Add an account'
              : id
                ? 'Masuk'
                : 'Sign in'}
          </Link>
          {id
            ? ' kalau Anda ingin membatasi siapa yang boleh mengerjakannya, menutupnya setelah terpecahkan, atau melihat nilainya.'
            : ' to restrict who may attempt it, close it once solved, or see the scores.'}
        </p>
      </div>
    );
  }

  const claim = async () => {
    setState('busy');
    setError(null);
    try {
      const res = await fetch('/api/quiz/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode, title: title.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');
      setState('done');
    } catch (e) {
      setError(errorText((e as Error).message, locale));
      setState('idle');
    }
  };

  const chosen = MODES.find((m) => m.value === mode)!;

  return (
    <div className="mt-5 rounded-xl border border-border-subtle bg-bg-sunken p-4">
      <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
        {id ? 'Siapa yang boleh mengerjakan' : 'Who may attempt it'}
      </h3>

      <div className="mt-3 space-y-1.5">
        {MODES.map((m) => (
          <label
            key={m.value}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-raised"
          >
            <input
              type="radio"
              name="quizmode"
              checked={mode === m.value}
              onChange={() => { setMode(m.value); setState('idle'); }}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span className="text-sm">{id ? m.id : m.en}</span>
          </label>
        ))}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-text-faint">
        {id ? chosen.noteId : chosen.noteEn}
      </p>

      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setState('idle'); }}
        placeholder={id ? 'Nama kuis, untuk Anda sendiri' : 'A name for it, for your own list'}
        className="mt-3 w-full rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />

      {error && <p className="mt-2 text-xs text-bad">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={claim}
          disabled={state === 'busy'}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {state === 'busy'
            ? id ? 'Menyimpan…' : 'Saving…'
            : state === 'done'
              ? id ? 'Tersimpan' : 'Saved'
              : id ? 'Terapkan aturan ini' : 'Apply these rules'}
        </button>
        {state === 'done' && (
          <Link href="/instructor" className="text-sm text-accent hover:underline">
            {id ? 'Lihat di dasbor' : 'See it on your dashboard'}
          </Link>
        )}
      </div>
    </div>
  );
}
