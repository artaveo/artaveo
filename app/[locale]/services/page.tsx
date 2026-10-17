import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { ServiceGrid } from '@/components/services/service-grid'
import { PageHeader } from '@/components/ui/patterns'
import { getAllServices } from '@/lib/services-content'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ServicesIndex' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale, '/services'),
    ...buildPageOpenGraph({ locale, title: t('title'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('ServicesIndex')
  const tNav = await getTranslations('Nav')
  const services = await getAllServices()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/services' },
        ])}
      />
      <div className="container-page">
        <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
        {/* Phase 27.4: engagement models and the Discovery Sprint left the public model (the table and its admin stay). */}
        <div className="pb-24">
          <ServiceGrid services={services} />
        </div>
      </div>
    </SiteShell>
  )
}

