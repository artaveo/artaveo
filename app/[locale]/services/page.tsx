import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { ServiceGrid } from '@/components/services/service-grid'
import { PageHeader } from '@/components/ui/patterns'
import { getAllServices } from '@/lib/services-content'

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
  const services = getAllServices()

  return (
    <SiteShell>
      <div className="container-page">
        <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
        <div className="pb-24">
          <ServiceGrid services={services} />
        </div>
      </div>
    </SiteShell>
  )
}
