import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ConsultationContent } from '@/components/consultation/consultation-content'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ConsultationPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
    alternates: buildAlternates(locale, '/consultation'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function ConsultationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('ConsultationPage')
  const tNav = await getTranslations('Nav')

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('metaTitle'), path: '/consultation' },
        ])}
      />
      <ConsultationContent locale={locale as Locale} />
    </SiteShell>
  )
}
