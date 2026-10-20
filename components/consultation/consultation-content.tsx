import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { BandInner, InkBand } from '@/components/brand/bands'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { ConsultationForm } from '@/components/consultation/consultation-form'
import type { Locale } from '@/types/content'

/**
 * The `/consultation` page (§ 15 «گرفتن وقت مشوره», Phase 20; Phase 31.4 in
 * Design System 2.0): the request form on the ink band in a panel that follows
 * the visitor's theme, and beside it what happens next — before the visitor
 * commits anything.
 *
 * Every line beside the form is true of the flow as built: the call is free and
 * up to 30 minutes (D-09's default), the visitor offers the times, nothing is
 * booked until a time is confirmed (the database only allows `confirmed` with
 * a time and details), the confirmation carries a calendar invitation and a
 * private link, and the reply comes the same day (D-08).
 */
export function ConsultationContent({ locale }: { locale: Locale }) {
  const t = useTranslations('ConsultationPage')
  const tNav = useTranslations('Nav')
  const tb = useTranslations('Brand')
  const expectations = ['expect1', 'expect2', 'expect3', 'expect4'] as const

  return (
    <div className="bg-ink">
      <PageHero titleId="consultation-title" trail={[{ href: '/', label: tNav('home') }]} current={tNav('consultation')} eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} className="pb-10 @3xl:pb-12" />
      <InkBand aria-label={t('formLabel')} className="pb-20 @3xl:pb-24" data-slot="consultation-form">
        <BandInner className="grid items-start gap-10 @5xl:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col gap-6 @5xl:sticky @5xl:top-24">
            <div>
              <h2 className="text-card-title">{t('expectTitle')}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {expectations.map((key) => (
                  <li key={key} className="flex gap-3 text-sm text-pretty text-ink-muted">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 border-t border-ink-line pt-6">
              <p className="text-sm text-ink-muted">{t('briefNote')}</p>
              <PillLink href="/start" variant="glass">
                {tb('start')}
              </PillLink>
            </div>
          </div>
          <div className="min-w-0 rounded-panel bg-background p-4 text-foreground @3xl:p-6">
            <ConsultationForm locale={locale} />
          </div>
        </BandInner>
      </InkBand>
    </div>
  )
}
