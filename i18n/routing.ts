import { defineRouting } from 'next-intl/routing'

/**
 * Locale routing (roadmap § 5.1 / D-03).
 *
 * `localePrefix: 'always'` — every route lives under `/en/…` or `/fa/…`,
 * including the default locale. Chosen over `as-needed` (bare `/` for
 * English) so `app/[locale]/…` maps to every route without a hidden
 * default-locale exception, and so the language switcher always has an
 * explicit, symmetrical URL to link to in both directions.
 */
export const routing = defineRouting({
  locales: ['en', 'fa'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeCookie: {
    name: 'artaveo-locale',
    maxAge: 60 * 60 * 24 * 365,
  },
})

export type AppLocale = (typeof routing.locales)[number]
