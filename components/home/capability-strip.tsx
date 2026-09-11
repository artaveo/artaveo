import { Icon } from '@/components/icon'
import { getCapabilities } from '@/lib/home-content'
import { t } from '@/types/content'

/**
 * A quiet band directly under the hero listing what Artaveo covers.
 * Uses the gap-px/border technique from the design system so the dividers
 * stay correct in both LTR and RTL without directional borders.
 */
export function CapabilityStrip() {
  const capabilities = getCapabilities()

  return (
    <section aria-label="Capabilities" className="border-b border-border bg-elevated">
      <div className="container-page">
        <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
          {capabilities.map((item) => (
            <li
              key={item.title.en}
              className="flex items-start gap-3 bg-elevated py-5 sm:px-5 sm:last:col-span-2 lg:py-7 lg:first:ps-0 lg:last:col-span-1 lg:last:pe-0"
            >
              <Icon
                name={item.icon}
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-brand-text"
              />
              <div>
                <p className="text-sm font-medium">{t(item.title)}</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground text-pretty">
                  {t(item.description)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
