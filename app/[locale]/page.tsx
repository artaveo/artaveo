import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AboutPreview } from '@/components/home/about-preview'
import { CapabilityStrip } from '@/components/home/capability-strip'
import { FeaturedWork } from '@/components/home/featured-work'
import { FinalCta } from '@/components/home/final-cta'
import { Hero } from '@/components/home/hero'
import { InsightsPreview } from '@/components/home/insights-preview'
import { Process } from '@/components/home/process'
import { Recommendations } from '@/components/home/recommendations'
import { Services } from '@/components/home/services'
import { TechStack } from '@/components/home/tech-stack'
import { WhyArtaveo } from '@/components/home/why-artaveo'
import { SiteShell } from '@/components/site/site-shell'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Hero' })
  const title = `Artaveo — ${t('titleLine1')} ${t('titleLine2')}`
  return {
    title: { absolute: title },
    description: t('description'),
    alternates: buildAlternates(locale, ''),
    ...buildPageOpenGraph({ locale, title, description: t('description') }),
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <SiteShell>
      <Hero />
      <CapabilityStrip />
      <FeaturedWork />
      <Services />
      <WhyArtaveo />
      <TechStack />
      <Process />
      <AboutPreview />
      <Recommendations />
      <InsightsPreview />
      <FinalCta />
    </SiteShell>
  )
}
