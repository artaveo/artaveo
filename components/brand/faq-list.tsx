import { ChevronDown } from 'lucide-react'
import { useLocale } from 'next-intl'

import { t, type FaqItem, type Locale } from '@/types/content'

/**
 * Questions and answers on the warm panel (§ 14.0 FAQ Accordion) — native
 * `<details>`, so they open by keyboard and without JavaScript. Used by a
 * project's FAQ block, a service's questions and "how working together goes"
 * on /services (Phase 31). Nothing when there are no questions.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  const locale = useLocale() as Locale
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3" data-slot="faq-list">
      {items.map((item, index) => (
        <details key={`${item.question.en}-${index}`} className="group rounded-card border border-paper-line bg-paper-card px-5 open:shadow-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
            {t(item.question, locale)}
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-pretty text-paper-muted">{t(item.answer, locale)}</p>
        </details>
      ))}
    </div>
  )
}
