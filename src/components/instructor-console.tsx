'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Step } from '@/lib/ciphers/types';
import { useLocale } from '@/lib/i18n/client';
import { errorText } from '@/lib/i18n/errors';

interface SolutionPayload {
  plaintext: string;
  key: Record<string, string | number>;
  encodeSteps: Step[];
  decodeSteps: Step[];
  viewedBy: string;
}

function StepList({ steps, title }: { steps: Step[]; title: string }) {
  return (
    <section>
      <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
        {title}
      </h3>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-border-subtle bg-bg-raised p-4">
            <div className="flex items-baseline gap-3">
              <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent">
                {i + 1}
              </span>
              <h4 className="text-sm font-medium tracking-[-0.01em]">{s.title}</h4>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.detail}</p>
            {s.data ? (
              <pre className="artefact slim-scroll mt-3 rounded-lg bg-bg-sunken p-3 text-xs text-text">
                {s.data}
              </pre>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InstructorConsole({
  signedIn,
  username,
  initialSealed,
}: {
  signedIn: boolean;
  username: string | null;
  initialSealed: string;
}) {
  const id = useLocale() === 'id';
  const locale = useLocale();
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [sealed, setSealed] = useState(initialSealed);
  const [solution, setSolution] = useState<SolutionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (blob: string) => {
    if (!blob) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealed: blob }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (id ? 'Amplopnya tidak dapat dibuka.' : 'Could not open the envelope.'));
      setSolution(data);
    } catch (e) {
      setError(errorText((e as Error).message, locale));
      setSolution(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn && initialSealed) void load(initialSealed);
  }, [signedIn, initialSealed, load]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (id ? 'Masuk gagal.' : 'Sign-in failed.'));
      router.refresh();
    } catch (e) {
      setError(errorText((e as Error).message, locale));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSolution(null);
    router.refresh();
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="rounded-2xl border border-border-subtle bg-bg-raised p-7 shadow-[var(--shadow-md)]">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{id ? 'Masuk sebagai pengajar' : 'Instructor sign-in'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            {id
              ? 'Kunci jawaban dan penyelesaian lengkap ditahan di balik pintu ini. Mahasiswa yang mengerjakan lapangan latihan tidak pernah menerimanya.'
              : 'Answer keys and worked solutions are held behind this. Students working through the practice range never receive them.'}
          </p>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <div>
              <label htmlFor="u" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                {id ? 'Nama pengguna' : 'Username'}
              </label>
              <input
                id="u"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="p" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                {id ? 'Kata sandi' : 'Password'}
              </label>
              <input
                id="p"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? (id ? 'Memeriksa…' : 'Checking…') : id ? 'Masuk' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{id ? 'Tampilan pengajar' : 'Instructor view'}</h1>
          <p className="mt-1 text-sm text-text-muted">{id ? `Masuk sebagai ${username}.` : `Signed in as ${username}.`}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm transition-colors hover:border-accent"
        >
          {id ? 'Keluar' : 'Sign out'}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-raised p-5">
        <label htmlFor="sealed" className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
          {id ? 'Soal tersegel' : 'Sealed challenge'}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          {id
            ? 'Tempelkan nilai tersegel dari sebuah soal, atau buka langsung dari lapangan latihan.'
            : 'Paste the sealed value from a problem, or open one straight from the practice range.'}
        </p>
        <textarea
          id="sealed"
          value={sealed}
          rows={3}
          onChange={(e) => setSealed(e.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-accent"
        />
        <button
          type="button"
          onClick={() => load(sealed.trim())}
          disabled={busy || !sealed.trim()}
          className="mt-3 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? (id ? 'Membuka…' : 'Opening…') : id ? 'Buka penyelesaiannya' : 'Open the solution'}
        </button>

        {error && (
          <p className="mt-3 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
      </div>

      {solution && (
        <div className="rise mt-8 space-y-8">
          <section className="rounded-2xl border border-ok bg-ok-soft p-5">
            <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ok">
              {id ? 'Kunci jawaban' : 'Answer key'}
            </h2>
            <p className="plain-text mt-2 text-lg leading-relaxed text-text">{solution.plaintext}</p>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-raised p-5">
            <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
              {id ? 'Bahan kunci' : 'Key material'}
            </h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(solution.key).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2">
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">{k}</dt>
                  <dd className="mt-0.5 break-all font-mono text-sm">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <StepList steps={solution.decodeSteps} title={id ? 'Pembacaan, langkah demi langkah' : 'Decryption, step by step'} />
          <StepList steps={solution.encodeSteps} title={id ? 'Bagaimana soalnya dibangun' : 'How the problem was built'} />
        </div>
      )}
    </div>
  );
}
