'use client';

import { createContext, useContext } from 'react';
import { DICT, type Dict, type Locale } from './dict';

/**
 * The dictionary for client components.
 *
 * Only the locale string crosses the server-to-client boundary. The dictionary
 * itself is imported here instead of being passed down, because several entries
 * are functions that interpolate a count, and functions cannot be serialised
 * across that boundary. Shipping the strings to the browser costs a few
 * kilobytes and keeps one dictionary rather than two.
 */
const LocaleContext = createContext<Locale>('en');

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dict {
  return DICT[useContext(LocaleContext)];
}
