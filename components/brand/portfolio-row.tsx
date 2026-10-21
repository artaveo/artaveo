import { useLocale, useTranslations } from 'next-intl'

import { ForwardArrow, PLATFORM_ICONS } from '@/components/brand/brand-icons'
import { DeviceShowcase } from '@/components/brand/device-mockups'
import { PillLink } from '@/components/brand/pill'
import { cardTonesStyle, projectCardTones, projectPalette, projectStyle, withAlpha } from '@/lib/design/color'
import { pickMockupImages } from '@/lib/design/mockups'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project } from '@/types/content'

/** How strong the accent's glow is inside the card's screenshot panel — calm, never garish (D-22). */
const CARD_GLOW_ALPHA = 0.14

/**
 * One project as one card (§ 14.0 Portfolio Row) — Home, /work, a service's
 * related work and a case study's next project.
 *
 * Phase 32.6 (owner, 20 October 2026 — § 6.8, D-22): a compact card about the
 * width of its text and screens (≈ 1100 px at most, centred), never a
 * full-width band; the project's colour over the whole card in a few tonal
 * steps — the screenshot panel in a soft tone, the text side on a very light
 * tint (light theme) or a deep tone (dark theme) with a hairline in the same
 * hue, the title, the link and the platform icons in the project colour, the
 * chips outlined in a project tone. `projectCardTones()` derives both themes'
 * tones and keeps every text pairing at 4.5:1 or more; `[data-project-tones]`
 * (app/globals.css) picks the theme's. Each card stands alone; the image side
 * alternates.
 */
export function PortfolioRow({
  project,
  href,
  reverse = false,
  headingLevel: Heading = 'h3',
  priority = false,
}: {
  project: Project
  /** The project page, or the product page when `project.isProduct`. */
  href: string
  reverse?: boolean
  headingLevel?: 'h2' | 'h3'
  /** Phase 34: the first card of a page that opens with the list (/work) — its screen is the page's largest paint, so it loads early, not lazily. */
  priority?: boolean
}) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const tp = useTranslations('Platforms')
  const palette = projectPalette(project.brandColor, project.accentColor)
  const tones = projectCardTones(project.brandColor)
  const { laptop, phone } = pickMockupImages(project, locale)
  const line = project.outcomeLine ? t(project.outcomeLine, locale) : t(project.summary, locale)
  const tags = (project.features.length > 0 ? project.features : project.highlights).slice(0, 4)
  const meta = [project.industry ? t(project.industry, locale) : null, project.platforms.map((p) => tp(p)).join(locale === 'fa' ? '، ' : ', ') || null]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      style={{ ...projectStyle(palette), ...cardTonesStyle(tones) }}
      data-project-tones=""
      className={cn(
        '@container mx-auto flex w-full max-w-[68.75rem] flex-col overflow-hidden rounded-card-lg border border-pc-line bg-pc-ground text-pc-text shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        reverse ? '@3xl:flex-row-reverse' : '@3xl:flex-row',
      )}
      data-slot="portfolio-row"
    >
      <div
        className="flex min-w-0 items-center justify-center px-5 py-6 @3xl:basis-[45%] @3xl:px-7 @3xl:py-8"
        style={{
          backgroundImage: `radial-gradient(80% 80% at ${reverse ? '100%' : '0%'} 100%, ${withAlpha(palette.accent, CARD_GLOW_ALPHA)}, transparent 62%), linear-gradient(150deg, var(--pc-panel), var(--pc-panel-deep))`,
        }}
        data-slot="portfolio-row-screens"
      >
        {laptop ? (
          <DeviceShowcase laptop={laptop} phone={phone} phoneSide={reverse ? 'end' : 'start'} priority={priority} className="max-w-[40rem]" />
        ) : (
          <div aria-hidden="true" className="aspect-[16/10] w-full max-w-[30rem]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3.5 p-6 @3xl:p-9">
        {meta ? (
          <p className="flex items-center gap-2.5 text-small text-pc-muted">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-project-accent" />
            {meta}
          </p>
        ) : null}
        <Heading className="text-h3 text-balance text-pc-title">{t(project.title, locale)}</Heading>
        <p className="text-body text-pretty">{line}</p>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <li key={index} className="rounded-pill border border-pc-chip-line px-3 py-1.5 text-xs font-semibold">
                {t(tag, locale)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
          {project.platforms.length > 0 ? (
            <ul className="flex gap-2" aria-label={tr('platformsLabel')}>
              {project.platforms.map((platform) => {
                const Icon = PLATFORM_ICONS[platform]
                return (
                  <li key={platform} className="grid size-10 place-items-center rounded-xl border border-pc-chip-line text-pc-title" title={tp(platform)}>
                    <Icon aria-hidden="true" className="size-[1.15rem]" />
                    <span className="sr-only">{tp(platform)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <span />
          )}
          <PillLink href={href} variant="project-card">
            {project.isProduct ? tr('seeProduct') : tr('seeProject')}
            <ForwardArrow />
          </PillLink>
        </div>
      </div>
    </article>
  )
}

/** Cards one under another (28 px apart, § 14.1), image side alternating; nothing when the portfolio is empty. */
export function PortfolioList({
  projects,
  href,
  headingLevel,
  priorityFirst = false,
}: {
  projects: Project[]
  href: (project: Project) => string
  /** `h2` where the cards are the page's main content (/work). */
  headingLevel?: 'h2' | 'h3'
  /** The list opens the page, so the first card's screen is loaded first (Phase 34). */
  priorityFirst?: boolean
}) {
  if (projects.length === 0) return null
  return (
    <div className="flex flex-col gap-7">
      {projects.map((project, index) => (
        <PortfolioRow key={project.id} project={project} href={href(project)} reverse={index % 2 === 1} headingLevel={headingLevel} priority={priorityFirst && index === 0} />
      ))}
    </div>
  )
}
