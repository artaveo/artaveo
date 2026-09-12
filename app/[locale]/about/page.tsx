import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AboutContent } from '@/components/about/about-content'
import { SiteShell } from '@/components/site/site-shell'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'AboutPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <SiteShell>
      <AboutContent />
    </SiteShell>
  )
}
