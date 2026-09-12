import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Icon } from '@/components/icon'
import { Badge } from '@/components/ui/badge'
import { t, type Locale, type Service } from '@/types/content'

/**
 * ServiceCard — the `/services` catalogue tile (roadmap § 7.1). Mirrors
 * `ProjectCard`'s structure (icon/badge header, title link, description,
 * a short list of concrete deliverables) so the catalogue and the work grid
 * read as the same design language.
 */
export function ServiceCard({ service }: { service: Service }) {
  const locale = useLocale() as Locale
  const tServices = useTranslations('ServicesIndex')
  const tType = useTranslations('ServiceType')
  const href = `/services/${service.slug}`
  const titleId = `service-card-${service.slug}`

  return (
    <article aria-labelledby={titleId} className="group flex flex-col rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
        >
          <Icon name={service.icon} className="size-4" />
        </span>
        {service.type ? <Badge variant="muted">{tType(service.type)}</Badge> : null}
      </div>

      <h3 id={titleId} className="mt-5 text-xl font-semibold tracking-tight text-balance">
        <Link
          href={href}
          className="rounded-sm outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t(service.title, locale)}
        </Link>
      </h3>

      <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
        {t(service.description, locale)}
      </p>

      <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-5">
        {service.deliverables.map((item) => (
          <li key={item.en} className="flex items-center gap-2.5 text-sm text-foreground/85">
            <span aria-hidden className="h-px w-3 shrink-0 bg-brand" />
            {t(item, locale)}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Link
          href={href}
          className="group/link inline-flex items-center gap-1.5 rounded-sm text-sm font-medium outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {tServices('viewService')}
          <ArrowRight
            data-icon="inline-end"
            aria-hidden="true"
            className="size-4 transition-transform group-hover/link:translate-x-0.5 rtl:rotate-180 rtl:group-hover/link:-translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  )
}
