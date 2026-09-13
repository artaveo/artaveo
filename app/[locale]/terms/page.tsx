import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { LegalContent } from '@/components/legal/legal-content'
import { getTermsOfService } from '@/lib/legal-content'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'TermsPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
    alternates: buildAlternates(locale, '/terms'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('TermsPage')
  const tNav = await getTranslations('Nav')
  const document = getTermsOfService()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/terms' },
        ])}
      />
      <LegalContent
        document={document}
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        lastUpdatedLabel={t('lastUpdatedLabel')}
      />
    </SiteShell>
  )
}
