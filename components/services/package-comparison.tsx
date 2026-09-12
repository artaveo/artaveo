'use client'

import { Check, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { t, type Locale, type Price, type ServicePackage } from '@/types/content'

function formatPrice(price: Price, locale: Locale, tPrice: (key: string) => string): string {
  if (price.type === 'quote') return tPrice('quote')
  if (price.amount == null) return tPrice('quote')
  const formatted = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency: price.currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(price.amount)
  return price.type === 'from' ? `${tPrice('from')} ${formatted}` : formatted
}

function TierBody({
  pkg,
  startHref,
  formatted,
}: {
  pkg: ServicePackage
  startHref: string
  formatted: string
}) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServiceDetail')

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t(pkg.name, locale)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
        {t(pkg.summary, locale)}
      </p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{formatted}</p>
      {pkg.deliveryDays ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t18n('deliveryDaysValue', { min: pkg.deliveryDays.min, max: pkg.deliveryDays.max })}
        </p>
      ) : null}

      <ul className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5">
        {pkg.included.map((item) => (
          <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-text" />
            <span className="text-pretty">{t(item, locale)}</span>
          </li>
        ))}
        {pkg.notIncluded.map((item) => (
          <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
            <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-pretty text-muted-foreground">{t(item, locale)}</span>
          </li>
        ))}
      </ul>

      <Button className="mt-6 w-full justify-center" render={<Link href={startHref} />}>
        {t18n('choosePackage')}
      </Button>
    </div>
  )
}

/**
 * PackageComparison — the § 7.2 package table. Real `<table>` semantics on
 * desktop; on mobile, a sticky tier switcher plus one tier's full card at a
 * time (§ 7.2: "mobile: stacked cards with a sticky tier switcher") rather
 * than dumping all three tiers' full feature lists one after another.
 *
 * Both renders read the same `packages` array — nothing tier-specific is
 * hard-coded here, so a service with two tiers or five works unchanged.
 */
export function PackageComparison({
  packages,
  serviceSlug,
}: {
  packages: ServicePackage[]
  serviceSlug: string
}) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServiceDetail')
  const tPrice = useTranslations('Price')
  const [activeId, setActiveId] = useState<string | undefined>(packages[0]?.id)
  const activePkg = packages.find((pkg) => pkg.id === activeId) ?? packages[0]

  if (!activePkg) return null

  return (
    <div className="mt-12 border-t border-border pt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-balance">{t18n('packages')}</h2>

      {/* Mobile: sticky tier switcher + one tier's full card */}
      <div className="mt-5 md:hidden">
        <SegmentedControl
          value={activeId ? [activeId] : []}
          onValueChange={(value) => setActiveId(value[0] as string)}
          className="sticky top-16 z-10 w-full bg-background shadow-sm"
        >
          {packages.map((pkg) => (
            <SegmentedControlItem key={pkg.id} value={pkg.id} className="flex-1">
              {t(pkg.name, locale)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <div className="mt-4">
          <TierBody
            pkg={activePkg}
            startHref={`/contact?service=${serviceSlug}&package=${activePkg.id}`}
            formatted={formatPrice(activePkg.price, locale, tPrice)}
          />
        </div>
      </div>

      {/* Desktop: real table semantics, one column per tier */}
      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-separate border-spacing-x-4">
          <caption className="sr-only">{t18n('packages')}</caption>
          <thead>
            <tr>
              {packages.map((pkg) => (
                <th key={pkg.id} scope="col" className="w-1/3 pb-2 text-start align-bottom">
                  <span className="text-lg font-semibold tracking-tight">{t(pkg.name, locale)}</span>
                  <p className="mt-1 text-sm font-normal leading-relaxed text-muted-foreground text-pretty">
                    {t(pkg.summary, locale)}
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight">
                    {formatPrice(pkg.price, locale, tPrice)}
                  </p>
                  {pkg.deliveryDays ? (
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      {t18n('deliveryDaysValue', { min: pkg.deliveryDays.min, max: pkg.deliveryDays.max })}
                    </p>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {packages.map((pkg) => (
                <td key={pkg.id} className="align-top">
                  <ul className="flex flex-col gap-2.5 rounded-t-xl border border-b-0 border-border bg-card p-5">
                    {pkg.included.map((item) => (
                      <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-text" />
                        <span className="text-pretty">{t(item, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr>
              {packages.map((pkg) => (
                <td key={pkg.id} className="align-top">
                  {pkg.notIncluded.length ? (
                    <>
                      <span className="sr-only">{t18n('notIncluded')}</span>
                      <ul className="flex flex-col gap-2.5 border-x border-border bg-card p-5">
                        {pkg.notIncluded.map((item) => (
                          <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                            <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span className="text-pretty text-muted-foreground">{t(item, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="border-x border-border bg-card p-5" />
                  )}
                </td>
              ))}
            </tr>
            <tr>
              {packages.map((pkg) => (
                <td key={pkg.id} className="align-top">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-5">
                    <Button
                      className="w-full justify-center"
                      render={<Link href={`/contact?service=${serviceSlug}&package=${pkg.id}`} />}
                    >
                      {t18n('choosePackage')}
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
