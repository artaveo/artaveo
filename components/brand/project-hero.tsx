import { useLocale, useTranslations } from 'next-intl'
import type * as React from 'react'

import { PLATFORM_ICONS } from '@/components/brand/brand-icons'
import { BandInner } from '@/components/brand/bands'
import { DeviceShowcase } from '@/components/brand/device-mockups'
import { Link } from '@/i18n/navigation'
import { PROJECT_GLOW_ALPHA, projectPalette, projectStyle, withAlpha } from '@/lib/design/color'
import { pickMockupImages } from '@/lib/design/mockups'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project } from '@/types/content'

/**
 * Phase 30 — the top of a product page and of a project page: a band in the
 * project's own colours (§ 14.1 "each project/product has its own colour"),
 * a small path back, the industry, the title, one line, the platforms as
 * icons, the actions, and the real screens in laptop and phone frames. With
 * no screenshot the band is the text alone. The colours come from
 * `projectPalette()`, which keeps every text on the band at ≥ 4.5:1 for any
 * colour the owner picks.
 */
export function ProjectHero({
  project,
  trail,
  actions,
  titleId,
}: {
  project: Project
  /** The way back: Home › Work, or Home › Products. */
  trail: { href: string; label: string }[]
  actions?: React.ReactNode
  titleId: string
}) {
  const locale = useLocale() as Locale
  const tp = useTranslations('Platforms')
  const tb = useTranslations('Brand')
  const palette = projectPalette(project.brandColor, project.accentColor)
  const { laptop, phone } = pickMockupImages(project, locale)
  const line = project.outcomeLine ? t(project.outcomeLine, locale) : t(project.summary, locale)
  const title = t(project.title, locale)

  return (
    <section
      aria-labelledby={titleId}
      data-slot="project-hero"
      style={{
        ...projectStyle(palette),
        backgroundImage: `radial-gradient(60% 80% at 100% 0%, ${withAlpha(palette.accent, PROJECT_GLOW_ALPHA)}, transparent 65%), linear-gradient(160deg, ${palette.surface}, ${palette.deep})`,
      }}
      className="@container relative isolate overflow-hidden text-project-on"
    >
      <BandInner className={cn('grid items-center gap-10 pt-10 pb-16 @3xl:pt-14 @3xl:pb-20', laptop && '@5xl:grid-cols-[1fr_1.15fr]')}>
        <div className="flex min-w-0 flex-col gap-5">
          <nav aria-label={tb('trailLabel')}>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-project-on-muted">
              {trail.map((step) => (
                <li key={step.href} className="flex items-center gap-2">
                  <Link href={step.href} className="rounded-sm underline-offset-4 outline-none hover:text-project-on hover:underline focus-visible:ring-2 focus-visible:ring-ring/70">
                    {step.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))}
              <li aria-current="page" className="min-w-0 truncate text-project-on">
                {title}
              </li>
            </ol>
          </nav>
          {project.industry ? (
            <span className="self-start rounded-pill bg-project-accent/15 px-3 py-1 text-xs font-bold text-project-accent-text">{t(project.industry, locale)}</span>
          ) : null}
          <h1 id={titleId} className="text-h1 text-balance">
            {title}
          </h1>
          <p className="max-w-[36rem] text-body text-pretty text-project-on-muted">{line}</p>
          {project.platforms.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label={tb('platformsLabel')}>
              {project.platforms.map((platform) => {
                const Icon = PLATFORM_ICONS[platform]
                return (
                  <li key={platform} className="inline-flex items-center gap-2 rounded-pill border border-white/15 px-3 py-1.5 text-small font-semibold">
                    <Icon aria-hidden="true" className="size-4" />
                    {tp(platform)}
                  </li>
                )
              })}
            </ul>
          ) : null}
          {actions ? <div className="mt-1 flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
        {laptop ? <DeviceShowcase laptop={laptop} phone={phone} priority /> : null}
      </BandInner>
    </section>
  )
}
