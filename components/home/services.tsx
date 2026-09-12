import { useLocale, useTranslations } from 'next-intl'

import { Icon } from '@/components/icon'
import { SectionHeader } from '@/components/home/section-header'
import { getAllServices } from '@/lib/services-content'
import { t, type Locale } from '@/types/content'

export function Services() {
  const services = getAllServices()
  const locale = useLocale() as Locale
  const tSection = useTranslations('Services')

  return (
    <section
      aria-labelledby="services-title"
      className="border-y border-border bg-elevated section-y"
    >
      <div className="container-page">
        <SectionHeader
          id="services-title"
          eyebrow={tSection('eyebrow')}
          title={tSection('title')}
          description={tSection('description')}
          action={{ href: '/services', label: tSection('allServices') }}
        />

        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id} className="flex flex-col bg-card p-6 md:p-8">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
              >
                <Icon name={service.icon} className="size-4" />
              </span>

              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                {t(service.title, locale)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t(service.description, locale)}
              </p>

              <div className="mt-auto pt-6">
                <p className="sr-only">{tSection('deliverables')}</p>
                <ul className="flex flex-col gap-2 border-t border-border pt-5">
                  {service.deliverables.map((item) => (
                    <li
                      key={item.en}
                      className="flex items-center gap-2.5 text-sm text-foreground/85"
                    >
                      <span aria-hidden className="h-px w-3 shrink-0 bg-brand" />
                      {t(item, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
