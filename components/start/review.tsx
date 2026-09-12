'use client'

import { useTranslations } from 'next-intl'

import { buildInquirySummaryLines } from '@/lib/inquiry-summary'
import type { Locale } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'

/**
 * ReviewStep — the "final Brief Summary screen before submit" roadmap §
 * 9.1 calls for. Read-only recap; the wizard's own Back button (same one
 * used on every other step) returns here to Contact to fix an answer, so
 * this step doesn't need a second, redundant edit affordance.
 */
export function ReviewStep({ draft, locale }: { draft: InquiryDraft; locale: Locale }) {
  const t18n = useTranslations('BriefBuilder')
  const lines = buildInquirySummaryLines(draft, locale)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('reviewStepTitle')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          {t18n('reviewStepDescription')}
        </p>
      </div>

      <dl className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {line.label}
              </dt>
              {/* `dir="auto"` (not `LatinTerm`): these values are free text or
                  contact details the visitor typed, which may themselves be
                  Persian — unlike a fixed Latin technical term, forcing LTR
                  here would be wrong. `auto` still keeps embedded numbers/URLs
                  from being reordered inside an RTL sentence. */}
              <dd dir="auto" className="mt-1 text-sm leading-relaxed text-pretty">
                {line.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
