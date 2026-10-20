import { BriefcaseBusiness, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { ForwardArrow } from '@/components/brand/brand-icons'
import { BandInner, InkBand } from '@/components/brand/bands'
import { DeviceShowcase } from '@/components/brand/device-mockups'
import { FloatingChip } from '@/components/brand/floating-chip'
import { PillLink, pillVariants } from '@/components/brand/pill'
import { pickMockupImages } from '@/lib/design/mockups'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project } from '@/types/content'

/**
 * Phase 29.2 — the Home hero (§ 14.0 Hero, § 14.1 Layout): the value line,
 * two actions and, beside them, the laptop and phone mock-ups of a real
 * product — or, while no product is published, of the first portfolio
 * project that has screenshots. Its two glass chips say what that project is
 * (its industry and one of its features), both from its data; without a
 * screenshot the hero is the text alone. Ink in both themes, two columns on
 * wide screens, stacked on phones.
 *
 * The second action is *See the products* (the Products section below) while
 * a product is published, *See our work* otherwise — never a link to nothing.
 */
export function HomeHero({ showcase, hasProducts }: { showcase: Project | null; hasProducts: boolean }) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const th = useTranslations('Home')
  const images = showcase ? pickMockupImages(showcase, locale) : null
  const laptop = images?.laptop ?? null
  const feature = showcase?.features[0] ?? showcase?.highlights[0]

  return (
    <InkBand glow aria-labelledby="home-hero-title" className="pt-14 pb-16 @3xl:pt-20 @3xl:pb-24" data-slot="home-hero">
      <BandInner className={cn('grid items-center gap-12', laptop && '@5xl:grid-cols-[1fr_1.1fr] @5xl:gap-10')}>
        <div className={cn('flex min-w-0 flex-col gap-5', !laptop && 'mx-auto max-w-[44rem] items-center text-center')}>
          <p className="text-small font-bold text-gold">{th('heroEyebrow')}</p>
          <h1 id="home-hero-title" className="text-h1 text-balance">
            {th('heroTitle')}
          </h1>
          <p className="max-w-[36rem] text-body text-pretty text-ink-muted">{th('heroLead')}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <PillLink href="/start" variant="gold" size="lg">
              {tr('start')}
              <ForwardArrow />
            </PillLink>
            {hasProducts ? (
              <a href="#products" className={pillVariants({ variant: 'glass', size: 'lg' })}>
                {th('heroSeeProducts')}
              </a>
            ) : (
              <PillLink href="/work" variant="glass" size="lg">
                {th('heroSeeWork')}
              </PillLink>
            )}
          </div>
        </div>
        {showcase && laptop ? (
          <DeviceShowcase
            laptop={laptop}
            phone={images?.phone}
            priority
            chips={
              <>
                {showcase.industry ? (
                  <FloatingChip icon={BriefcaseBusiness} title={t(showcase.industry, locale)} line={t(showcase.title, locale)} className="-top-2 end-4 max-w-[16rem]" />
                ) : null}
                {feature ? <FloatingChip icon={Sparkles} tone="cool" title={t(feature, locale)} className="end-[-2%] bottom-14 max-w-[15rem]" /> : null}
              </>
            }
          />
        ) : null}
      </BandInner>
    </InkBand>
  )
}
