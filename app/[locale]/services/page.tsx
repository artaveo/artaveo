import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { ServiceGrid } from '@/components/services/service-grid'
import { EngagementModelsTable } from '@/components/services/engagement-models-table'
import { PageHeader } from '@/components/ui/patterns'
import { getAllServices, getEngagementModels } from '@/lib/services-content'
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
  const services = getAllServices()
  const engagementModels = getEngagementModels()

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
        <div className="pb-16">
          <ServiceGrid services={services} />
        </div>
        <div className="border-t border-border pb-24 pt-16">
          <EngagementModelsTable models={engagementModels} />
        </div>
      </div>
    </SiteShell>
  )
}

