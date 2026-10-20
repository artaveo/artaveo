import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BandInner, InkBand, SectionHeading } from '@/components/brand/bands'
import { CtaBand } from '@/components/brand/cta-band'
import { ProductBlockList } from '@/components/brand/product-block'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { getProducts } from '@/lib/home-content-projects'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { productDemoHref, productPageHref } from '@/lib/shell-menus'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ProductsPage' })
  return {
    title: t('metaTitle'),
    description: t('lead'),
    alternates: buildAlternates(locale, '/products'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('lead') }),
  }
}

/**
 * Phase 30.1 — `/[locale]/products`: every published product as its own block
 * (§ 2.24), image side alternating. While no product is published there is no
 * such page (404) and no link to it anywhere (`lib/shell-menus.ts`).
 */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [products, shell, t, tNav, tBrand] = await Promise.all([
    getProducts(),
    getShellData(),
    getTranslations('ProductsPage'),
    getTranslations('Nav'),
    getTranslations('Brand'),
  ])
  if (products.length === 0) notFound()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: tBrand('products'), path: '/products' },
        ])}
      />
      <div className="bg-ink">
        <InkBand glow aria-labelledby="products-title" className="pt-14 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="products-index">
          <BandInner className="flex flex-col gap-12">
            <SectionHeading as="h1" id="products-title" eyebrow={tBrand('products')} title={t('title')} lead={t('lead')} />
            <ProductBlockList products={products} productHref={productPageHref} demoHref={productDemoHref} headingLevel="h2" />
          </BandInner>
        </InkBand>
        <InkBand aria-label={tBrand('megaCardTitle')} className="px-4 pb-20">
          <CtaBand
            title={t('customTitle')}
            line={t('customLine')}
            primary={{ href: '/start', label: tBrand('start') }}
            whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null}
            whatsappLabel={tBrand('whatsapp')}
          />
        </InkBand>
      </div>
    </SiteShell>
  )
}
