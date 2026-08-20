import Link from 'next/link';
import { LiveCipher } from '@/components/live-cipher';
import { TECHNIQUES, REVERSIBLE, CATALOGUE_SIZE, FAMILY_LABEL } from '@/lib/ciphers';
import type { Family } from '@/lib/ciphers/types';
import { t } from '@/lib/i18n';
import { Reveal } from '@/components/reveal';
import { DecodeHeading } from '@/components/decode-heading';

function familyCounts() {
  const counts = new Map<Family, number>();
  for (const t of TECHNIQUES) counts.set(t.family, (counts.get(t.family) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function Home() {
  const families = familyCounts();
  const oneWay = CATALOGUE_SIZE - REVERSIBLE.length;
  const d = (await t()).home;

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-raised px-3 py-1 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
              {d.badge(REVERSIBLE.length)}
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]">
              {d.h1a}
              <br />
              <span className="text-accent">{d.h1b}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              {d.lead(CATALOGUE_SIZE)}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/practice"
                className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-text shadow-[var(--shadow-md)] transition-colors hover:bg-accent-hover"
              >
                {d.ctaGenerate}
              </Link>
              <Link
                href="/catalogue"
                className="rounded-xl border border-border-strong bg-bg-raised px-5 py-3 text-sm font-medium transition-colors hover:border-accent"
              >
                {d.ctaCatalogue}
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                { k: CATALOGUE_SIZE, v: d.statTechniques },
                { k: families.length, v: d.statFamilies },
                { k: '1,128', v: d.statTrips },
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
            <DecodeHeading text={d.mechanicsH} />
          </h2>
          <p className="mt-3 max-w-2xl text-text-muted">
            {d.mechanicsP}
          </p>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: '01',
                h: d.step1H,
                p: d.step1P,
              },
              {
                n: '02',
                h: d.step2H,
                p: d.step2P,
              },
              {
                n: '03',
                h: d.step3H,
                p: d.step3P,
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
              <li
                className="h-full rounded-2xl border border-border-subtle bg-bg-raised p-6 transition-colors hover:border-border-strong"
              >
                <span className="text-xs font-medium tabular-nums text-accent">{s.n}</span>
                <h3 className="mt-3 font-medium tracking-[-0.01em]">{s.h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.p}</p>
              </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- correctness */}
      <section className="border-b border-border-subtle bg-bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              <DecodeHeading text={d.correctH} />
            </h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.correctP1}
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.correctP2}
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.correctP3}
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

      {/* ---------------------------------------------------------------- quiz */}
      <section className="border-b border-border-subtle bg-bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
              {d.quizEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              <DecodeHeading text={d.quizH} />
            </h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.quizP1}
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.quizP2}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/join"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                {d.quizJoin}
              </Link>
              <Link
                href="/assess"
                className="rounded-xl border border-border-strong bg-bg-raised px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent"
              >
                {d.quizCreate}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-raised p-6 shadow-[var(--shadow-md)]">
            <div className="text-center">
              <div className="text-[0.6875rem] uppercase tracking-[0.16em] text-text-faint">
                {d.quizJoinCode}
              </div>
              <div className="mt-2 font-mono text-4xl font-semibold tracking-[0.12em] text-accent">
                CY9J-8B59
              </div>
            </div>

            <ul className="mt-6 space-y-2.5">
              {[
                [d.quizF1H, d.quizF1P],
                [d.quizF2H, d.quizF2P],
                [d.quizF3H, d.quizF3P],
                [d.quizF4H, d.quizF4P],
              ].map(([head, tail]) => (
                <li key={head} className="flex gap-2.5 text-sm">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span className="leading-relaxed text-text-muted">
                    <span className="text-text">{head}</span> — {tail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- assessment */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
              {d.assessEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              {d.assessH}
            </h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.assessP1}
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              {d.assessP2}
            </p>
            <Link
              href="/assess"
              className="mt-6 inline-block rounded-xl border border-border-strong bg-bg-raised px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent"
            >
              {d.assessCta}
            </Link>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-raised p-5 shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <span className="text-xs uppercase tracking-[0.14em] text-text-faint">
                Kriptografi &mdash; UTS
              </span>
              <span className="font-mono text-xs text-text-faint">seed FIXED-A</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                ['VNYB-01', 'ROT18', 'Simple substitution', 'Bifid'],
                ['RSSK-02', 'Quoted-printable', 'Variant Beaufort', 'Quagmire II'],
                ['KTWU-03', 'Keyword substitution', 'Simple substitution', 'Double columnar'],
                ['NYCN-04', 'Tap code', 'Uuencode', 'RC4'],
              ].map(([code, ...items]) => (
                <li
                  key={code}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-bg-sunken px-3 py-2"
                >
                  <span className="font-mono text-xs text-accent">{code}</span>
                  <span className="text-xs text-text-muted">{items.join(' · ')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
              <span>{d.assessNote1}</span>
              <span aria-hidden>·</span>
              <span className="text-ok">{d.assessNote2}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ families */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                {d.familiesH}
              </h2>
              <p className="mt-3 max-w-2xl text-text-muted">
                {d.familiesP}
              </p>
            </div>
            <Link
              href="/catalogue"
              className="rounded-lg border border-border-strong bg-bg-raised px-4 py-2 text-sm font-medium transition-colors hover:border-accent"
            >
              {d.familiesCta}
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
              {d.closingH}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              {d.closingP}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/practice"
                className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                {d.closingCta}
              </Link>
              <Link
                href="/instructor"
                className="rounded-xl border border-border-strong px-6 py-3 text-sm font-medium transition-colors hover:border-accent"
              >
                {d.closingInstructor}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
