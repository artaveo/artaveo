import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from '@/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    // Typed message keys (roadmap § 5.1): a key present in en.json but
    // missing from fa.json (or vice versa) fails at build/type-check time
    // rather than silently falling back at runtime — see global.d.ts.
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
