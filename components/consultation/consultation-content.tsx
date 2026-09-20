import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ConsultationForm } from '@/components/consultation/consultation-form'
import { Link } from '@/components/ui/actions'
import { PageHeader } from '@/components/ui/patterns'
import type { Locale } from '@/types/content'

/**
 * The `/consultation` page (roadmap § 15: "Consultation request", Phase 20).
 * The 8/4 split the Contact page uses: the form takes the wide column, a card
 * on the side says what happens next — before the visitor commits anything.
 *
 * Every statement in the side card is true of the flow as built: the call is
 * free and up to 30 minutes (D-09's default), the visitor offers the times,
 * nothing is booked until the owner confirms (the database only allows
 * `confirmed` with a time and details), the confirmation carries a calendar
 * invitation and a private link, and the reply commitment is D-08's wording.
 */
export function ConsultationContent({ locale }: { locale: Locale }) {
  const t = useTranslations('ConsultationPage')
  const expectations = ['expect1', 'expect2', 'expect3', 'expect4'] as const

  return (
    <div className="container-page py-16 md:py-24">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          <ConsultationForm locale={locale} />
        </div>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t('expectTitle')}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {expectations.map((key) => (
                  <li key={key} className="flex items-start gap-3 text-sm leading-relaxed text-pretty">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-text" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{t('briefNote')}</p>
                <Link href="/start" variant="standalone" showExternalIcon={false} className="mt-2 inline-flex">
                  {t('briefCta')}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
