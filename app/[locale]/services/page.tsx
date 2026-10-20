import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { CtaBand } from '@/components/brand/cta-band'
import { FaqList } from '@/components/brand/faq-list'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { ProcessSteps } from '@/components/brand/process-steps'
import { Reveal } from '@/components/brand/reveal'
import { ConsultationTile, ServiceKindGrid } from '@/components/brand/service-card'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { getAllServices, getGlobalFaqs } from '@/lib/services-content'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from '@/lib/structured-data'
import { getWayOfWorkingSteps } from '@/lib/way-of-working'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ServicesIndex' })
  return {
    title: t('metaTitle'),
    description: t('lead'),
    alternates: buildAlternates(locale, '/services'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('lead'), eyebrow: t('eyebrow') }),
  }
}

/**
 * Phase 31 — `/[locale]/services` (§ 15 "Services (incl. the four-step
 * process)"): the services by kind of software (31.1), then the way of
 * working in four steps (`#process` — the old /process page redirects here,
 * 31.2), then "how working together goes" — payment, ownership, handover,
 * changes, after launch — as short questions from the admin's global FAQs
 * (`#working-together`; the details live in each project's agreement, § 16.1
 * rule 9), and the CTA band. Every section hides itself when its data is empty.
 */
export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [services, faqs, steps, shell, t, tw, tb, tNav, th] = await Promise.all([
    getAllServices(),
    getGlobalFaqs(),
    getWayOfWorkingSteps(),
    getShellData(),
    getTranslations('ServicesIndex'),
    getTranslations('WayOfWorking'),
    getTranslations('Brand'),
    getTranslations('Nav'),
    getTranslations('Home'),
  ])
  const whatsapp = shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('metaTitle'), path: '/services' },
        ])}
      />
      {faqs.length > 0 ? <JsonLd data={buildFaqPageJsonLd(locale as Locale, faqs)} /> : null}
      <div className="bg-ink">
        <PageHero
          titleId="services-title"
          trail={[{ href: '/', label: tNav('home') }]}
          current={tb('services')}
          eyebrow={t('eyebrow')}
          title={t('title')}
          lead={t('lead')}
          actions={
            <>
              <PillLink href="/start" variant="gold" size="lg">
                {tb('start')}
              </PillLink>
              <PillLink href="#process" variant="glass" size="lg">
                {tw('eyebrow')}
              </PillLink>
            </>
          }
        />

        {services.length > 0 ? (
          <PaperPanel aria-labelledby="services-kinds-title" data-slot="services-kinds">
            <BandInner className="flex flex-col gap-10">
              <SectionHeading tone="paper" id="services-kinds-title" eyebrow={t('kindsEyebrow')} title={t('kindsTitle')} lead={t('kindsLead')} />
              <Reveal>
                <ServiceKindGrid
                  services={services}
                  href={(service) => `/services/${service.slug}`}
                  closingTile={<ConsultationTile title={th('servicesNotSure')} line={th('servicesNotSureLine')} action={th('servicesBookCall')} />}
                />
              </Reveal>
            </BandInner>
          </PaperPanel>
        ) : null}

        <div className="h-3" aria-hidden="true" />

        <PaperPanel data-slot="services-process">
          <BandInner className="flex flex-col gap-20">
            <section id="process" aria-labelledby="services-process-title" className="flex scroll-mt-24 flex-col gap-10">
              <SectionHeading tone="paper" id="services-process-title" eyebrow={tw('eyebrow')} title={tw('title')} lead={tw('lead')} />
              <ProcessSteps steps={steps} />
            </section>

            {faqs.length > 0 ? (
              <section id="working-together" aria-labelledby="services-together-title" className="grid scroll-mt-24 gap-10 @4xl:grid-cols-[0.8fr_1.2fr]">
                <SectionHeading tone="paper" id="services-together-title" eyebrow={t('togetherEyebrow')} title={t('togetherTitle')} lead={t('togetherLead')} />
                <FaqList items={faqs} />
              </section>
            ) : null}
          </BandInner>
        </PaperPanel>

        <InkBand aria-label={tb('megaCardTitle')} className="px-4 pt-16 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="services-cta">
          <CtaBand
            title={tb('megaCardTitle')}
            line={tb('megaCardLine')}
            primary={{ href: '/start', label: tb('start') }}
            whatsappHref={whatsapp}
            whatsappLabel={tb('whatsapp')}
          />
        </InkBand>
      </div>
    </SiteShell>
  )
}
