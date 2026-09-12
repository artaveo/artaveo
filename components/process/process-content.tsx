import { Fragment } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Icon } from '@/components/icon'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { CTASection, FeatureList, PageHeader } from '@/components/ui/patterns'
import { getProcessPhases, getQualityCommitments, getWorkingAgreementItems } from '@/lib/about-content'
import { t, type Locale } from '@/types/content'

/**
 * ProcessContent — the `/process` page (roadmap § 8.1 + § 8.2), matching
 * the page map's "Process + engagement models + working agreement" (§ 15)
 * — one route, not three. The canonical 8-phase process (Discover ·
 * Define · Design · Architect · Build · Test · Launch · Support), each
 * expandable to its five dimensions, then the Quality baseline (§ 8.1),
 * then the Working Agreement (§ 8.2: communication, response commitment,
 * payment, ownership, handover, warranty & change requests,
 * confidentiality). Engagement models and pricing stay on `/services`
 * (§ 7.2) — this page links out rather than duplicating them.
 */
export function ProcessContent() {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ProcessPage')
  const phases = getProcessPhases()
  const qualityCommitments = getQualityCommitments()
  const workingAgreementItems = getWorkingAgreementItems()

  const qualityItems = qualityCommitments.map((item) => ({
    id: item.title.en,
    icon: (props: { className?: string }) => <Icon name={item.icon} {...props} />,
    title: t(item.title, locale),
    description: t(item.description, locale),
  }))

  return (
    <Fragment>
      <div className="container-page py-16 md:py-24">
        <PageHeader eyebrow={t18n('eyebrow')} title={t18n('title')} description={t18n('description')} />

        {/* The 8-phase process */}
        <Accordion multiple defaultValue={[]}>
          {phases.map((phase, index) => (
            <AccordionItem key={phase.id} value={phase.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
                  >
                    <Icon name={phase.icon} className="size-4" />
                  </span>
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-mono text-xs text-brand-text" dir="ltr">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base">{t(phase.title, locale)}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <div className="grid gap-6 ps-13 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground/80 uppercase">
                      {t18n('purpose')}
                    </h3>
                    <p className="mt-1.5 text-pretty">{t(phase.purpose, locale)}</p>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground/80 uppercase">
                      {t18n('activities')}
                    </h3>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {phase.activities.map((activity) => (
                        <li key={activity.en} className="flex gap-2.5">
                          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                          <span className="text-pretty">{t(activity, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground/80 uppercase">
                      {t18n('output')}
                    </h3>
                    <p className="mt-1.5 text-pretty">{t(phase.output, locale)}</p>
                  </div>

                  <div>
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground/80 uppercase">
                      {t18n('clientInvolvement')}
                    </h3>
                    <p className="mt-1.5 text-pretty">{t(phase.clientInvolvement, locale)}</p>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground/80 uppercase">
                      {t18n('decisionsAndRisks')}
                    </h3>
                    <p className="mt-1.5 text-pretty">{t(phase.decisionsAndRisks, locale)}</p>
                  </div>
                </div>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Quality baseline */}
        <div className="mt-16 border-t border-border pt-16 md:mt-24 md:pt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {t18n('qualityTitle')}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
            {t18n('qualityDescription')}
          </p>
          <FeatureList items={qualityItems} className="mt-8" />
        </div>

        {/* Bridge to engagement models & pricing (already live on /services) */}
        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t18n('engagementModelsNote')}
        </div>

        {/* Working Agreement (§ 8.2) */}
        <div id="working-agreement" className="mt-16 scroll-mt-24 border-t border-border pt-16 md:mt-24 md:pt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {t18n('agreementTitle')}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
            {t18n('agreementDescription')}
          </p>

          <Accordion multiple defaultValue={[]} className="mt-8">
            {workingAgreementItems.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
                    >
                      <Icon name={item.icon} className="size-4" />
                    </span>
                    <span className="text-base">{t(item.title, locale)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel>
                  <div className="ps-13">
                    <p className="text-pretty">{t(item.summary, locale)}</p>
                    {item.points?.length ? (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {item.points.map((point) => (
                          <li key={point.en} className="flex gap-2.5">
                            <span
                              aria-hidden
                              className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
                            />
                            <span className="text-pretty">{t(point, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <CTASection
        title={t18n('ctaTitle')}
        description={t18n('ctaDescription')}
        primaryAction={{ href: '/contact', label: t18n('ctaPrimary') }}
        secondaryAction={{ href: '/services', label: t18n('ctaSecondary') }}
      />
    </Fragment>
  )
}
