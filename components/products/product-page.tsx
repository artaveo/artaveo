import { useLocale, useTranslations } from 'next-intl'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { ForwardArrow } from '@/components/brand/brand-icons'
import { CtaBand } from '@/components/brand/cta-band'
import { FeatureGrid } from '@/components/brand/feature-grid'
import { PillLink } from '@/components/brand/pill'
import { ProjectHero } from '@/components/brand/project-hero'
import { AfterSalesChips, SaleOptionGrid } from '@/components/brand/sale-option-card'
import { ScreenGallery } from '@/components/brand/screen-gallery'
import { ProductRequestForm } from '@/components/products/product-request-form'
import { ProjectBlocks, visibleBlocks } from '@/components/work/project-blocks'
import { projectPalette, projectStyle } from '@/lib/design/color'
import { formatMoney } from '@/lib/products/money'
import { REQUEST_ANCHOR, requestHash } from '@/lib/products/request-hash'
import { projectScreens } from '@/lib/products/screens'
import { t, type Locale, type Project } from '@/types/content'

/**
 * Phase 30.1 — a product's own page (§ 15 `/products/[slug]`, § 14.0 Product
 * Page Sections), in the order a buyer asks their questions:
 *
 * 1. the product in its own colours, with its real screens and *Request a
 *    demo* / *Ways to get it*;
 * 2. what it does (its features);
 * 3. the owner's content blocks — features by role, who it is for, the story —
 *    and its screens with one-line captions;
 * 4. **ways to get it**: exactly the published options, as cards, the
 *    highlighted one marked, then the after-sales services;
 * 5. questions (the FAQ blocks);
 * 6. the request form — a demo, or a purchase with the chosen option.
 *
 * Every section is data the owner manages (Content → Projects → Product tab)
 * and is not drawn when empty; a price appears only when the owner set one
 * (D-04), otherwise "price after a short conversation". The product's name is
 * the owner's (D-20); no repository is ever linked (D-19).
 */
export function ProductPage({ product, whatsappHref }: { product: Project; whatsappHref: string | null }) {
  const locale = useLocale() as Locale
  const tp = useTranslations('ProductPage')
  const tb = useTranslations('Brand')
  const tBlock = useTranslations('BlockTypes')
  const tNav = useTranslations('Nav')
  const tk = useTranslations('SaleOptionKinds')
  const style = projectStyle(projectPalette(product.brandColor, product.accentColor))
  const title = t(product.title, locale)
  const hasWays = product.saleOptions.length > 0
  // The features block's own heading, when the owner wrote one; its list is shown in the band below the hero.
  const featureBlock = product.blocks.find((block) => block.type === 'features')
  const faq = visibleBlocks(product).filter((block) => block.type === 'faq')
  const screens = projectScreens(product)
  const bodyBlocks = visibleBlocks(product, ['features', 'faq'])

  const optionHref = (option: Project['saleOptions'][number]) =>
    option.cta === 'demo-request' ? requestHash({ kind: 'product-demo' }) : requestHash({ kind: 'product-purchase', optionId: option.id })

  return (
    <div className="bg-ink" style={style} data-slot="product-page">
      <ProjectHero
        project={product}
        titleId="product-title"
        trail={[
          { href: '/', label: tNav('home') },
          { href: '/products', label: tb('products') },
        ]}
        actions={
          <>
            <PillLink href={requestHash({ kind: 'product-demo' })} variant="project" size="lg">
              {tb('requestDemo')}
            </PillLink>
            {hasWays ? (
              <PillLink href="#ways" variant="glass" size="lg">
                {tp('heroWays')}
              </PillLink>
            ) : null}
            {product.showInPortfolio ? (
              <PillLink href={`/work/${product.slug}`} variant="glass" size="lg">
                {tb('seeProject')}
                <ForwardArrow />
              </PillLink>
            ) : null}
          </>
        }
      />

      {product.features.length > 0 ? (
        <InkBand aria-labelledby="product-features-title" className="py-16 @3xl:py-20">
          <BandInner className="flex flex-col gap-8">
            <SectionHeading id="product-features-title" title={featureBlock?.title ? t(featureBlock.title, locale) : tBlock('features')} />
            <FeatureGrid features={product.features.map((feature) => ({ title: feature }))} />
          </BandInner>
        </InkBand>
      ) : null}

      {bodyBlocks.length > 0 || screens.length > 0 ? (
        <PaperPanel aria-label={title} data-slot="product-content">
          <BandInner className="flex flex-col gap-16">
            <ProjectBlocks project={product} exclude={['features', 'faq']} />
            {screens.length > 0 ? (
              <section aria-labelledby="product-screens-title" className="flex flex-col gap-6">
                <h2 id="product-screens-title" className="text-h2">
                  {tBlock('gallery')}
                </h2>
                <ScreenGallery screens={screens} />
              </section>
            ) : null}
          </BandInner>
        </PaperPanel>
      ) : null}

      {hasWays || product.productServices.length > 0 || faq.length > 0 ? (
        <>
          <div className="h-3" aria-hidden="true" />
          <PaperPanel id="ways" aria-labelledby={hasWays ? 'product-ways-title' : undefined} className="scroll-mt-20" data-slot="product-ways">
            <BandInner className="flex flex-col gap-10">
              {hasWays ? (
                <>
                  <SectionHeading tone="paper" id="product-ways-title" eyebrow={tp('waysEyebrow')} title={tp('waysTitle', { product: title })} lead={tp('waysLead')} />
                  <SaleOptionGrid options={product.saleOptions} href={optionHref} />
                </>
              ) : null}
              <AfterSalesChips services={product.productServices} />
              {faq.length > 0 ? (
                <div className="mt-6">
                  <ProjectBlocks project={{ ...product, blocks: faq }} />
                </div>
              ) : null}
            </BandInner>
          </PaperPanel>
        </>
      ) : null}

      <InkBand id={REQUEST_ANCHOR} aria-labelledby="product-request-title" className="scroll-mt-20 py-16 @3xl:py-24" data-slot="product-request">
        <BandInner className="grid items-start gap-10 @4xl:grid-cols-[0.8fr_1.2fr]">
          <div className="@4xl:sticky @4xl:top-24">
            <SectionHeading id="product-request-title" eyebrow={title} title={tp('requestTitle')} lead={tp('requestLead')} />
          </div>
          <ProductRequestForm
            locale={locale}
            productSlug={product.slug}
            productTitle={title}
            options={product.saleOptions.map((option) => ({
              id: option.id,
              title: t(option.title, locale) || tk(option.kind),
              price: formatMoney(option.price, option.billingPeriod, locale),
            }))}
            services={product.productServices.map((service) => ({
              id: service.id,
              title: t(service.title, locale),
              price: formatMoney(service.price, service.period, locale),
            }))}
          />
        </BandInner>
      </InkBand>

      <InkBand aria-label={tp('questionsTitle')} className="px-4 pb-20">
        <CtaBand
          compact
          headingLevel="h2"
          title={tp('questionsTitle')}
          line={tp('questionsLine')}
          primary={{ href: requestHash({ kind: 'product-demo' }), label: tb('requestDemo') }}
          whatsappHref={whatsappHref}
          whatsappLabel={tb('whatsapp')}
        />
      </InkBand>
    </div>
  )
}
