import type { Locale } from '@/types/content'

/**
 * Maps our app locale to a BCP-47 tag for `Intl`. D-03: Persian copy stays
 * neutral, with **Gregorian dates** and Persian digits in prose; Latin
 * digits stay confined to code/IDs/technical values, never routed through
 * these helpers.
 *
 * `fa-u-ca-gregory` — the `-u-ca-gregory` extension is what actually pins the
 * calendar. This file used to map `fa` to plain `'fa'`, on the belief that
 * only `fa-IR` switches `Intl` to the Persian (Solar Hijri) calendar; it does
 * not — `Intl` defaults to Solar Hijri for *any* `fa` tag, so every Persian
 * date on the site rendered as e.g. "۱۹ شهریور ۱۴۰۵" instead of the Gregorian
 * "۱۰ سپتامبر ۲۰۲۶" D-03 asks for. Fixed in Phase 17 (found while checking the
 * journal's publish dates). Use `formatDate` — never a bare
 * `toLocaleDateString(locale)` / `new Intl.DateTimeFormat('fa…')` — for
 * anything user-visible.
 */
const intlTag: Record<Locale, string> = {
  en: 'en-US',
  fa: 'fa-u-ca-gregory',
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
