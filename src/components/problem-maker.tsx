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

interface Made {
  code: string;
  techniqueName: string;
  ciphertext: string;
  prompt: string;
  keyFields: { label: string; disclosed: boolean; value?: string }[];
}

/**
 * One method in, one QR out.
 *
 * The difference from the quiz panel is the whole reason this exists: a quiz
 * code carries a mixed set drawn from a difficulty band, and there is no way to
 * point at it and say "this is a Playfair problem". Here the technique is
 * chosen first and written into the code, so the claim is checkable by anybody
 * holding it rather than being taken on trust.
 */
export function ProblemMaker({
  techniques,
  signedIn,
}: {
  techniques: Technique[];
  signedIn: boolean;
}) {
  const id = useLocale() === 'id';
  const locale = useLocale();

  const [techniqueId, setTechniqueId] = useState('caesar');
  const [disclose, setDisclose] = useState(true);
  const [label, setLabel] = useState('');
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = made ? `${origin}/p/${made.code}` : '';

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/problem/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techniqueId, disclose, label: label.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');
      setMade({
        code: data.problem.code,
        techniqueName: data.preview.techniqueName,
        ciphertext: data.preview.ciphertext,
        prompt: data.preview.prompt,
        keyFields: data.preview.keyFields,
      });
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
          {id ? 'Satu QR, satu soal, satu metode' : 'One QR, one problem, one method'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {id
            ? 'Pilih satu metode, dapat satu kode yang membawa metode itu di dalamnya, dan lihat siapa yang memecahkannya lebih dulu. Perlu akun karena riwayat soal dan status terpecahkan disimpan atas nama Anda.'
            : 'Pick one method, get one code that carries that method inside it, and see who solves it first. It needs an account because the history and the solved flag are kept against you.'}
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          {id ? 'Masuk atau daftar' : 'Sign in or sign up'}
        </Link>
      </div>
    );
  }

  const sorted = [...techniques].sort(
    (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
  );

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-raised p-6">
      <h2 className="text-sm font-medium tracking-[-0.01em]">
        {id ? 'Satu QR, satu soal, satu metode' : 'One QR, one problem, one method'}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        {id
          ? 'Metode yang Anda pilih ditulis ke dalam kodenya. Soal ini tidak bisa berisi metode lain, dan itu bisa diperiksa siapa pun yang memegang kodenya.'
          : 'The method you pick is written into the code. This problem cannot contain another one, and anybody holding the code can check that.'}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tech" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Metode' : 'Method'}
          </label>
          <select
            id="tech"
            value={techniqueId}
            onChange={(e) => { setTechniqueId(e.target.value); setMade(null); }}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            {sorted.map((t) => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.difficulty)} {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lbl" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Catatan untuk Anda' : 'A note for yourself'}
          </label>
          <input
            id="lbl"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={id ? 'Misalnya: kuis kelas Rabu' : 'e.g. Wednesday class warm-up'}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={disclose}
          onChange={(e) => { setDisclose(e.target.checked); setMade(null); }}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span className="text-sm leading-relaxed">
          {id ? 'Tampilkan kuncinya' : 'Show the key'}
          <span className="block text-xs text-text-faint">
            {id
              ? 'Dengan kunci di tangan, yang dikerjakan adalah metodenya. Tanpa kunci, ini jadi kriptanalisis — jauh lebih sulit.'
              : 'With the key in hand the work is the method. Without it this becomes cryptanalysis, which is a great deal harder.'}
          </span>
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy
          ? id ? 'Membuat…' : 'Making it…'
          : made
            ? id ? 'Buat satu lagi' : 'Make another'
            : id ? 'Buat soalnya' : 'Make the problem'}
      </button>

      {made && (
        <div className="mt-6 border-t border-border-subtle pt-6">
          <div className="flex flex-col items-center">
            <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
              {id ? 'Kode soal' : 'Problem code'}
            </div>
            <p className="cipher-text mt-1 text-2xl font-semibold tracking-[0.16em] text-accent">
              {made.code}
            </p>
            <p className="mt-1 font-mono text-xs text-text-faint">{link}</p>

            <div className="mt-4">
              <QrCode value={link} size={172} />
            </div>

            <p className="mt-3 max-w-sm text-center text-xs leading-relaxed text-text-faint">
              {id
                ? 'Arahkan kamera ponsel ke sini. Kode ini berhenti berlaku begitu ada yang menjawab benar.'
                : 'Point a phone camera at this. The code stops working once somebody answers correctly.'}
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(link)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                {id ? 'Salin tautan' : 'Copy the link'}
              </button>
              <Link
                href={`/p/${made.code}`}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                {id ? 'Lihat sebagai peserta' : 'See it as a participant'}
              </Link>
              <Link
                href="/instructor"
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                {id ? 'Riwayat soal' : 'Problem history'}
              </Link>
            </div>
          </div>

          {/* The instructor's own copy, so they can check it before handing it
              out rather than discovering the ciphertext on a projector. */}
          <div className="mt-6 rounded-xl bg-bg-sunken p-4">
            <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
              {made.techniqueName}
            </div>
            <p className="cipher-text mt-2 break-words text-sm leading-relaxed text-cipher">
              {made.ciphertext}
            </p>
            {made.keyFields.length > 0 && (
              <dl className="mt-3 space-y-1 border-t border-border-subtle pt-3 text-xs">
                {made.keyFields.map((f) => (
                  <div key={f.label} className="flex justify-between gap-2">
                    <dt className="text-text-faint">{f.label}</dt>
                    <dd className={f.disclosed ? 'font-mono' : 'text-text-faint'}>
                      {f.disclosed ? f.value : id ? 'disembunyikan' : 'withheld'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
