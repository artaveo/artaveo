import type { Locale } from '@/types/content'

/**
 * Maps our app locale to a BCP-47 tag for `Intl`. Persian copy stays
 * neutral / Dari-leaning (D-03) with Gregorian dates and Persian digits in
 * prose — `fa` (not `fa-IR`) keeps the Gregorian calendar instead of
 * `Intl`'s default Persian calendar for `fa-IR`, and Latin digits stay
 * confined to code/IDs/technical values, never routed through these
 * helpers.
 */
const intlTag: Record<Locale, string> = {
  en: 'en-US',
  fa: 'fa',
}

export function formatDate(iso: string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlTag[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(iso))
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlTag[locale], options).format(value)
}

export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlTag[locale], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}
