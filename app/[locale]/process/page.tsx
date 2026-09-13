import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ProcessContent } from '@/components/process/process-content'
import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ProcessPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
    alternates: buildAlternates(locale, '/process'),
    ...buildPageOpenGraph({ locale, title: t('metaTitle'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('ProcessPage')
  const tNav = await getTranslations('Nav')

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('metaTitle'), path: '/process' },
        ])}
      />
      <ProcessContent />
    </SiteShell>
  )
}
