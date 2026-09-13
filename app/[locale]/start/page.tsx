import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { StartContent } from '@/components/start/start-content'
import { getServiceBySlug } from '@/lib/services-content'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'StartPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
    // Canonical points at the bare `/start` regardless of `?service=` /
    // `?package=` prefill query params — those personalize the form, they
    // don't create a distinct page worth indexing separately.
    alternates: buildAlternates(locale, '/start'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('description') }),
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function StartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const query = await searchParams
  const serviceSlug = firstValue(query.service)
  const packageId = firstValue(query.package)

  // Only prefill from a real, existing service — an unrecognised
  // `?service=` value (typo, stale link) is silently ignored rather than
  // shown as a broken selection (same "empty means hidden" honesty rule
  // the rest of the site follows for unknown/missing data).
  const initialServiceSlug = serviceSlug && getServiceBySlug(serviceSlug) ? serviceSlug : undefined
  const initialPackageId = initialServiceSlug ? packageId : undefined

  const t = await getTranslations('StartPage')
  const tNav = await getTranslations('Nav')

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('metaTitle'), path: '/start' },
        ])}
      />
      <StartContent initialServiceSlug={initialServiceSlug} initialPackageId={initialPackageId} />
    </SiteShell>
  )
}
