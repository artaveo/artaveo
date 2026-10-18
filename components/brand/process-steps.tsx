import { useLocale, useTranslations } from 'next-intl'

import { formatNumber } from '@/lib/format'
import { t, type Locale, type LocalizedText } from '@/types/content'

/**
 * Phase 28.5 — the way of working in four steps, one line each (§ 14.0
 * Process Steps), on the warm panel. An ordered list, so the order is part
 * of what a screen reader announces. Nothing when there are no steps.
 */
export function ProcessSteps({ steps }: { steps: { title: LocalizedText; line: LocalizedText }[] }) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  if (steps.length === 0) return null
  return (
    <ol className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4" data-slot="process-steps">
      {steps.map((step, index) => (
        <li key={index} className="rounded-card-lg border border-paper-line bg-paper-card p-6 text-paper-foreground">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-paper-foreground text-base font-extrabold text-gold">
            {formatNumber(index + 1, locale)}
          </span>
          <span className="sr-only">{tr('step', { n: index + 1 })}</span>
          <p className="mt-3.5 text-card-title">{t(step.title, locale)}</p>
          <p className="mt-1 text-sm leading-relaxed text-paper-muted">{t(step.line, locale)}</p>
        </li>
      ))}
    </ol>
  )
}
