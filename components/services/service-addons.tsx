import { useLocale, useTranslations } from 'next-intl'

import { t, type Locale, type Price, type ServiceAddon } from '@/types/content'

function formatAddonPrice(price: Price, tPrice: (key: string) => string): string {
  if (price.type === 'quote' || price.amount == null) return tPrice('quote')
  return `+${price.amount} ${price.currency ?? 'USD'}`
}

/**
 * ServiceAddOns — configurable add-on records (roadmap § 7.2), rendered
 * next to a service's package table. Never a fixed list in the markup:
 * every add-on comes from `Service.addOns`, so a service with no add-ons
 * simply doesn't render this section.
 */
export function ServiceAddOns({ addOns }: { addOns: ServiceAddon[] }) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServiceDetail')
  const tPrice = useTranslations('Price')

  return (
    <div className="mt-10">
      <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {t18n('addOns')}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {addOns.map((addOn) => (
          <li
            key={addOn.id}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <div>
              <p className="font-medium">{t(addOn.title, locale)}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t(addOn.description, locale)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-brand-text">
              {formatAddonPrice(addOn.price, tPrice)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
