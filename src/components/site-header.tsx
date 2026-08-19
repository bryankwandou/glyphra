import Link from 'next/link';
import { Wordmark } from './logo';
import { currentSession } from '@/lib/auth';
import { CATALOGUE_SIZE } from '@/lib/ciphers';
import { LanguageToggle } from './language-toggle';
import { t } from '@/lib/i18n';

export async function SiteHeader() {
  const session = await currentSession();
  const d = await t();

  const links = [
    { href: '/practice', label: d.nav.practice },
    { href: '/tutorial', label: d.nav.tutorial },
    { href: '/catalogue', label: d.nav.catalogue },
    { href: '/join', label: d.nav.join },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Glyphra home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs tabular-nums text-text-faint lg:inline">
            {CATALOGUE_SIZE} {d.home.statTechniques}
          </span>
          <LanguageToggle />
          {session ? (
            <>
              <Link
                href="/assess"
                className="hidden rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text sm:inline"
              >
                {d.nav.papers}
              </Link>
              <Link
                href="/instructor"
                className="rounded-lg border border-border-strong bg-bg-raised px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-accent"
              >
                {d.nav.instructor}
              </Link>
            </>
          ) : (
            <Link
              href="/instructor"
              className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              {d.home.closingInstructor}
            </Link>
          )}
          <Link
            href="/practice"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            {d.quiz.start}
          </Link>
        </div>
      </div>
    </header>
  );
}
