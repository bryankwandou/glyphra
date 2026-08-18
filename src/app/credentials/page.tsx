import type { Metadata } from 'next';
import Link from 'next/link';
import { issuerAddress } from '@/lib/solana';

export const metadata: Metadata = {
  title: 'Credentials',
  description:
    'How Glyphra anchors a solved problem on Solana devnet, and exactly what that record does and does not claim.',
};

export default function CredentialsPage() {
  const issuer = issuerAddress();
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
        Proof that you solved it
      </h1>
      <p className="mt-4 leading-relaxed text-text-muted">
        Solve a problem and you can have the result written to Solana devnet as a public,
        timestamped record. Anyone can look it up afterwards without asking anyone&apos;s permission,
        which is the only thing that makes it more useful than a screenshot.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-medium tracking-[-0.01em]">What the record actually says</h2>
        <p className="mt-3 leading-relaxed text-text-muted">
          The memo written on-chain contains the technique, the difficulty, a reference to the
          problem, the time, and a truncated hash. It is deliberately narrow, and it is worth being
          precise about the limits rather than letting the word &ldquo;blockchain&rdquo; do work it
          has not earned.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ok bg-ok-soft p-4">
            <h3 className="text-sm font-medium text-ok">It does establish</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text-muted">
              <li>A correct solution was submitted for a problem of this technique.</li>
              <li>It happened no later than the block timestamp.</li>
              <li>The record has not been altered since.</li>
              <li>The issuer signed it, so it did not come from nowhere.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-warn bg-warn-soft p-4">
            <h3 className="text-sm font-medium text-warn">It does not establish</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text-muted">
              <li>That the holder solved it without help.</li>
              <li>Any general competence in cryptography.</li>
              <li>Anything at all about who the person is.</li>
              <li>That the problem was hard for them.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium tracking-[-0.01em]">Why nothing personal goes on-chain</h2>
        <p className="mt-3 leading-relaxed text-text-muted">
          A public ledger is permanent and cannot be redacted. Writing a student&apos;s name to it
          would create a record that outlives any reason to keep it and cannot be withdrawn if they
          later want it gone. So the record carries a hash and nothing else. Someone holding the
          original problem can recompute that hash and confirm the record refers to it; nobody else
          can work backwards from it to the answer or to a person.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium tracking-[-0.01em]">Verifying one yourself</h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
          <li>1. Take the transaction signature from the credential.</li>
          <li>
            2. Open it on Solana Explorer with the cluster set to{' '}
            <span className="font-mono text-text">{cluster}</span>.
          </li>
          <li>3. Read the memo instruction. The JSON payload is the attestation, in plain sight.</li>
          <li>4. Confirm the fee payer matches the issuer address below.</li>
        </ol>

        <div className="mt-5 rounded-xl border border-border-subtle bg-bg-raised p-4">
          <div className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-faint">
            Issuer address
          </div>
          {issuer ? (
            <a
              href={`https://explorer.solana.com/address/${issuer}?cluster=${cluster}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block break-all font-mono text-sm text-accent hover:underline"
            >
              {issuer}
            </a>
          ) : (
            <p className="mt-1 text-sm text-text-muted">
              No issuer key is configured in this deployment, so credentials cannot be anchored here.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-text-faint">
            Devnet only. Devnet SOL has no value and the network is reset periodically, so treat
            these as a working demonstration of the mechanism rather than a permanent transcript.
          </p>
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-border-subtle bg-bg-raised p-6">
        <h2 className="font-medium tracking-[-0.01em]">Earn one</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Solve any problem in the practice range. The option to anchor appears once your answer is
          marked correct — and only then, because the server re-checks the answer before it signs
          anything.
        </p>
        <Link
          href="/practice"
          className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          Go to the practice range
        </Link>
      </div>
    </div>
  );
}
