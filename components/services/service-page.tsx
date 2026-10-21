import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { ServiceKindIcon } from '@/components/brand/brand-icons'
import { CtaBand } from '@/components/brand/cta-band'
import { FaqList } from '@/components/brand/faq-list'
import { FeatureGrid } from '@/components/brand/feature-grid'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { PortfolioList } from '@/components/brand/portfolio-row'
import { ProcessSteps } from '@/components/brand/process-steps'
import { Reveal } from '@/components/brand/reveal'
import { ServiceKindGrid } from '@/components/brand/service-card'
import { WhatsAppIcon } from '@/components/brand/whatsapp-icon'
import { formatPackagePrice } from '@/lib/pricing'
import { formatMoney, hasPrice } from '@/lib/products/money'
import { projectHref } from '@/lib/shell-menus'
import type { WayOfWorkingStep } from '@/lib/way-of-working'
import { t, type Locale, type Project, type Service } from '@/types/content'

/**
 * Phase 31.1 — one service, by kind of software (§ 15 `/services/[service]`),
 * in the order a customer asks: what is it and what does it cost (hero with
 * the "from" price only when the owner set one — D-04), what you get, work of
 * this kind (published projects the owner linked), how it goes in four steps
 * (the service's own steps, or the general four), packages when the owner
 * turned them on, questions, and the call to action. Every section is the
 * owner's data (Content → Services) and is not drawn when empty.
 */
export function ServicePage({
  service,
  relatedProjects,
  otherServices,
  generalSteps,
  whatsappHref,
}: {
  service: Service
  relatedProjects: Project[]
  otherServices: Service[]
  generalSteps: WayOfWorkingStep[]
  whatsappHref: string | null
}) {
  const locale = useLocale() as Locale
  const ts = useTranslations('ServiceDetail')
  const tb = useTranslations('Brand')
  const tNav = useTranslations('Nav')
  const tk = useTranslations('ServiceKinds')
  const tPrice = useTranslations('Price')
  const title = t(service.title, locale)
  const startHref = `/start?service=${service.slug}`
  const steps = service.process?.length ? service.process.map((step) => ({ title: step.title, line: step.description })) : generalSteps

  return (
    <div className="bg-ink" data-slot="service-page">
      <PageHero
        titleId="service-title"
        trail={[
          { href: '/', label: tNav('home') },
          { href: '/services', label: tb('services') },
        ]}
        current={title}
        eyebrow={service.kind ? tk(service.kind) : undefined}
        title={title}
        lead={t(service.tagline ?? service.description, locale)}
        actions={
          <>
            <PillLink href={startHref} variant="gold" size="lg">
              {ts('start')}
            </PillLink>
            {whatsappHref ? (
              <PillLink href={whatsappHref} variant="glass" size="lg" external>
                <WhatsAppIcon className="text-whatsapp-glyph" />
                {tb('whatsapp')}
              </PillLink>
            ) : null}
          </>
        }
        aside={
          <div className="glass flex flex-col gap-4 rounded-card-lg border border-glass-line p-7 text-glass-foreground">
            <span className="grid size-14 place-items-center rounded-2xl bg-gold/15 text-gold">
              <ServiceKindIcon kind={service.kind} className="size-6" />
            </span>
            <div>
              <p className="text-small font-bold text-glass-muted">{ts('priceLabel')}</p>
              <p className="mt-1 text-h3">{formatMoney(hasPrice(service.fromPrice) ? { ...service.fromPrice, from: true } : null, 'once', locale)}</p>
              <p className="mt-2 text-sm text-glass-muted">{ts(hasPrice(service.fromPrice) ? 'priceLineFrom' : 'priceLineQuote')}</p>
            </div>
          </div>
        }
      />

      {service.deliverables.length > 0 ? (
        <InkBand aria-labelledby="service-get-title" className="pb-16 @3xl:pb-20" data-slot="service-deliverables">
          <BandInner className="flex flex-col gap-8">
            <SectionHeading id="service-get-title" title={ts('whatYouGet')} />
            <FeatureGrid features={service.deliverables.map((item) => ({ title: item }))} />
          </BandInner>
        </InkBand>
      ) : null}

      <PaperPanel aria-label={title} data-slot="service-content">
        <BandInner className="flex flex-col gap-20">
          {relatedProjects.length > 0 ? (
            <section aria-labelledby="service-work-title" className="flex flex-col gap-10">
              <SectionHeading tone="paper" id="service-work-title" eyebrow={tb('work')} title={ts('relatedWork')} />
              <Reveal>
                <PortfolioList projects={relatedProjects} href={projectHref} headingLevel="h3" />
              </Reveal>
            </section>
          ) : null}

          <section aria-labelledby="service-process-title" className="flex flex-col gap-10">
            <SectionHeading tone="paper" id="service-process-title" eyebrow={ts('processEyebrow')} title={ts('processTitle')} />
            <ProcessSteps steps={steps} />
          </section>

          {service.packages?.length ? (
            <section aria-labelledby="service-packages-title" className="flex flex-col gap-10">
              <SectionHeading tone="paper" id="service-packages-title" title={ts('packages')} />
              <ul className="grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
                {service.packages.map((pkg) => (
                  <li key={pkg.id} className="flex flex-col gap-4 rounded-card-lg border border-paper-line bg-paper-card p-7 shadow-card">
                    <div>
                      <h3 className="text-card-title">{t(pkg.name, locale)}</h3>
                      <p className="mt-1.5 text-sm text-pretty text-paper-muted">{t(pkg.summary, locale)}</p>
                    </div>
                    <p className="text-h3">{formatPackagePrice(pkg.price, locale, tPrice)}</p>
                    {pkg.included.length > 0 ? (
                      <ul className="flex flex-col gap-2 border-t border-paper-line pt-4">
                        {pkg.included.map((item) => (
                          <li key={item.en} className="flex gap-2.5 text-sm">
                            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                            <span className="min-w-0 text-pretty">{t(item, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <PillLink href={`${startHref}&package=${pkg.id}`} variant="ink" className="mt-auto self-start">
                      {ts('choosePackage')}
                    </PillLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.faq?.length ? (
            <section aria-labelledby="service-faq-title" className="grid gap-10 @4xl:grid-cols-[0.8fr_1.2fr]">
              <SectionHeading tone="paper" id="service-faq-title" title={ts('faq')} />
              <FaqList items={service.faq} />
            </section>
          ) : null}

          {otherServices.length > 0 ? (
            <section aria-labelledby="service-others-title" className="flex flex-col gap-10">
              <SectionHeading
                tone="paper"
                id="service-others-title"
                title={ts('otherServices')}
                action={
                  <PillLink href="/services" variant="outline">
                    {tb('allServices')}
                  </PillLink>
                }
              />
              <ServiceKindGrid services={otherServices} href={(other) => `/services/${other.slug}`} />
            </section>
          ) : null}
        </BandInner>
      </PaperPanel>

      <InkBand aria-label={tb('megaCardTitle')} className="px-4 pt-16 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="service-cta">
        <CtaBand
          title={tb('megaCardTitle')}
          line={tb('megaCardLine')}
          primary={{ href: startHref, label: ts('start') }}
          whatsappHref={whatsappHref}
          whatsappLabel={tb('whatsapp')}
        />
      </InkBand>
    </div>
  )
}
