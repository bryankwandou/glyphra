'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/i18n/dict';
import { useLocale } from '@/lib/i18n/client';

/**
 * Switches language.
 *
 * Sets the cookie, then refreshes so the server re-renders every page in the
 * chosen language. A purely client-side swap would leave anything rendered on
 * the server in the previous language until the next navigation, which reads as
 * a half-translated page.
 */
export function LanguageToggle() {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = async (locale: Locale) => {
    if (locale === current || pending) return;
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={`flex items-center rounded-lg border border-border-subtle bg-bg-sunken p-0.5 ${
        pending ? 'opacity-60' : ''
      }`}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          title={LOCALE_LABEL[locale]}
          className={`rounded-md px-2 py-1 text-xs font-medium uppercase tracking-wide transition-colors ${
            locale === current
              ? 'bg-bg-raised text-text shadow-[var(--shadow-sm)]'
              : 'text-text-faint hover:text-text-muted'
          }`}
        >
          {locale === 'id' ? 'ID' : 'EN'}
        </button>
      ))}
    </div>
  );
}
