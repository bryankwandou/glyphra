import type { Metadata } from 'next';
import Link from 'next/link';
import { currentLocale } from '@/lib/i18n';
import { TutorialDemo } from '@/components/tutorial-demo';
import { getTechnique } from '@/lib/ciphers';
import {
  INTRO, KINDS, KINDS_TITLE, KINDS_LEAD, KINDS_NOTE,
  FAMILIES, FAMILIES_TITLE, FAMILIES_LEAD,
  PATH, PATH_TITLE, PATH_LEAD,
  HOWTO, USING_TITLE, CLOSING, PLAINTEXT, pick,
} from '@/lib/tutorial';

export const metadata: Metadata = {
  title: 'Tutorial',
  description:
    'What separates one cipher family from another, how to recognise each on sight, how each one breaks, and a teaching order that follows the history.',
};

export default async function TutorialPage() {
  const l = await currentLocale();
  const id = l === 'id';

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      {/* ------------------------------------------------------------- opening */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          {id ? 'Panduan' : 'Guide'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {pick(INTRO.title, l)}
        </h1>
        <div className="mt-5 space-y-4">
          {INTRO.body.map((p, i) => (
            <p key={i} className="leading-relaxed text-text-muted">{pick(p, l)}</p>
          ))}
        </div>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label={id ? 'Daftar isi' : 'Contents'}>
          {[
            { href: '#kinds', label: id ? 'Tiga hal yang tertukar' : 'Three things confused' },
            { href: '#families', label: id ? 'Sepuluh keluarga' : 'Ten families' },
            { href: '#path', label: id ? 'Urutan mengajar' : 'Teaching order' },
            { href: '#using', label: id ? 'Cara memakainya' : 'Using it' },
          ].map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-lg border border-border-subtle bg-bg-raised px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              {a.label}
            </a>
          ))}
        </nav>
      </header>

      {/* --------------------------------------------------------------- kinds */}
      <section id="kinds" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{pick(KINDS_TITLE, l)}</h2>
        <p className="mt-3 leading-relaxed text-text-muted">{pick(KINDS_LEAD, l)}</p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {KINDS.map((k) => (
            <article
              key={k.key}
              className="flex flex-col rounded-2xl border border-border-subtle bg-bg-raised p-5"
            >
              <h3 className="font-medium tracking-[-0.01em]">{pick(k.name, l)}</h3>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-faint">{id ? 'Bisa dibalik' : 'Reversible'}</dt>
                  <dd className="text-right text-text">{pick(k.reversible, l)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-faint">{id ? 'Butuh kunci' : 'Needs a key'}</dt>
                  <dd className="text-right text-text">{pick(k.needsKey, l)}</dd>
                </div>
              </dl>

              <p className="mt-4 text-sm leading-relaxed text-text-muted">{pick(k.useFor, l)}</p>

              <p className="mt-4 border-t border-border-subtle pt-3 text-sm leading-relaxed text-warn">
                {pick(k.trap, l)}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-border-subtle bg-bg-sunken p-5 text-sm leading-relaxed text-text-muted">
          {pick(KINDS_NOTE, l)}
        </p>
      </section>

      {/* ------------------------------------------------------------ families */}
      <section id="families" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{pick(FAMILIES_TITLE, l)}</h2>
        <p className="mt-3 leading-relaxed text-text-muted">{pick(FAMILIES_LEAD, l)}</p>

        <div className="mt-5 rounded-xl border border-border-subtle bg-bg-sunken px-5 py-4">
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-faint">
            {id ? 'Pesan yang dipakai di semua contoh' : 'The message used in every example'}
          </div>
          <p className="cipher-text mt-1.5 text-lg tracking-[0.12em]">{PLAINTEXT}</p>
        </div>

        <div className="mt-7 space-y-5">
          {FAMILIES.map((f, i) => (
            <article
              key={f.id}
              id={f.id}
              className="scroll-mt-20 rounded-2xl border border-border-subtle bg-bg-raised p-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs tabular-nums text-text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-medium tracking-[-0.01em]">{pick(f.name, l)}</h3>
                <span className="ml-auto flex items-center gap-3 text-xs text-text-faint">
                  <span className="tabular-nums">
                    {f.count} {id ? 'teknik' : 'techniques'}
                  </span>
                  <span className="rounded-md bg-bg-sunken px-2 py-0.5 tabular-nums">
                    {id ? 'kesulitan' : 'difficulty'} {f.difficulty}
                  </span>
                </span>
              </div>

              <p className="mt-3 leading-relaxed text-text">{pick(f.defines, l)}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-bg-sunken p-4">
                  <h4 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                    {id ? 'Cara mengenalinya' : 'How to recognise it'}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {pick(f.recognise, l)}
                  </p>
                </div>

                <div className="rounded-xl bg-bg-sunken p-4">
                  <h4 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-text-faint">
                    {id ? 'Bagaimana ia dipecahkan' : 'How it breaks'}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {pick(f.breaks, l)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border-subtle p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-accent">
                    {f.example.technique}
                  </span>
                  <span className="font-mono text-xs text-text-faint">{f.example.key}</span>
                </div>
                <p className="cipher-text mt-2 break-words text-[0.9375rem] leading-relaxed text-cipher">
                  {f.example.output}
                </p>
              </div>

              {f.demo && (() => {
                const t = getTechnique(f.demo.techniqueId);
                if (!t) return null;
                return (
                  <TutorialDemo
                    techniqueId={f.demo.techniqueId}
                    initialKey={f.demo.key}
                    initialText={PLAINTEXT}
                    fields={t.keySpec.map((k) => ({
                      name: k.name,
                      kind: k.kind,
                      label: k.label,
                      min: 'min' in k ? k.min : undefined,
                      max: 'max' in k ? k.max : undefined,
                    }))}
                  />
                );
              })()}

              <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-text-muted">
                <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  <span className="text-text">{id ? 'Kapan mengajarkannya' : 'When to set it'}</span>
                  {' — '}
                  {pick(f.teachWhen, l)}
                </span>
              </p>

              <Link
                href={`/catalogue#${f.id}`}
                className="mt-4 inline-block text-sm text-accent hover:underline"
              >
                {id ? 'Lihat semua teknik keluarga ini' : 'See every technique in this family'}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- path */}
      <section id="path" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{pick(PATH_TITLE, l)}</h2>
        <p className="mt-3 leading-relaxed text-text-muted">{pick(PATH_LEAD, l)}</p>

        <ol className="mt-7 space-y-3">
          {PATH.map((s, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-raised p-5 sm:flex-row sm:gap-5"
            >
              <div className="flex shrink-0 items-baseline gap-2 sm:w-32 sm:flex-col sm:gap-1">
                <span className="text-sm font-medium">{pick(s.week, l)}</span>
                <span className="rounded-md bg-bg-sunken px-2 py-0.5 text-xs tabular-nums text-text-faint">
                  {id ? 'kesulitan' : 'difficulty'} {s.difficulty}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm text-accent">{pick(s.what, l)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{pick(s.why, l)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------------- using */}
      <section id="using" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{pick(USING_TITLE, l)}</h2>

        <div className="mt-7 space-y-4">
          {HOWTO.map((h) => (
            <article key={h.route} className="rounded-2xl border border-border-subtle bg-bg-raised p-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-medium tracking-[-0.01em]">{pick(h.name, l)}</h3>
                <code className="rounded-md bg-bg-sunken px-2 py-0.5 font-mono text-xs text-accent">
                  {h.route}
                </code>
                <span className="ml-auto text-xs text-text-faint">{pick(h.forWho, l)}</span>
              </div>

              <ol className="mt-4 space-y-2">
                {h.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                    <span className="font-mono text-xs tabular-nums text-text-faint">{i + 1}</span>
                    <span>{pick(s, l)}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 border-t border-border-subtle pt-3 text-sm leading-relaxed text-text-faint">
                {pick(h.caveat, l)}
              </p>

              <Link
                href={h.route}
                className="mt-4 inline-block rounded-lg border border-border-strong px-4 py-2 text-sm transition-colors hover:border-accent"
              >
                {id ? 'Buka' : 'Open'} {h.route}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- closing */}
      <section className="mt-16 rounded-2xl border border-border-subtle bg-bg-sunken p-6">
        <h2 className="text-lg font-medium tracking-[-0.01em]">{pick(CLOSING.title, l)}</h2>
        <div className="mt-3 space-y-3">
          {CLOSING.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-text-muted">{pick(p, l)}</p>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/practice"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {id ? 'Coba satu soal' : 'Try a problem'}
          </Link>
          <Link
            href="/catalogue"
            className="rounded-xl border border-border-strong px-5 py-2.5 text-sm transition-colors hover:border-accent"
          >
            {id ? 'Buka katalog' : 'Open the catalogue'}
          </Link>
        </div>
      </section>
    </div>
  );
}
