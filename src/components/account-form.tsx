'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';

/**
 * Sign up or sign in, on one form.
 *
 * Two pages for what is one decision adds a navigation step to the most common
 * thing anybody does here. The toggle keeps whatever has already been typed,
 * because being sent back to an empty form after picking the wrong tab is the
 * small indignity that makes people give up.
 */
export function AccountForm({ available }: { available: boolean }) {
  const router = useRouter();
  const id = useLocale() === 'id';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/${mode === 'signup' ? 'signup' : 'signin'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');
      router.push('/instructor');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!available) {
    return (
      <div className="rounded-2xl border border-warn bg-warn-soft p-5">
        <h2 className="text-sm font-medium text-warn">
          {id ? 'Akun belum tersedia' : 'Accounts are unavailable'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {id
            ? 'Tidak ada database yang terpasang di lingkungan ini. Latihan, bengkel kerja, dan kuis terbuka tetap berjalan penuh — hanya akun, mode terbatas, dan daftar nilai yang perlu database.'
            : 'No database is configured in this environment. Practice, the workbench and open quizzes all work exactly as before — only accounts, restricted modes and the gradebook need one.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border-subtle bg-bg-raised p-6">
      <div className="flex rounded-lg border border-border-subtle bg-bg-sunken p-0.5">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            aria-pressed={mode === m}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              mode === m ? 'bg-accent text-accent-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {m === 'signin'
              ? id ? 'Masuk' : 'Sign in'
              : id ? 'Buat akun' : 'Create an account'}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="dn" className="text-xs text-text-muted">
              {id ? 'Nama yang ditampilkan' : 'Display name'}
            </label>
            <input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
        )}

        <div>
          <label htmlFor="em" className="text-xs text-text-muted">
            {id ? 'Alamat surel' : 'Email address'}
          </label>
          <input
            id="em"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="pw" className="text-xs text-text-muted">
            {id ? 'Kata sandi' : 'Password'}
          </label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-text-faint">
              {id
                ? 'Minimal 10 karakter. Akun ini bisa melihat kunci jawaban satu angkatan, dan panjang adalah satu-satunya hal yang benar-benar menolong.'
                : 'At least 10 characters. This account can see answer keys for a whole cohort, and length is the only thing that reliably helps.'}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy
          ? id ? 'Memproses…' : 'Working…'
          : mode === 'signin'
            ? id ? 'Masuk' : 'Sign in'
            : id ? 'Buat akun' : 'Create the account'}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-text-faint">
        {id
          ? 'Akun hanya diperlukan untuk membuat soal, mengunci kuis, dan melihat hasil. Peserta tidak pernah perlu akun.'
          : 'An account is only needed to set problems, restrict a quiz, and see results. Participants never need one.'}
      </p>
    </form>
  );
}
