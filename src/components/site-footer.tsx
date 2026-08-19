import Link from 'next/link';
import { Mark } from './logo';
import { CATALOGUE_SIZE, REVERSIBLE } from '@/lib/ciphers';
import { t } from '@/lib/i18n';

export async function SiteFooter() {
  const d = await t();

  return (
    <footer className="no-print border-t border-border-subtle bg-bg-sunken">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <Mark size={24} />
              <span className="font-semibold tracking-[-0.02em]">Glyphra</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              {d.home.badge(REVERSIBLE.length)}
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/encode" className="text-text-muted hover:text-text">{d.nav.encode}</Link>
            <Link href="/practice" className="text-text-muted hover:text-text">{d.nav.practice}</Link>
            <Link href="/tutorial" className="text-text-muted hover:text-text">{d.nav.tutorial}</Link>
            <Link href="/catalogue" className="text-text-muted hover:text-text">{d.nav.catalogue}</Link>
            <Link href="/join" className="text-text-muted hover:text-text">{d.nav.join}</Link>
            <Link href="/credentials" className="text-text-muted hover:text-text">{d.nav.credentials}</Link>
            <Link href="/instructor" className="text-text-muted hover:text-text">{d.nav.instructor}</Link>
            <a
              href="https://github.com/bryankwandou/glyphra"
              className="text-text-muted hover:text-text"
              target="_blank"
              rel="noreferrer noopener"
            >
              Source
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-6 text-xs text-text-faint">
          <span className="tabular-nums">{CATALOGUE_SIZE} {d.home.statTechniques}</span>
          <span aria-hidden>·</span>
          <span>Built by Bryan Kwandou</span>
          <span aria-hidden>·</span>
          <span>
            Teaching material. Nothing here should protect anything that matters.
          </span>
        </div>
      </div>
    </footer>
  );
}
