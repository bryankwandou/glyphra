'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { eraText } from '@/lib/i18n/eras';
import type { BuiltProblem } from '@/lib/problem';

/**
 * One problem, one answer, one winner.
 *
 * No timer and no question navigation, because there is one question. What it
 * does carry that a quiz question does not is the technique, stated plainly at
 * the top and provable from the code itself — that is the whole reason this
 * surface exists separately.
 */
export function ProblemRunner({
  problem,
  tracked,
  label,
}: {
  problem: BuiltProblem;
  tracked: boolean;
  label: string | null;
}) {
  const id = useLocale() === 'id';
  const locale = useLocale();

  const [name, setName] = useState('');
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'wrong' | 'won' | 'taken'>('idle');
  const [proximity, setProximity] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setMessage(null);
    try {
      const res = await fetch('/api/problem/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: problem.code, answer, name }),
      });
      const data = await res.json();

      if (res.status === 423) {
        setState('taken');
        setMessage(data.solvedBy ? `${data.solvedBy}` : null);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');

      setProximity(data.proximity ?? 0);
      setState(data.correct ? 'won' : 'wrong');
    } catch (err) {
      setState('idle');
      setMessage((err as Error).message);
    }
  };

  if (state === 'won') {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ok">
          {id ? 'Benar' : 'Correct'}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
          {id ? 'Anda memecahkannya' : 'You solved it'}
        </h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          {tracked
            ? id
              ? 'Soal ini sekarang tertutup. Kodenya tidak lagi berfungsi untuk orang lain, dan pembuatnya melihat nama Anda di daftar soalnya.'
              : 'This problem is now closed. The code no longer works for anyone else, and whoever set it sees your name against it.'
            : id
              ? 'Soal ini tidak tercatat, jadi tetap terbuka untuk orang lain.'
              : 'This problem is not tracked, so it stays open for others.'}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/practice"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {id ? 'Coba soal lain' : 'Try another'}
          </Link>
          <Link
            href="/tutorial"
            className="rounded-xl border border-border-strong px-5 py-2.5 text-sm transition-colors hover:border-accent"
          >
            {id ? 'Pelajari metodenya' : 'Read about the method'}
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'taken') {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {id ? 'Sudah dipecahkan' : 'Already solved'}
        </h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          {message
            ? id
              ? `${message} menjawabnya lebih dulu, dan kode ini hanya berlaku sampai jawaban benar pertama.`
              : `${message} got there first, and this code only lasted until the first correct answer.`
            : id
              ? 'Kode ini hanya berlaku sampai jawaban benar pertama.'
              : 'This code only lasted until the first correct answer.'}
        </p>
        <Link
          href="/practice"
          className="mt-7 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          {id ? 'Berlatih sendiri' : 'Practise on your own'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm tracking-[0.08em] text-text-faint">{problem.code}</span>
          {tracked && (
            <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs text-warn">
              {id ? 'berlaku sampai jawaban benar pertama' : 'lasts until the first correct answer'}
            </span>
          )}
        </div>

        {label && <p className="mt-2 text-sm text-text-muted">{label}</p>}

        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
          {problem.techniqueName}
        </h1>

        {/* The technique is not a label added afterwards — it is inside the code,
            and stating that here is the point of the whole surface. */}
        <p className="mt-2 text-sm leading-relaxed text-text-faint">
          {id
            ? 'Metodenya tertulis di dalam kode ini, bukan ditempel setelah soal dibuat. Siapa pun yang memegang kodenya bisa membacanya kembali.'
            : 'The method is written inside this code, not attached after the problem was made. Anybody holding the code can read it back.'}
        </p>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-text-faint">{id ? 'Keluarga' : 'Family'}</dt>
            <dd>{problem.family}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">{id ? 'Kesulitan' : 'Difficulty'}</dt>
            <dd className="tabular-nums">{problem.difficulty}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">{id ? 'Masa' : 'Era'}</dt>
            <dd>{eraText(problem.era, locale)}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-raised p-6">
        <p className="text-[0.9375rem] leading-relaxed">{problem.prompt}</p>

        <div className="mt-5">
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Cipherteks' : 'Ciphertext'}
          </div>
          <p className="cipher-text mt-1.5 break-words text-lg leading-relaxed text-cipher">
            {problem.ciphertext}
          </p>
        </div>

        {problem.keyFields.length > 0 && (
          <dl className="mt-5 space-y-1.5 border-t border-border-subtle pt-4 text-sm">
            {problem.keyFields.map((f) => (
              <div key={f.label} className="flex flex-wrap justify-between gap-2">
                <dt className="text-text-faint">{f.label}</dt>
                <dd className={f.disclosed ? 'font-mono' : 'text-text-faint'}>
                  {f.disclosed ? f.value : id ? 'harus dicari sendiri' : 'you have to recover it'}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-4 text-xs text-text-faint">
          {id
            ? `Jawabannya sepanjang ${problem.plaintextLength} huruf.`
            : `The answer is ${problem.plaintextLength} letters long.`}
        </p>
      </section>

      <form onSubmit={submit} className="mt-6">
        {tracked && (
          <div className="mb-4">
            <label htmlFor="who" className="text-xs text-text-muted">
              {id ? 'Nama Anda' : 'Your name'}
            </label>
            <input
              id="who"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={id ? 'Muncul di daftar pembuat soal' : 'Shown to whoever set the problem'}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
        )}

        <label htmlFor="ans" className="text-xs text-text-muted">
          {id ? 'Pesan aslinya' : 'The original message'}
        </label>
        <textarea
          id="ans"
          rows={3}
          spellCheck={false}
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); if (state === 'wrong') setState('idle'); }}
          className="mt-1 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-accent"
        />

        {state === 'wrong' && (
          <p className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn">
            {id ? 'Belum benar. ' : 'Not right yet. '}
            {proximity > 0.6
              ? id ? 'Tapi sudah dekat — periksa lagi beberapa huruf.' : 'Close, though — check a few letters.'
              : id ? 'Coba periksa kembali kuncinya.' : 'Try checking the key again.'}
            {tracked && (id ? ' Soal ini masih terbuka.' : ' The problem is still open.')}
          </p>
        )}

        {message && state === 'idle' && (
          <p className="mt-3 text-sm text-bad">{message}</p>
        )}

        <button
          type="submit"
          disabled={state === 'busy' || !answer.trim()}
          className="mt-4 w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {state === 'busy'
            ? id ? 'Memeriksa…' : 'Checking…'
            : id ? 'Kirim jawaban' : 'Submit the answer'}
        </button>
      </form>

      <details className="mt-6 rounded-xl border border-border-subtle bg-bg-sunken p-4">
        <summary className="cursor-pointer text-sm text-text-muted">
          {id ? 'Bagaimana metode ini bekerja' : 'How this method works'}
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{problem.summary}</p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{problem.theory}</p>
        <Link href="/tutorial" className="mt-3 inline-block text-sm text-accent hover:underline">
          {id ? 'Panduan lengkapnya' : 'The full guide'}
        </Link>
      </details>
    </div>
  );
}
