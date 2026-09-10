import { Icon } from '@/components/icon'
import { SectionHeader } from '@/components/home/section-header'
import { getServices } from '@/lib/home-content'
import { t } from '@/types/content'

export function Services() {
  const services = getServices()

  return (
    <section
      aria-labelledby="services-title"
      className="border-y border-border bg-elevated py-20 md:py-28"
    >
      <div className="container-page">
        <SectionHeader
          id="services-title"
          eyebrow="Services"
          title="What Artaveo builds"
          description="From a single website to a complete business platform — each service covers design, development and delivery."
          action={{ href: '/services', label: 'All services' }}
        />

        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id} className="flex flex-col bg-card p-6 md:p-8">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-brand"
              >
                <Icon name={service.icon} className="size-4" />
              </span>

              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                {t(service.title)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t(service.description)}
              </p>

              <div className="mt-auto pt-6">
                <p className="sr-only">Deliverables</p>
                <ul className="flex flex-col gap-2 border-t border-border pt-5">
                  {service.deliverables.map((item) => (
                    <li
                      key={item.en}
                      className="flex items-center gap-2.5 text-sm text-foreground/85"
                    >
                      <span aria-hidden className="h-px w-3 shrink-0 bg-brand" />
                      {t(item)}
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
