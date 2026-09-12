import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { SiteShell } from '@/components/site/site-shell'
import { ServiceDetail } from '@/components/services/service-detail'
import { getProjectBySlug } from '@/lib/home-content'
import { getAllServices, getServiceBySlug } from '@/lib/services-content'
import { routing } from '@/i18n/routing'
import { t } from '@/types/content'

export function generateStaticParams() {
  const services = getAllServices()
  return routing.locales.flatMap((locale) =>
    services.map((service) => ({ locale, slug: service.slug })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) return {}

  const localeKey = locale === 'fa' ? 'fa' : 'en'
  return {
    title: t(service.title, localeKey),
    description: t(service.description, localeKey),
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const service = getServiceBySlug(slug)
  if (!service) {
    notFound()
  }

  const relatedProjects = (service.relatedProjectSlugs ?? [])
    .map((projectSlug) => getProjectBySlug(projectSlug))
    .filter((project): project is NonNullable<typeof project> => Boolean(project))

  return (
    <SiteShell>
      <ServiceDetail service={service} relatedProjects={relatedProjects} />
    </SiteShell>
  )
}
