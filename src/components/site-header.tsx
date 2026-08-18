import Link from 'next/link';
import { Wordmark } from './logo';
import { currentSession } from '@/lib/auth';
import { CATALOGUE_SIZE } from '@/lib/ciphers';

const LINKS = [
  { href: '/practice', label: 'Practice' },
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/credentials', label: 'Credentials' },
];

export async function SiteHeader() {
  const session = await currentSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Glyphra home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {LINKS.map((l) => (
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
          <span className="hidden text-xs tabular-nums text-text-faint md:inline">
            {CATALOGUE_SIZE} techniques
          </span>
          {session ? (
            <>
              <Link
                href="/assess"
                className="hidden rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text sm:inline"
              >
                Papers
              </Link>
              <Link
                href="/instructor"
                className="rounded-lg border border-border-strong bg-bg-raised px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-accent"
              >
                Instructor
              </Link>
            </>
          ) : (
            <Link
              href="/instructor"
              className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/practice"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            Start
          </Link>
        </div>
      </div>
    </header>
  );
}
