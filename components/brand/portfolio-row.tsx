import { useLocale, useTranslations } from 'next-intl'

import { ForwardArrow, PLATFORM_ICONS } from '@/components/brand/brand-icons'
import { DeviceShowcase } from '@/components/brand/device-mockups'
import { PillLink } from '@/components/brand/pill'
import { PROJECT_GLOW_ALPHA, projectPalette, projectStyle, withAlpha } from '@/lib/design/color'
import { pickMockupImages } from '@/lib/design/mockups'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project } from '@/types/content'

/**
 * Phase 28.5 — one project as one row on the warm panel (§ 14.0 Portfolio
 * Row): a panel in the project's colour holding its laptop and phone
 * screenshots, then industry and platforms, title, outcome line, tags,
 * platform icons and a link — to the product page when the project is also
 * a product. Each row stands alone; rows alternate the image side.
 */
export function PortfolioRow({
  project,
  href,
  reverse = false,
  headingLevel: Heading = 'h3',
}: {
  project: Project
  /** The project page, or the product page when `project.isProduct`. */
  href: string
  reverse?: boolean
  headingLevel?: 'h2' | 'h3'
}) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const tp = useTranslations('Platforms')
  const palette = projectPalette(project.brandColor, project.accentColor)
  const { laptop, phone } = pickMockupImages(project, locale)
  const line = project.outcomeLine ? t(project.outcomeLine, locale) : t(project.summary, locale)
  const tags = (project.features.length > 0 ? project.features : project.highlights).slice(0, 4)
  const meta = [project.industry ? t(project.industry, locale) : null, project.platforms.map((p) => tp(p)).join(locale === 'fa' ? '، ' : ', ') || null]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      style={projectStyle(palette)}
      className={cn(
        '@container flex flex-col overflow-hidden rounded-panel bg-paper-card text-paper-foreground shadow-card',
        reverse ? '@4xl:flex-row-reverse' : '@4xl:flex-row',
      )}
      data-slot="portfolio-row"
    >
      <div
        className="flex min-w-0 flex-[1.15] items-center justify-center px-6 pt-10 pb-12 @2xl:px-11"
        style={{
          backgroundImage: `radial-gradient(80% 80% at ${reverse ? '100%' : '0%'} 100%, ${withAlpha(palette.accent, PROJECT_GLOW_ALPHA + 0.1)}, transparent 60%), linear-gradient(150deg, ${palette.surface}, ${palette.deep})`,
        }}
      >
        {laptop ? (
          <DeviceShowcase laptop={laptop} phone={phone} phoneSide={reverse ? 'end' : 'start'} />
        ) : (
          <div aria-hidden="true" className="aspect-[16/10] w-full max-w-[34rem]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 p-6 @2xl:p-11">
        {meta ? (
          <p className="flex items-center gap-2.5 text-small text-paper-muted">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-project-accent" />
            {meta}
          </p>
        ) : null}
        <Heading className="text-h3 text-balance">{t(project.title, locale)}</Heading>
        <p className="text-body text-pretty text-paper-muted">{line}</p>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <li key={index} className="rounded-pill bg-paper px-3 py-1.5 text-xs font-semibold text-paper-foreground">
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
                  <li key={platform} className="grid size-10 place-items-center rounded-xl bg-paper text-paper-foreground" title={tp(platform)}>
                    <Icon aria-hidden="true" className="size-[1.15rem]" />
                    <span className="sr-only">{tp(platform)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <span />
          )}
          <PillLink href={href} variant="project-solid">
            {project.isProduct ? tr('seeProduct') : tr('seeProject')}
            <ForwardArrow />
          </PillLink>
        </div>
      </div>
    </article>
  )
}

/** Rows one under another, image side alternating; nothing when the portfolio is empty. */
export function PortfolioList({
  projects,
  href,
  headingLevel,
}: {
  projects: Project[]
  href: (project: Project) => string
  /** `h2` where the rows are the page's main content (/work). */
  headingLevel?: 'h2' | 'h3'
}) {
  if (projects.length === 0) return null
  return (
    <div className="flex flex-col gap-7">
      {projects.map((project, index) => (
        <PortfolioRow key={project.id} project={project} href={href(project)} reverse={index % 2 === 1} headingLevel={headingLevel} />
      ))}
    </div>
  )
}
