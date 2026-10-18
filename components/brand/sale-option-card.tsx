import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { PillLink } from '@/components/brand/pill'
import { formatMoney, hasPrice } from '@/lib/products/money'
import { cn } from '@/lib/utils'
import { t, type Locale, type ProductSaleOption, type ProductService } from '@/types/content'

const CTA_KEY = {
  'purchase-request': 'ctaPurchase',
  'demo-request': 'ctaDemo',
  contact: 'ctaContact',
} as const

/**
 * Phase 28.5 — one way to get a product (§ 14.0 Sale Option Card): its
 * title, its price (or «قیمت بعد از یک گفتگوی کوتاه» when the owner set none
 * — never an invented figure), what is included, maintenance, and its call to
 * action. The owner can highlight one option; it is drawn on ink with a gold
 * edge and an "Artaveo's pick" label. Only published options reach this
 * component (the public content queries drop the rest). Product page only —
 * never Home.
 */
export function SaleOptionCard({ option, href }: { option: ProductSaleOption; href: string }) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const tk = useTranslations('SaleOptionKinds')
  const title = t(option.title, locale) || tk(option.kind)
  const priced = hasPrice(option.price)
  const highlighted = option.highlighted

  const maintenance =
    option.maintenance === 'included'
      ? tr('maintenanceIncluded')
      : option.maintenance === 'optional'
        ? tr('maintenanceOptional', { price: formatMoney(option.maintenancePrice, option.maintenancePeriod ?? null, locale) })
        : tr('maintenanceNone')

  return (
    <article
      data-slot="sale-option-card"
      data-highlighted={highlighted || undefined}
      className={cn(
        'hover-lift relative flex h-full flex-col gap-4 rounded-card-lg border p-6',
        highlighted
          ? 'border-gold bg-paper-foreground text-ink-foreground shadow-card-hover'
          : priced
            ? 'border-paper-line bg-paper-card text-paper-foreground'
            : 'border-dashed border-[#a8a294] bg-paper-card text-paper-foreground',
      )}
    >
      {highlighted ? (
        <span className="absolute -top-3 start-5 rounded-pill bg-gold px-3 py-0.5 text-xs font-extrabold text-gold-foreground">
          {tr('highlighted')}
        </span>
      ) : null}
      <h3 className="text-card-title">{title}</h3>
      <p className={cn('font-black', priced ? 'text-xl' : 'text-base')}>{formatMoney(option.price, option.billingPeriod, locale)}</p>
      {option.summary ? (
        <p className={cn('text-sm', highlighted ? 'text-ink-muted' : 'text-paper-muted')}>{t(option.summary, locale)}</p>
      ) : null}
      {option.included.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {option.included.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check aria-hidden="true" className={cn('mt-1 size-4 shrink-0', highlighted ? 'text-gold' : 'text-gold-deep')} />
              <span>{t(item, locale)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={cn('text-small', highlighted ? 'text-ink-muted' : 'text-paper-muted')}>{maintenance}</p>
      <PillLink href={href} variant={highlighted ? 'gold' : priced ? 'outline' : 'ink'} className="mt-auto w-full">
        {tr(CTA_KEY[option.cta])}
      </PillLink>
    </article>
  )
}

/** Every published way to get a product, in the owner's order; nothing when there is none. */
export function SaleOptionGrid({ options, href }: { options: ProductSaleOption[]; href: (option: ProductSaleOption) => string }) {
  if (options.length === 0) return null
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 pt-3">
      {options.map((option) => (
        <li key={option.id}>
          <SaleOptionCard option={option} href={href(option)} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Phase 28.5 — the after-sales services of a product as chips (§ 14.0
 * After-sales Chips): training, data transfer, hosting, support…, each with
 * its price or "price after a short conversation". Nothing when there is none.
 */
export function AfterSalesChips({ services }: { services: ProductService[] }) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  if (services.length === 0) return null
  return (
    <section className="rounded-card-lg border border-paper-line bg-paper-card p-7 text-paper-foreground" data-slot="after-sales">
      <h3 className="text-card-title">{tr('afterSalesTitle')}</h3>
      <p className="mt-1 text-sm text-paper-muted">{tr('afterSalesLine')}</p>
      <ul className="mt-5 flex flex-wrap gap-2.5">
        {services.map((service) => (
          <li
            key={service.id}
            className="inline-flex flex-wrap items-center gap-x-2.5 rounded-pill bg-paper px-4 py-2.5 text-sm font-semibold"
            title={service.description ? t(service.description, locale) : undefined}
          >
            {t(service.title, locale)}
            <span className="font-medium text-paper-muted">{formatMoney(service.price, service.period, locale)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
