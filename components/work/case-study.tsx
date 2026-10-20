import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { BandInner, InkBand, PaperPanel } from '@/components/brand/bands'
import { ForwardArrow } from '@/components/brand/brand-icons'
import { CtaBand } from '@/components/brand/cta-band'
import { PillLink } from '@/components/brand/pill'
import { PortfolioRow } from '@/components/brand/portfolio-row'
import { ProjectHero } from '@/components/brand/project-hero'
import { ScreenGallery } from '@/components/brand/screen-gallery'
import { ProjectBlocks } from '@/components/work/project-blocks'
import { projectPalette, projectStyle } from '@/lib/design/color'
import { projectScreens } from '@/lib/products/screens'
import { productPageHref, projectHref } from '@/lib/shell-menus'
import type { Project } from '@/types/content'

/**
 * CaseStudy — `/work/[slug]` (Phase 30.2), visuals first: the project in its
 * own colours with its real screens in laptop and phone frames, then the
 * owner's content blocks (Phase 27.2) and the screenshots with their one-line
 * captions on the warm panel, then the next project as its own row and the
 * call to action. A product's page links to its product page («دیدن محصول»).
 *
 * Gone with this phase: the technology badges, the project "category"
 * (e.g. «پلتفرم فول‌استک»), the browser frame with an address bar and every
 * engineering section (archived since Phase 27). Repository links are never
 * shown (Phase 26.5, D-19).
 */
export function CaseStudy({
  project,
  nextProject,
  whatsappHref,
}: {
  project: Project
  nextProject?: Project
  whatsappHref: string | null
}) {
  const tc = useTranslations('CaseStudy')
  const tb = useTranslations('Brand')
  const tNav = useTranslations('Nav')
  const tBlock = useTranslations('BlockTypes')
  const screens = projectScreens(project)

  return (
    <div className="bg-ink" style={projectStyle(projectPalette(project.brandColor, project.accentColor))} data-slot="case-study">
      <ProjectHero
        project={project}
        titleId="case-study-title"
        trail={[
          { href: '/', label: tNav('home') },
          { href: '/work', label: tNav('work') },
        ]}
        actions={
          <>
            {project.isProduct ? (
              <PillLink href={productPageHref(project)} variant="project" size="lg">
                {tb('seeProduct')}
                <ForwardArrow />
              </PillLink>
            ) : (
              <PillLink href="/start" variant="project" size="lg">
                {tb('start')}
                <ForwardArrow />
              </PillLink>
            )}
            {project.liveUrl ? (
              <PillLink href={project.liveUrl} variant="glass" size="lg" external>
                {tc('liveDemo')}
                <ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" />
                <span className="sr-only">{tc('opensNewTab')}</span>
              </PillLink>
            ) : null}
          </>
        }
      />

      <PaperPanel aria-labelledby="case-study-title" data-slot="case-study-content">
        <BandInner className="flex flex-col gap-16">
          <ProjectBlocks project={project} />
          {screens.length > 0 ? (
            <section aria-labelledby="case-study-screens" className="flex flex-col gap-6">
              <h2 id="case-study-screens" className="text-h2">
                {tBlock('gallery')}
              </h2>
              <ScreenGallery screens={screens} />
            </section>
          ) : null}
        </BandInner>
      </PaperPanel>

      {nextProject ? (
        <>
          <div className="h-3" aria-hidden="true" />
          <PaperPanel aria-labelledby="next-project-title" className="@3xl:py-16" data-slot="next-project">
            <BandInner className="flex flex-col gap-6">
              <p id="next-project-title" className="text-small font-bold text-gold-deep">
                {tc('nextProject')}
              </p>
              <PortfolioRow project={nextProject} href={projectHref(nextProject)} headingLevel="h2" />
            </BandInner>
          </PaperPanel>
        </>
      ) : null}

      <InkBand aria-label={tb('megaCardTitle')} className="px-4 pt-16 pb-20">
        <CtaBand
          title={tb('megaCardTitle')}
          line={tb('megaCardLine')}
          primary={{ href: '/start', label: tb('start') }}
          whatsappHref={whatsappHref}
          whatsappLabel={tb('whatsapp')}
        />
      </InkBand>
    </div>
  )
}
