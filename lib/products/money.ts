import { formatCurrency } from '@/lib/format'
import type { BillingPeriod, Locale, Money } from '@/types/content'

/**
 * Phase 27.3 / 27.4 — the one price rule for products, their after-sales services
 * and a service's "from" price (D-21, D-04):
 *
 * - the Dari site shows the Afghani amount, the English site the dollar amount;
 * - when only one amount is set, both sites show that one;
 * - when neither is set, there is no figure — the page says "price after a short
 *   conversation". A price is never invented.
 *
 * Pure functions, so the rule is unit-tested (`tests/unit/products.test.mjs`) and
 * the same everywhere it is shown (product pages, e-mails, the lead pipeline).
 */

export type PickedPrice = { amount: number; currency: 'AFN' | 'USD'; from: boolean }

export function pickPrice(money: Money | null | undefined, locale: Locale): PickedPrice | null {
  if (!money) return null
  const afn = typeof money.afn === 'number' && Number.isFinite(money.afn) ? money.afn : null
  const usd = typeof money.usd === 'number' && Number.isFinite(money.usd) ? money.usd : null
  const from = Boolean(money.from)
  if (locale === 'fa') {
    if (afn != null) return { amount: afn, currency: 'AFN', from }
    if (usd != null) return { amount: usd, currency: 'USD', from }
  } else {
    if (usd != null) return { amount: usd, currency: 'USD', from }
    if (afn != null) return { amount: afn, currency: 'AFN', from }
  }
  return null
}

export function hasPrice(money: Money | null | undefined): boolean {
  return pickPrice(money, 'en') != null
}

/**
 * The words around a price, per language. Kept here rather than in messages/*.json
 * because the same text is used where no translator exists (e-mails, the lead
 * pipeline). The Dari phrase for "no price" is the one D-04 fixes.
 */
const PRICE_WORDS = {
  en: { afterConversation: 'Price after a short conversation', from: 'From', perMonth: 'per month', perYear: 'per year' },
  fa: { afterConversation: 'قیمت بعد از یک گفتگوی کوتاه', from: 'از', perMonth: 'در ماه', perYear: 'در سال' },
} as const

/** «از ۱۵٬۰۰۰ افغانی در ماه», "From $500 per year", or "Price after a short conversation". */
export function formatMoney(money: Money | null | undefined, period: BillingPeriod | null | undefined, locale: Locale): string {
  const words = PRICE_WORDS[locale]
  const picked = pickPrice(money, locale)
  if (!picked) return words.afterConversation
  const amount = formatCurrency(picked.amount, locale, picked.currency)
  const withFrom = picked.from ? `${words.from} ${amount}` : amount
  if (period === 'month') return `${withFrom} ${words.perMonth}`
  if (period === 'year') return `${withFrom} ${words.perYear}`
  return withFrom
}

/** Database columns (`numeric` arrives from the Data API as a number or a string) → `Money`. */
export function moneyFromRow(afn: unknown, usd: unknown, from?: unknown): Money {
  const toNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  const money: Money = {}
  const a = toNumber(afn)
  const u = toNumber(usd)
  if (a !== undefined) money.afn = a
  if (u !== undefined) money.usd = u
  if (from) money.from = true
  return money
}

/**
 * An amount typed by the owner → a stored value, or `null` for "no amount".
 * Refuses negative, non-finite and absurd values (more than 12 digits before the
 * point), and rounds to two decimals — `numeric(14,2)` in the table.
 */
export function cleanAmount(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(n) || n < 0 || n >= 1e12) return 'invalid'
  return Math.round(n * 100) / 100
}
