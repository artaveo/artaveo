import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AboutContent } from '@/components/about/about-content'
import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'AboutPage' })
  return {
    title: t('metaTitle'),
    description: t('lead'),
    alternates: buildAlternates(locale, '/about'),
    ...buildPageOpenGraph({
      locale,
      title: t('metaTitle'),
      description: t('lead'),
      eyebrow: t('metaTitle'),
    }),
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('AboutPage')
  const tNav = await getTranslations('Nav')
  const shell = await getShellData()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('metaTitle'), path: '/about' },
        ])}
      />
      <AboutContent whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null} />
    </SiteShell>
  )
}
