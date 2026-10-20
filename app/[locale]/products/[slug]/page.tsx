import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ProductPage } from '@/components/products/product-page'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { ViewTracker } from '@/components/site/view-tracker'
import { routing } from '@/i18n/routing'
import { getProductBySlug, getProducts } from '@/lib/home-content-projects'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildBreadcrumbJsonLd, buildProductJsonLd } from '@/lib/structured-data'
import { t, type Locale } from '@/types/content'

/**
 * Phase 30.1 — `/[locale]/products/[slug]`. Exists exactly while the project is
 * published and switched to a product in the admin; a new product's page is
 * rendered on its first visit and refreshed whenever the owner saves it
 * (`app/actions/products.ts`, `app/actions/content.ts`).
 */
export async function generateStaticParams() {
  const products = await getProducts()
  return routing.locales.flatMap((locale) => products.map((product) => ({ locale, slug: product.slug })))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}
  const key = locale === 'fa' ? 'fa' : 'en'
  const title = t(product.title, key)
  const description = product.outcomeLine ? t(product.outcomeLine, key) : t(product.summary, key)
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/products/${slug}`),
    ...buildPageOpenGraph({ locale, title, description, eyebrow: product.industry ? t(product.industry, key) : undefined }),
  }
}

export default async function ProductRoute({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [shell, tNav, tBrand] = await Promise.all([getShellData(), getTranslations('Nav'), getTranslations('Brand')])
  const key = locale as Locale

  return (
    <SiteShell>
      <JsonLd data={buildProductJsonLd(key, product)} />
      <JsonLd
        data={buildBreadcrumbJsonLd(key, [
          { name: tNav('home'), path: '/' },
          { name: tBrand('products'), path: '/products' },
          { name: t(product.title, key), path: `/products/${product.slug}` },
        ])}
      />
      <ViewTracker event="product_view" properties={{ slug: product.slug }} />
      <ProductPage product={product} whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null} />
    </SiteShell>
  )
}
