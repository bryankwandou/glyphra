import type { Metadata } from 'next';
import Link from 'next/link';
import { TECHNIQUES, FAMILY_LABEL, CATALOGUE_SIZE } from '@/lib/ciphers';
import type { Family, Difficulty } from '@/lib/ciphers/types';
import { t, currentLocale } from '@/lib/i18n';
import { eraText } from '@/lib/i18n/eras';
import { prose } from '@/lib/i18n/techniques';
import { keyLabel } from '@/lib/i18n/key-labels';

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'Every technique in Glyphra, with its mechanism, its period, and an account of how it was broken.',
};

const ORDER: Family[] = [
  'substitution', 'polyalphabetic', 'polygraphic', 'transposition', 'fractionation',
  'encoding', 'modern-symmetric', 'asymmetric', 'hash', 'steganography',
];

export default async function CataloguePage() {
  const d = await t();
  const locale = await currentLocale();
  const id = locale === 'id';
  const level = (n: Difficulty) => d.bench.levels[String(n)] ?? String(n);
  const family = (f: Family) => d.bench.families[f] ?? FAMILY_LABEL[f];

  return (
    <>
      <div className="border-b border-border-subtle">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            {id ? 'Katalognya' : 'The catalogue'}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-text-muted">
            {id
              ? `Seluruh ${CATALOGUE_SIZE} teknik, dikelompokkan menurut rumpunnya. Tiap entri memberi mekanismenya cukup rinci untuk dikerjakan ulang dengan tangan, dan menyebut terus terang bagaimana dan kapan ia jatuh — sandi tanpa pembobolannya hanya setengah diajarkan.`
              : `All ${CATALOGUE_SIZE} techniques, grouped by family. Each entry gives the mechanism in enough detail to reproduce it by hand, and says plainly how and when it fell — a cipher without its break is only half taught.`}
          </p>

          <nav className="mt-6 flex flex-wrap gap-1.5" aria-label={id ? 'Rumpun' : 'Families'}>
            {ORDER.map((f) => {
              const count = TECHNIQUES.filter((t) => t.family === f).length;
              if (!count) return null;
              return (
                <a
                  key={f}
                  href={`#${f}`}
                  className="rounded-lg bg-bg-sunken px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
                >
                  {family(f)} <span className="tabular-nums text-text-faint">{count}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        {ORDER.map((group) => {
          const items = TECHNIQUES.filter((tech) => tech.family === group)
            .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name));
          if (!items.length) return null;

          return (
            <section key={group} id={group} className="scroll-mt-20 pb-14">
              <div className="flex items-baseline gap-3 border-b border-border-subtle pb-3">
                <h2 className="text-lg font-semibold tracking-[-0.02em]">{family(group)}</h2>
                <span className="text-sm tabular-nums text-text-faint">{items.length}</span>
              </div>

              <div className="mt-6 space-y-4">
                {items.map((tech) => (
                  <article
                    key={tech.id}
                    id={tech.id}
                    className="scroll-mt-20 rounded-2xl border border-border-subtle bg-bg-raised p-5 transition-colors hover:border-border-strong"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-medium tracking-[-0.01em]">{tech.name}</h3>
                      <span className="text-xs text-text-faint">{eraText(tech.era, locale)}</span>
                      <span
                        className="ml-auto rounded-md bg-bg-sunken px-2 py-0.5 text-xs tabular-nums text-text-muted"
                        title={level(tech.difficulty)}
                      >
                        {tech.difficulty} · {level(tech.difficulty)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm italic text-text-muted">{prose(tech, locale).summary}</p>
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      {prose(tech, locale).theory}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {tech.oneWay ? (
                        <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs text-warn">
                          {id ? 'Satu arah — tidak ada pembacaan baliknya' : 'One-way — no decryption exists'}
                        </span>
                      ) : (
                        <Link
                          href="/practice"
                          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent"
                        >
                          {id ? 'Latih yang ini' : 'Practise this'}
                        </Link>
                      )}
                      {tech.keySpec.filter((k) => k.kind !== 'none').length > 0 && (
                        <span className="text-xs text-text-faint">
                          {id ? 'Kunci: ' : 'Key: '}
                          {tech.keySpec
                            .filter((k) => k.kind !== 'none')
                            .map((k) => keyLabel(k.label, locale).toLowerCase())
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
