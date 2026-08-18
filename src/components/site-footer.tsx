import Link from 'next/link';
import { Mark } from './logo';
import { CATALOGUE_SIZE, REVERSIBLE } from '@/lib/ciphers';

export function SiteFooter() {
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
              A practice range for cryptography. Every one of the {REVERSIBLE.length} reversible
              techniques is checked against its own inverse before it can appear in a problem.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/practice" className="text-text-muted hover:text-text">Practice</Link>
            <Link href="/catalogue" className="text-text-muted hover:text-text">Catalogue</Link>
            <Link href="/credentials" className="text-text-muted hover:text-text">Credentials</Link>
            <Link href="/instructor" className="text-text-muted hover:text-text">Instructor</Link>
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
          <span className="tabular-nums">{CATALOGUE_SIZE} techniques catalogued</span>
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
