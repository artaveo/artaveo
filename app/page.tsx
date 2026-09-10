import type { Metadata } from 'next'

import { AboutPreview } from '@/components/home/about-preview'
import { CapabilityStrip } from '@/components/home/capability-strip'
import { FeaturedWork } from '@/components/home/featured-work'
import { FinalCta } from '@/components/home/final-cta'
import { Hero } from '@/components/home/hero'
import { InsightsPreview } from '@/components/home/insights-preview'
import { Process } from '@/components/home/process'
import { Services } from '@/components/home/services'
import { TechStack } from '@/components/home/tech-stack'
import { WhyArtaveo } from '@/components/home/why-artaveo'
import { SiteShell } from '@/components/site/site-shell'

export const metadata: Metadata = {
  title: {
    absolute: 'Artaveo — Independent full-stack web & software development',
  },
  description:
    'Artaveo is an independent full-stack development studio building modern web applications, business platforms and digital products — from idea and architecture to deployment.',
}

export default function HomePage() {
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
      <InsightsPreview />
      <FinalCta />
    </SiteShell>
  )
}
