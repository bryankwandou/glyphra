import Link from 'next/link';
import { Wordmark } from './logo';
import { currentViewer } from '@/lib/auth';
import { CATALOGUE_SIZE } from '@/lib/ciphers';
import { LanguageToggle } from './language-toggle';
import { t } from '@/lib/i18n';

export async function SiteHeader() {
  /*
    Two sign-ins exist, and the header only knew about one of them.

    `currentSession` reads the older single-instructor cookie. Accounts replaced
    that and set a different cookie, so signing in with an account left this
    header rendering its signed-out branch on every page: the account worked
    perfectly at /instructor, /assess and /account, while the button in the
    corner still said "sign in".

    That is the whole of the repeated-login complaint, and it is not a session
    expiring. Somebody signs in, sees a sign-in button on the next page, and
    reasonably concludes it did not take — so they sign in again, and the button
    is still there. Nothing in a log looks wrong, because nothing is wrong except
    what the page says about itself.

    Either credential counts as signed in here.
  */
  const session = await currentViewer();
  const d = await t();

  const links = [
    { href: '/encode', label: d.nav.encode },
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
