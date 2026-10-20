import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { ViewTracker } from '@/components/site/view-tracker'
import { ServicePage } from '@/components/services/service-page'
import { getProjectBySlug } from '@/lib/home-content-projects'
import { getAllServices, getServiceBySlug } from '@/lib/services-content'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { routing } from '@/i18n/routing'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildServiceJsonLd } from '@/lib/structured-data'
import { getWayOfWorkingSteps } from '@/lib/way-of-working'
import { t, type Locale } from '@/types/content'

export async function generateStaticParams() {
  const services = await getAllServices()
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
  const service = await getServiceBySlug(slug)
  if (!service) return {}

  const localeKey = locale === 'fa' ? 'fa' : 'en'
  const title = t(service.title, localeKey)
  const description = t(service.tagline ?? service.description, localeKey)
  const tk = await getTranslations({ locale, namespace: 'ServiceKinds' })
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/services/${slug}`),
    ...buildPageOpenGraph({ locale, title, description, eyebrow: service.kind ? tk(service.kind) : undefined }),
  }
}

/** Phase 31.1 — a service page (`components/services/service-page.tsx`). */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [service, services, steps, shell] = await Promise.all([getServiceBySlug(slug), getAllServices(), getWayOfWorkingSteps(), getShellData()])
  if (!service) {
    notFound()
  }

  // Only published projects: an unpublished one the owner linked appears the day it is published.
  const relatedProjects = (
    await Promise.all((service.relatedProjectSlugs ?? []).map((projectSlug) => getProjectBySlug(projectSlug)))
  ).filter((project): project is NonNullable<typeof project> => Boolean(project))

  const localeKey = locale as Locale
  const tNav = await getTranslations('Nav')
  const tb = await getTranslations('Brand')

  return (
    <SiteShell>
      <JsonLd data={buildServiceJsonLd(localeKey, service)} />
      {service.faq && service.faq.length > 0 ? (
        <JsonLd data={buildFaqPageJsonLd(localeKey, service.faq)} />
      ) : null}
      <JsonLd
        data={buildBreadcrumbJsonLd(localeKey, [
          { name: tNav('home'), path: '/' },
          { name: tb('services'), path: '/services' },
          { name: t(service.title, localeKey), path: `/services/${service.slug}` },
        ])}
      />
      <ViewTracker event="service_view" properties={{ slug: service.slug }} />
      <ServicePage
        service={service}
        relatedProjects={relatedProjects}
        otherServices={services.filter((other) => other.slug !== service.slug)}
        generalSteps={steps}
        whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null}
      />
    </SiteShell>
  )
}
