'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Formats as the code is typed — uppercased, hyphen inserted after four
   * characters — so what appears on screen matches what is printed on a board.
   * The decoder tolerates any of these shapes anyway; this is about the typing
   * feeling right.
   */
  const onChange = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
    setCode(cleaned.length > 4 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : cleaned);
    setError(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.replace(/-/g, '');
    if (cleaned.length !== 8) {
      setError('A code is eight characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'That code did not open a quiz.');
      }
      router.push(`/q/${encodeURIComponent(code)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="code" className="sr-only">Quiz code</label>
      <input
        id="code"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="w-full rounded-xl border border-border-strong bg-bg-raised px-4 py-4 text-center font-mono text-2xl tracking-[0.2em] outline-none transition-colors focus:border-accent"
      />

      {error && (
        <p className="mt-3 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-center text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? 'Opening…' : 'Open the quiz'}
      </button>
    </form>
  );
}
