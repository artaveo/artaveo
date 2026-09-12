import { ArrowRight, Check, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { Link as StandaloneLink } from '@/components/ui/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Prose } from '@/components/ui/prose'
import { PackageComparison } from '@/components/services/package-comparison'
import { ServiceAddOns } from '@/components/services/service-addons'
import { WhatDrivesCost } from '@/components/services/what-drives-cost'
import { t, type Locale, type Project, type Service } from '@/types/content'

/**
 * ServiceDetail — the shared `/services/[slug]` template (roadmap § 7.1
 * blueprint, extended in § 7.2 with Packages/Add-ons/What-drives-cost).
 * Every body section reads from an optional field on `Service` and renders
 * only when that field is present, same "empty means hidden" rule
 * `CaseStudy` uses for `/work/[slug]`.
 *
 * Packages/add-ons prices are all `type: 'quote'` right now (§ 7.2, gated
 * by D-04 — still an open owner decision). `PackageComparison` /
 * `ServiceAddOns` render "Ask for a quote" instead of a figure; nothing
 * here needs to change once D-04 resolves except the `Price` values in
 * `lib/services-content.ts`.
 */
export function ServiceDetail({
  service,
  relatedProjects,
}: {
  service: Service
  relatedProjects: Project[]
}) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServiceDetail')
  const tType = useTranslations('ServiceType')
  const tNav = useTranslations('Nav')
  const startHref = `/contact?service=${service.slug}`

  return (
    <article className="container-page py-16 md:py-24">
      <Breadcrumb
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('services'), href: '/services' },
          { label: t(service.title, locale) },
        ]}
        className="mb-10"
      />

      {/* Title + one-line promise */}
      <header>
        {service.type ? (
          <Badge variant="brand-soft" className="mb-6">
            {tType(service.type)}
          </Badge>
        ) : null}

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {t(service.title, locale)}
        </h1>

        {service.tagline ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            {t(service.tagline, locale)}
          </p>
        ) : null}
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16 md:mt-16">
        <div className="lg:col-span-8">
          {/* Who it is for / not for */}
          {service.forWhom?.length || service.notForWhom?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {service.forWhom?.length ? (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    {t18n('forWhom')}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {service.forWhom.map((item) => (
                      <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-text" />
                        <span className="text-pretty">{t(item, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {service.notForWhom?.length ? (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    {t18n('notForWhom')}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {service.notForWhom.map((item) => (
                      <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                        <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="text-pretty text-muted-foreground">{t(item, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <Prose className="mt-10">
            {service.problem ? (
              <section>
                <h2>{t18n('problem')}</h2>
                <p>{t(service.problem, locale)}</p>
              </section>
            ) : null}

            {service.whatIDo?.length ? (
              <section>
                <h2>{t18n('whatIDo')}</h2>
                <ul>
                  {service.whatIDo.map((item) => (
                    <li key={item.en}>{t(item, locale)}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </Prose>

          {/* Included / Not included */}
          {service.included?.length || service.notIncluded?.length ? (
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {service.included?.length ? (
                <div className="bg-card p-5">
                  <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    {t18n('included')}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {service.included.map((item) => (
                      <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-text" />
                        <span className="text-pretty">{t(item, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {service.notIncluded?.length ? (
                <div className="bg-card p-5">
                  <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    {t18n('notIncluded')}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {service.notIncluded.map((item) => (
                      <li key={item.en} className="flex gap-2.5 text-sm leading-relaxed">
                        <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="text-pretty text-muted-foreground">{t(item, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Process */}
          {service.process?.length ? (
            <div className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight text-balance">{t18n('process')}</h2>
              <ol className="mt-5 flex flex-col gap-5">
                {service.process.map((stepItem, index) => (
                  <li key={stepItem.title.en} className="flex gap-4">
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-elevated font-mono text-xs text-brand-text"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium">{t(stepItem.title, locale)}</h3>
                      <p className="mt-1 leading-relaxed text-muted-foreground text-pretty">
                        {t(stepItem.description, locale)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Packages (§ 7.2) */}
          {service.packages?.length ? (
            <>
              <PackageComparison packages={service.packages} serviceSlug={service.slug} />
              {service.whatDrivesCost?.length || service.paymentScheduleNote ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-5">
                  {service.whatDrivesCost?.length ? (
                    <WhatDrivesCost factors={service.whatDrivesCost} />
                  ) : null}
                  {service.paymentScheduleNote ? (
                    <div className={service.whatDrivesCost?.length ? 'mt-6 border-t border-border pt-6' : ''}>
                      <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                        {t18n('paymentSchedule')}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                        {t(service.paymentScheduleNote, locale)}
                      </p>
                      <StandaloneLink
                        href="/process#working-agreement"
                        variant="standalone"
                        showExternalIcon={false}
                        className="mt-2 inline-flex text-sm"
                      >
                        {t18n('paymentScheduleLink')}
                      </StandaloneLink>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {/* Add-ons (§ 7.2) */}
          {service.addOns?.length ? <ServiceAddOns addOns={service.addOns} /> : null}

          {/* What I need from you */}
          {service.requirements?.length ? (
            <Prose className="mt-10">
              <section>
                <h2>{t18n('requirements')}</h2>
                <ul>
                  {service.requirements.map((item) => (
                    <li key={item.en}>{t(item, locale)}</li>
                  ))}
                </ul>
              </section>
            </Prose>
          ) : null}

          {/* Related work */}
          {relatedProjects.length ? (
            <div className="mt-12 border-t border-border pt-10">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {t18n('relatedWork')}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {relatedProjects.map((project) => (
                  <li key={project.slug}>
                    <Link
                      href={`/work/${project.slug}`}
                      className="group inline-flex items-center gap-2 rounded-sm text-lg font-medium outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {t(project.title, locale)}
                      <ArrowRight
                        data-icon="inline-end"
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* FAQ */}
          {service.faq?.length ? (
            <div className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-semibold tracking-tight text-balance">{t18n('faq')}</h2>
              <Accordion className="mt-4" multiple defaultValue={[]}>
                {service.faq.map((item, index) => (
                  <AccordionItem key={item.question.en} value={`faq-${index}`}>
                    <AccordionTrigger>{t(item.question, locale)}</AccordionTrigger>
                    <AccordionPanel>{t(item.answer, locale)}</AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {t18n('deliverables')}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {service.deliverables.map((item) => (
                <li key={item.en} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-[2px] bg-brand" />
                  <span className="text-pretty">{t(item, locale)}</span>
                </li>
              ))}
            </ul>

            {service.timeline ? (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {t18n('timeline')}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty">{t(service.timeline, locale)}</p>
              </div>
            ) : null}

            <div className="mt-6 border-t border-border pt-6">
              <Button className="w-full justify-center" render={<Link href={startHref} />}>
                {t18n('startThisService')}
                <ArrowRight data-icon="inline-end" aria-hidden="true" className="rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}
