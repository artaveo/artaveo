import { useLocale } from 'next-intl'
import type * as React from 'react'

import { ServiceKindIcon } from '@/components/brand/brand-icons'
import { Link } from '@/i18n/navigation'
import { formatMoney, hasPrice } from '@/lib/products/money'
import { t, type Locale, type Service } from '@/types/content'

/**
 * Phase 28.5 — one service on the warm panel (§ 14.0 Service Card): the kind
 * of software's icon, the title, a one-line promise and the "from" price —
 * only when the owner set one (D-04: a price is never invented). The whole
 * card is the link; it lifts on hover.
 */
export function ServiceKindCard({ service, href }: { service: Service; href: string }) {
  const locale = useLocale() as Locale
  const promise = service.tagline ? t(service.tagline, locale) : t(service.description, locale)
  return (
    <Link
      href={href}
      className="hover-lift flex h-full flex-col gap-2.5 rounded-card-lg border border-paper-line bg-paper-card p-7 text-paper-foreground outline-none hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/60"
      data-slot="service-card"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-paper-foreground text-gold">
        <ServiceKindIcon kind={service.kind} className="size-5" />
      </span>
      <span className="mt-1 text-card-title">{t(service.title, locale)}</span>
      <span className="text-sm leading-relaxed text-paper-muted">{promise}</span>
      {hasPrice(service.fromPrice) ? (
        <span className="mt-auto pt-2 text-small font-semibold text-paper-foreground">{formatMoney({ ...service.fromPrice, from: true }, 'once', locale)}</span>
      ) : null}
    </Link>
  )
}

/** Services in a grid of up to three; nothing when there are none. An optional last tile (e.g. a consultation card) can close the grid. */
export function ServiceKindGrid({
  services,
  href,
  closingTile,
}: {
  services: Service[]
  href: (service: Service) => string
  closingTile?: React.ReactNode
}) {
  if (services.length === 0) return null
  return (
    <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {services.map((service) => (
        <li key={service.id}>
          <ServiceKindCard service={service} href={href(service)} />
        </li>
      ))}
      {closingTile ? <li>{closingTile}</li> : null}
    </ul>
  )
}
