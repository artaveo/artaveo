import { Check } from 'lucide-react'
import { useLocale } from 'next-intl'

import { t, type Locale, type LocalizedText } from '@/types/content'

/**
 * Phase 28.5 — a product's features as tiles on an ink band (§ 14.0 Feature
 * Grid). Features only: no unrelated tile (a price, a licence, a "contact us")
 * is ever mixed in. Each tile can carry one explaining line. Nothing when
 * there are no features.
 */
export function FeatureGrid({ features }: { features: { title: LocalizedText; line?: LocalizedText }[] }) {
  const locale = useLocale() as Locale
  if (features.length === 0) return null
  return (
    <ul className="grid gap-3.5 @2xl:grid-cols-2 @5xl:grid-cols-3" data-slot="feature-grid">
      {features.map((feature, index) => (
        <li key={index} className="flex gap-3.5 rounded-card-lg border border-ink-line bg-white/4 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-project-accent/15 text-project-accent-text">
            <Check aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block text-card-title">{t(feature.title, locale)}</span>
            {feature.line ? <span className="mt-0.5 block text-sm text-ink-muted">{t(feature.line, locale)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
