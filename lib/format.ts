import type { Locale } from '@/types/content'

/**
 * Locale formatting for everything a person reads. D-03 (revision 45): the
 * Dari site uses the **Solar Hijri calendar with Afghan month names** (حمل،
 * ثور، جوزا … حوت) and Persian digits; the English site uses Gregorian.
 * Latin digits stay confined to code, IDs and technical values, never routed
 * through these helpers.
 *
 * `fa-AF-u-ca-persian`: `fa-AF` is what gives the Afghan month names (plain
 * `fa` gives the Iranian ones — مهر, not میزان); the `-u-ca-persian`
 * extension states the calendar instead of relying on the locale default.
 * Until Phase 26 this was `fa-u-ca-gregory` (Gregorian dates with Iranian
 * month names, «سپتامبر»), which was the old D-03.
 *
 * Use `formatDate` — never a bare `toLocaleDateString(locale)` or
 * `new Intl.DateTimeFormat('fa…')` — for anything user-visible.
 */
const intlTag: Record<Locale, string> = {
  en: 'en-US',
  fa: 'fa-AF-u-ca-persian',
}

const TEXT_MONTHS = new Set(['short', 'long', 'narrow'])
const TIME_OPTIONS = ['hour', 'minute', 'second', 'fractionalSecondDigits', 'dayPeriod', 'hour12', 'hourCycle', 'timeZoneName'] as const

/** ICU's `fa-AF` writes the sixth month «سنبلهٔ» (with the ezafe mark); on its own, Dari writes «سنبله». */
function dariMonth(name: string): string {
  return name.replace(/ٔ$/, '')
}

/**
 * Dari dates read weekday → day → month → year («پنجشنبه ۲ میزان ۱۴۰۵»), with
 * the time after «، ». ICU's own `fa-AF` patterns put the year first for some
 * option sets and use a Latin comma, so a date with a written month is
 * assembled from its parts. A numeric month («۱۴۰۵/۷/۲۵») is left as ICU
 * writes it.
 */
function formatDariDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  if (options.dateStyle || options.timeStyle || (options.month && !TEXT_MONTHS.has(options.month))) {
    return new Intl.DateTimeFormat(intlTag.fa, options).format(date).replace(/,/g, '،')
  }

  const timeOptions: Intl.DateTimeFormatOptions = { timeZone: options.timeZone }
  let hasTime = false
  for (const key of TIME_OPTIONS) {
    if (options[key] !== undefined) {
      Object.assign(timeOptions, { [key]: options[key] })
      if (key !== 'hour12' && key !== 'hourCycle') hasTime = true
    }
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: options.timeZone,
    weekday: options.weekday,
    day: options.day,
    month: options.month,
    year: options.year,
    era: options.era,
  }
  const hasDate = Boolean(dateOptions.weekday || dateOptions.day || dateOptions.month || dateOptions.year)

  let datePart = ''
  if (hasDate) {
    const parts = new Intl.DateTimeFormat(intlTag.fa, dateOptions).formatToParts(date)
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
    const month = value('month')
    datePart = [value('weekday'), value('day'), month && dariMonth(month), value('year'), value('era')]
      .filter(Boolean)
      .join(' ')
  }
  const timePart = hasTime ? new Intl.DateTimeFormat(intlTag.fa, timeOptions).format(date) : ''

  return datePart && timePart ? `${datePart}، ${timePart}` : datePart || timePart
}

export function formatDate(iso: string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const merged: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }
  const date = new Date(iso)
  return locale === 'fa' ? formatDariDate(date, merged) : new Intl.DateTimeFormat(intlTag.en, merged).format(date)
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlTag[locale], options).format(value)
}

/**
 * On the Dari site the two currencies a price can be in (D-21) are written as
 * words after the amount — «۱۵٬۰۰۰ افغانی», «۵۰۰ دالر» — the way Afghan
 * businesses write them, not as «؋» or «$». Any other currency falls back to
 * `Intl`'s own form.
 */
const DARI_CURRENCY_NAMES: Record<string, string> = {
  AFN: 'افغانی',
  USD: 'دالر',
}

export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  const dariName = locale === 'fa' ? DARI_CURRENCY_NAMES[currency.toUpperCase()] : undefined
  if (dariName) {
    return `${formatNumber(value, 'fa', { maximumFractionDigits: 0, ...options })} ${dariName}`
  }
  return new Intl.NumberFormat(intlTag[locale], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}
