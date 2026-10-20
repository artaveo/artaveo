import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { ForwardArrow } from '@/components/brand/brand-icons'
import { CtaBand } from '@/components/brand/cta-band'
import { PillLink } from '@/components/brand/pill'
import { PortfolioList } from '@/components/brand/portfolio-row'
import { ProcessSteps } from '@/components/brand/process-steps'
import { ProductBlockList } from '@/components/brand/product-block'
import { Reveal } from '@/components/brand/reveal'
import { ConsultationTile, ServiceKindGrid } from '@/components/brand/service-card'
import { HomeHero } from '@/components/home/home-hero'
import { PlatformsStrip } from '@/components/home/platforms-strip'
import { Recommendations } from '@/components/home/recommendations'
import { SiteShell } from '@/components/site/site-shell'
import { pickMockupImages } from '@/lib/design/mockups'
import { getFeaturedProjects, getProducts } from '@/lib/home-content-projects'
import { getAllServices } from '@/lib/services-content'
import { productDemoHref, productPageHref, projectHref } from '@/lib/shell-menus'
import { getShellData } from '@/lib/shell-settings-server'
import { whatsappHref } from '@/lib/shell-settings'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { getWayOfWorkingSteps } from '@/lib/way-of-working'
import type { Locale, Project } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Home' })
  const title = t('metaTitle')
  return {
    title: { absolute: title },
    description: t('heroLead'),
    alternates: buildAlternates(locale, ''),
    ...buildPageOpenGraph({ locale, title, description: t('heroLead') }),
  }
}

/** The project whose screens the hero shows: a published product first, then a portfolio project — only one with a real screenshot. */
function heroShowcase(products: Project[], projects: Project[], locale: Locale): Project | null {
  return [...products, ...projects].find((project) => pickMockupImages(project, locale).laptop) ?? null
}

/**
 * Phase 29.2 — Home of Design System 2.0 (§ 14.0, § 14.1, the approved
 * design sample): hero with real mock-ups → platforms strip → products, one
 * block each → work, one row per project → services → the four steps →
 * recommendations (only when there are any) → CTA band. Every section is the
 * owner's data and hides itself when that data is empty (no product
 * published → no Products section and no "See the products" action).
 *
 * Grounds (29.3): the hero, products and CTA are ink bands and the work,
 * services and process sit on warm panels — the same in the light and the
 * dark theme. Ways to get a product never appear here (§ 14.1): they belong
 * on the product page.
 *
 * Removed with this phase: the capability strip, the tech stack, the "one
 * developer" section, the About preview and the Insights preview.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [products, projects, services, shell, th, tr] = await Promise.all([
    getProducts(),
    getFeaturedProjects(),
    getAllServices(),
    getShellData(),
    getTranslations('Home'),
    getTranslations('Brand'),
  ])
  const whatsapp = shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null
  const [steps, tw] = await Promise.all([getWayOfWorkingSteps(), getTranslations('WayOfWorking')])

  return (
    <SiteShell>
      <div className="bg-ink">
        <HomeHero showcase={heroShowcase(products, projects, locale as Locale)} hasProducts={products.length > 0} />
        <PlatformsStrip />

        {products.length > 0 ? (
          <InkBand id="products" aria-labelledby="home-products-title" className="scroll-mt-20 pt-6 pb-20 @3xl:pb-24" data-slot="home-products">
            <BandInner className="flex flex-col gap-10">
              <SectionHeading id="home-products-title" eyebrow={tr('products')} title={th('productsTitle')} lead={th('productsLead')} />
              <ProductBlockList products={products} productHref={productPageHref} demoHref={productDemoHref} />
            </BandInner>
          </InkBand>
        ) : null}

        {projects.length > 0 ? (
          <PaperPanel aria-labelledby="home-work-title" data-slot="home-work">
            <BandInner className="flex flex-col gap-10">
              <SectionHeading
                tone="paper"
                id="home-work-title"
                eyebrow={tr('work')}
                title={th('workTitle')}
                lead={th('workLead')}
                action={
                  <PillLink href="/work" variant="outline">
                    {th('workAll')}
                    <ForwardArrow />
                  </PillLink>
                }
              />
              <Reveal>
                <PortfolioList projects={projects} href={projectHref} />
              </Reveal>
            </BandInner>
          </PaperPanel>
        ) : null}

        <div className="h-3" aria-hidden="true" />

        <PaperPanel aria-labelledby="home-services-title" data-slot="home-services">
          <BandInner className="flex flex-col gap-16">
            {services.length > 0 ? (
              <div className="flex flex-col gap-10">
                <SectionHeading tone="paper" id="home-services-title" eyebrow={tr('services')} title={th('servicesTitle')} lead={th('servicesLead')} />
                <Reveal>
                  <ServiceKindGrid
                    services={services}
                    href={(service) => `/services/${service.slug}`}
                    closingTile={<ConsultationTile title={th('servicesNotSure')} line={th('servicesNotSureLine')} action={th('servicesBookCall')} />}
                  />
                </Reveal>
              </div>
            ) : null}
            <div className="flex flex-col gap-10">
              <SectionHeading tone="paper" id={services.length > 0 ? undefined : 'home-services-title'} eyebrow={tw('eyebrow')} title={tw('title')} />
              <ProcessSteps steps={steps} />
            </div>
          </BandInner>
        </PaperPanel>

        <Recommendations />

        <InkBand aria-label={tr('megaCardTitle')} className="px-4 pt-16 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="home-cta">
          <CtaBand
            title={tr('megaCardTitle')}
            line={tr('megaCardLine')}
            primary={{ href: '/start', label: tr('start') }}
            whatsappHref={whatsapp}
            whatsappLabel={tr('whatsapp')}
          />
        </InkBand>
      </div>
    </SiteShell>
  )
}
