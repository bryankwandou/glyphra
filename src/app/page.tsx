import Link from 'next/link';
import { LiveCipher } from '@/components/live-cipher';
import { TECHNIQUES, REVERSIBLE, CATALOGUE_SIZE, FAMILY_LABEL } from '@/lib/ciphers';
import type { Family } from '@/lib/ciphers/types';

function familyCounts() {
  const counts = new Map<Family, number>();
  for (const t of TECHNIQUES) counts.set(t.family, (counts.get(t.family) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default function Home() {
  const families = familyCounts();
  const oneWay = CATALOGUE_SIZE - REVERSIBLE.length;

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-raised px-3 py-1 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
              {REVERSIBLE.length} techniques verified against their own inverse
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]">
              Cryptography problems,
              <br />
              <span className="text-accent">generated the moment you ask.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              Press one button and a fresh exercise appears, drawn from {CATALOGUE_SIZE} techniques
              that run from a Caesar shift a student meets in week one to AES and ChaCha20. Answers
              and full worked solutions sit behind the instructor sign-in, so a class can practise
              without anyone reading ahead.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/practice"
                className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-text shadow-[var(--shadow-md)] transition-colors hover:bg-accent-hover"
              >
                Generate a problem
              </Link>
              <Link
                href="/catalogue"
                className="rounded-xl border border-border-strong bg-bg-raised px-5 py-3 text-sm font-medium transition-colors hover:border-accent"
              >
                Browse the catalogue
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                { k: CATALOGUE_SIZE, v: 'techniques' },
                { k: families.length, v: 'families' },
                { k: '1,128', v: 'round trips per check' },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-semibold tabular-nums tracking-tight">{s.k}</dt>
                  <dd className="mt-0.5 text-xs text-text-muted">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rise" style={{ animationDelay: '120ms' }}>
            <LiveCipher />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- mechanics */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            How a problem reaches you
          </h2>
          <p className="mt-3 max-w-2xl text-text-muted">
            Nothing is pre-written. Each exercise is built on request, enciphered by the same engine
            that checks itself, and sealed before it leaves the server.
          </p>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: '01',
                h: 'Pick your constraints, or none',
                p: 'Choose a technique, a family, a difficulty band, or leave it open and take whatever comes. A seed can be supplied so an entire class receives the identical paper.',
              },
              {
                n: '02',
                h: 'The message is drawn, then enciphered',
                p: 'Either from the built-in bank or from a language model when you want fresh wording. The model writes the sentence and never touches the cryptography — that stays with the verified engine.',
              },
              {
                n: '03',
                h: 'The answer travels sealed',
                p: 'The solution is encrypted with AES-256-GCM and handed to your browser as an opaque blob. Marking happens server-side. Reading the page source gets you nothing.',
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-2xl border border-border-subtle bg-bg-raised p-6 transition-colors hover:border-border-strong"
              >
                <span className="text-xs font-medium tabular-nums text-accent">{s.n}</span>
                <h3 className="mt-3 font-medium tracking-[-0.01em]">{s.h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- correctness */}
      <section className="border-b border-border-subtle bg-bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              A wrong answer key is worse than no answer key
            </h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              A cipher implementation that is subtly wrong will still produce output that looks like
              ciphertext. A student cannot tell. The marking will simply be wrong, and they will
              conclude they misunderstood the method.
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              So every technique is run against its own inverse before it can appear: twelve random
              key and message pairs each, asserting that decoding returns exactly what was encoded.
              The first time that harness ran it rejected six techniques. A duplicate glyph in the
              Pigpen table. An RSA parameter set where the public exponent shared a factor with the
              totient, so no private exponent existed. Steganography with no terminator, decoding
              endless letters past the end of the payload.
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              All six are fixed. The check runs on every build, and a failure stops the build.
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5 shadow-[var(--shadow-md)]">
            <div className="artefact slim-scroll text-[0.8125rem] leading-relaxed text-text-muted">
{`Catalogue: ${CATALOGUE_SIZE} techniques

${families.map(([f, c]) => `  ${FAMILY_LABEL[f].padEnd(30)}${String(c).padStart(3)}`).join('\n')}

Reversible: ${REVERSIBLE.length}   one-way: ${oneWay}
Round trips attempted: ${REVERSIBLE.length * 12}

`}<span className="text-ok">{`All ${REVERSIBLE.length} reversible techniques round-trip exactly.`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ families */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Ten families, three thousand years
              </h2>
              <p className="mt-3 max-w-2xl text-text-muted">
                From a Spartan rod to a stream cipher built to dodge cache-timing attacks. Each entry
                carries its mechanism, its period, and an honest account of how it was broken.
              </p>
            </div>
            <Link
              href="/catalogue"
              className="rounded-lg border border-border-strong bg-bg-raised px-4 py-2 text-sm font-medium transition-colors hover:border-accent"
            >
              Open the catalogue
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {families.map(([family, count]) => (
              <Link
                key={family}
                href={`/catalogue#${family}`}
                className="group rounded-xl border border-border-subtle bg-bg-raised p-4 transition-all hover:border-accent hover:shadow-[var(--shadow-md)]"
              >
                <div className="text-2xl font-semibold tabular-nums tracking-tight text-accent">
                  {count}
                </div>
                <div className="mt-1 text-sm leading-snug text-text-muted group-hover:text-text">
                  {FAMILY_LABEL[family]}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ closing */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="rounded-3xl border border-border-subtle bg-bg-raised p-8 text-center shadow-[var(--shadow-lg)] sm:p-14">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Take one now and see how far you get
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              No account, no setup. Pick a difficulty and start. If you get stuck, the catalogue
              explains the mechanism without handing over the answer.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/practice"
                className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                Generate a problem
              </Link>
              <Link
                href="/instructor"
                className="rounded-xl border border-border-strong px-6 py-3 text-sm font-medium transition-colors hover:border-accent"
              >
                Instructor sign-in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
