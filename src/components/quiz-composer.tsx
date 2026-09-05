'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { errorText } from '@/lib/i18n/errors';
import { QrCode } from './qr-code';

interface Technique {
  id: string;
  name: string;
  family: string;
  difficulty: number;
}

interface Built {
  code: string;
  questions: { number: number; techniqueName: string; difficulty: number }[];
}

/**
 * Build a paper question by question, naming the method for each.
 *
 * The band quiz asks for a difficulty range and deals whatever fits. This asks
 * what you actually want: question one Caesar, question two Playfair, and so
 * on. It is the difference between "give me four easy problems" and "give me
 * the four methods we covered this week", and only the second is a lesson plan.
 *
 * The cost is stated where the choice is made rather than buried: an
 * arrangement of named methods will not fit inside a code, so a composed quiz
 * is kept in the database and stops working if that is lost. A band quiz has no
 * such dependency. Anybody who needs a code to outlive everything should use
 * one.
 */
export function QuizComposer({
  techniques,
  signedIn,
  hasSession = false,
}: {
  techniques: Technique[];
  signedIn: boolean;
  /* A shared instructor login is already open. Storage still needs an
     account, but the invitation must not read as "you are not signed in". */
  hasSession?: boolean;
}) {
  const id = useLocale() === 'id';
  const locale = useLocale();

  const [rows, setRows] = useState<string[]>(['caesar', 'atbash', 'rail-fence']);
  const [shuffle, setShuffle] = useState(false);
  const [disclose, setDisclose] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [mode, setMode] = useState<'open' | 'first_correct' | 'host_only'>('open');
  const [title, setTitle] = useState('');
  const [built, setBuilt] = useState<Built | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...techniques].sort(
    (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
  );

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = built ? `${origin}/q/${built.code}` : '';

  const setRow = (i: number, value: string) => {
    setRows((p) => p.map((r, j) => (j === i ? value : r)));
    setBuilt(null);
  };
  const addRow = () => { setRows((p) => [...p, 'caesar']); setBuilt(null); };
  const dropRow = (i: number) => { setRows((p) => p.filter((_, j) => j !== i)); setBuilt(null); };
  const move = (i: number, by: number) => {
    setRows((p) => {
      const next = [...p];
      const j = i + by;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setBuilt(null);
  };

  const randomise = () => {
    // Fills the slots you already have rather than choosing how many. The count
    // is a decision about the lesson; which methods land in it is not.
    setRows((p) => p.map(() => sorted[Math.floor(Math.random() * sorted.length)].id));
    setBuilt(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techniques: rows, shuffle, disclose, minutes, mode,
          title: title.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');
      setBuilt(data);
    } catch (e) {
      setError(errorText((e as Error).message, locale));
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-bg-sunken p-6">
        <h2 className="text-sm font-medium">
          {id ? 'Susun soal satu per satu' : 'Compose a paper question by question'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {id
            ? 'Tentukan metode untuk tiap nomor, bukan cuma rentang kesulitan. Perlu akun karena susunannya disimpan.'
            : 'Name the method for each question rather than only a difficulty range. It needs an account because the arrangement is stored.'}
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          {hasSession
            ? id
              ? 'Tambahkan akun'
              : 'Add an account'
            : id
              ? 'Masuk atau daftar'
              : 'Sign in or sign up'}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-raised p-6">
      <h2 className="text-sm font-medium tracking-[-0.01em]">
        {id ? 'Susun soal satu per satu' : 'Compose a paper question by question'}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        {id
          ? 'Pilih metode untuk tiap nomor. Susunan ini disimpan, jadi tidak seperti kode kuis biasa — kalau database hilang, kuis susunan ikut hilang. Kuis rentang kesulitan tidak punya ketergantungan itu.'
          : 'Pick the method for each question. The arrangement is stored, so unlike an ordinary quiz code this one depends on the database. A difficulty-band quiz does not.'}
      </p>

      <ol className="mt-5 space-y-2">
        {rows.map((techniqueId, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-text-faint">
              {i + 1}
            </span>
            <select
              value={techniqueId}
              onChange={(e) => setRow(i, e.target.value)}
              aria-label={id ? `Metode nomor ${i + 1}` : `Method for question ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            >
              {sorted.map((t) => (
                <option key={t.id} value={t.id}>
                  {'★'.repeat(t.difficulty)} {t.name}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 gap-1">
              <button
                type="button" onClick={() => move(i, -1)} disabled={i === 0}
                aria-label={id ? 'Naikkan' : 'Move up'}
                className="rounded-md border border-border-subtle px-2 py-1 text-xs transition-colors hover:border-accent disabled:opacity-30"
              >↑</button>
              <button
                type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                aria-label={id ? 'Turunkan' : 'Move down'}
                className="rounded-md border border-border-subtle px-2 py-1 text-xs transition-colors hover:border-accent disabled:opacity-30"
              >↓</button>
              <button
                type="button" onClick={() => dropRow(i)} disabled={rows.length === 1}
                aria-label={id ? 'Hapus' : 'Remove'}
                className="rounded-md border border-border-subtle px-2 py-1 text-xs transition-colors hover:border-bad disabled:opacity-30"
              >×</button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button" onClick={addRow} disabled={rows.length >= 20}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent disabled:opacity-40"
        >
          {id ? 'Tambah nomor' : 'Add a question'}
        </button>
        <button
          type="button" onClick={randomise}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
        >
          {id ? 'Acak metodenya' : 'Randomise the methods'}
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cmin" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Menit — 0 berarti tanpa batas' : 'Minutes — 0 means untimed'}
          </label>
          <input
            id="cmin" type="number" min={0} max={63} value={minutes}
            onChange={(e) => { setMinutes(Number(e.target.value)); setBuilt(null); }}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="ctitle" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Nama kuisnya' : 'A name for it'}
          </label>
          <input
            id="ctitle" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={id ? 'Misalnya: ulangan pekan 3' : 'e.g. Week 3 test'}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox" checked={shuffle}
            onChange={(e) => { setShuffle(e.target.checked); setBuilt(null); }}
            className="mt-0.5 accent-[var(--accent)]"
          />
          <span className="text-sm leading-relaxed">
            {id ? 'Acak urutan untuk tiap peserta' : 'Shuffle the order for each participant'}
            <span className="block text-xs text-text-faint">
              {id
                ? 'Soalnya sama, urutannya berbeda, jadi menyontek layar sebelah memberi jawaban untuk nomor lain. Urutan tiap orang tetap sama kalau halaman dimuat ulang.'
                : 'The same questions in a different order, so copying a neighbour’s screen answers a different question. Each person keeps their own order across a refresh.'}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox" checked={disclose}
            onChange={(e) => { setDisclose(e.target.checked); setBuilt(null); }}
            className="mt-0.5 accent-[var(--accent)]"
          />
          <span className="text-sm leading-relaxed">
            {id ? 'Tampilkan kunci tiap soal' : 'Show the key on every question'}
            <span className="block text-xs text-text-faint">
              {id
                ? 'Untuk kelas yang baru belajar mekanismenya, bukan kriptanalisis.'
                : 'For a class learning the mechanism rather than doing cryptanalysis.'}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
          {id ? 'Siapa yang boleh mengerjakan' : 'Who may attempt it'}
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {([
            ['open', id ? 'Siapa saja' : 'Anyone'],
            ['first_correct', id ? 'Tutup saat ada yang sempurna' : 'Close on a full score'],
            ['host_only', id ? 'Hanya saya' : 'Only me'],
          ] as const).map(([value, label]) => (
            <button
              key={value} type="button"
              onClick={() => { setMode(value); setBuilt(null); }}
              aria-pressed={mode === value}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                mode === value ? 'bg-accent text-accent-text' : 'border border-border-subtle text-text-muted hover:border-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      <button
        type="button" onClick={save} disabled={busy || !rows.length}
        className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy
          ? id ? 'Menyimpan…' : 'Saving…'
          : built
            ? id ? 'Simpan sebagai kuis baru' : 'Save as a new quiz'
            : id ? 'Buat kuisnya' : 'Build the quiz'}
      </button>

      {built && (
        <div className="mt-6 border-t border-border-subtle pt-6">
          <div className="flex flex-col items-center">
            <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
              {id ? 'Kode gabung' : 'Join code'}
            </div>
            <p className="cipher-text mt-1 text-2xl font-semibold tracking-[0.16em] text-accent">
              {built.code}
            </p>
            <p className="mt-1 font-mono text-xs text-text-faint">{link}</p>
            <div className="mt-4"><QrCode value={link} size={172} /></div>
          </div>

          {/* The paper as it will be dealt, so the arrangement can be checked
              against the lesson before anybody scans anything. */}
          <ol className="mt-5 space-y-1">
            {built.questions.map((q) => (
              <li key={q.number} className="flex items-center gap-3 rounded-lg bg-bg-sunken px-3 py-2 text-sm">
                <span className="w-5 text-right font-mono text-xs tabular-nums text-text-faint">
                  {q.number}
                </span>
                <span className="flex-1">{q.techniqueName}</span>
                <span className="text-xs text-text-faint">{'★'.repeat(q.difficulty)}</span>
              </li>
            ))}
          </ol>

          {shuffle && (
            <p className="mt-3 text-xs leading-relaxed text-text-faint">
              {id
                ? 'Urutan di atas adalah urutan dasar. Tiap peserta menerima urutan berbeda.'
                : 'That is the base order. Each participant receives a different one.'}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(link)}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
            >
              {id ? 'Salin tautan' : 'Copy the link'}
            </button>
            <Link
              href={`/q/${built.code}`}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
            >
              {id ? 'Lihat sebagai peserta' : 'See it as a participant'}
            </Link>
            <Link
              href="/instructor"
              className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
            >
              {id ? 'Dasbor' : 'Dashboard'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
