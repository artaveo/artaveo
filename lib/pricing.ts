import type { Locale, Price } from '@/types/content'

/**
 * Price display rules (roadmap § 7.2), moved out of the two client components
 * that used to each hold a private copy so they can be unit-tested (Phase 21).
 * Behaviour is unchanged.
 *
 * The rule that matters: a price is only ever shown as a figure when it is
 * one the owner approved — i.e. `type` is `'from'` or `'fixed'` AND an
 * `amount` exists. Everything else (`'quote'`, or a figure-typed price with
 * no amount, which is a data error) renders as the honest "Ask for a quote"
 * label. D-04 is still open, so today every price on the site is `'quote'`.
 *
 * `tPrice` is the `Price` namespace translator: keys `quote` and `from`.
 */
type PriceTranslator = (key: string) => string

export function formatPackagePrice(price: Price, locale: Locale, tPrice: PriceTranslator): string {
  if (price.type === 'quote') return tPrice('quote')
  if (price.amount == null) return tPrice('quote')
  const formatted = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency: price.currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(price.amount)
  return price.type === 'from' ? `${tPrice('from')} ${formatted}` : formatted
}

export function formatAddonPrice(price: Price, tPrice: PriceTranslator): string {
  if (price.type === 'quote' || price.amount == null) return tPrice('quote')
  return `+${price.amount} ${price.currency ?? 'USD'}`
}
