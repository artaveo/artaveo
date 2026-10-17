import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LatinTerm } from '@/components/site/latin-term'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrowserFrame } from '@/components/ui/frames'
import { CaseStudyEvidenceGroup, CaseStudyHeroMedia } from '@/components/work/case-study-media'
import { ProjectBlocks } from '@/components/work/project-blocks'
import { ProjectGallery } from '@/components/work/project-gallery'
import { t, type Locale, type Project, type ProjectMediaItem } from '@/types/content'

/**
 * CaseStudy — the shared `/work/[slug]` template (roadmap § 6.1).
 *
 * Phase 27.2: the body is the project's published content blocks, in the owner's
 * order (`ProjectBlocks`) — the owner builds the page in the admin without code.
 * The engineering sections of revisions 1–44 are archived (`project_sections`,
 * migration 0026) and never read; nor are the role, the status or the repository
 * link (Phase 26.5 / 27.1).
 *
 * Media: exactly one `placement: 'hero'` image under the header; the `'story'`
 * screenshot groups (0014) follow the blocks, each group together; the
 * `'gallery'` grid closes the page. Gallery blocks bring their own images.
 *
 * The project's own accent colour (`accentColor`, 27.1) colours the small marks
 * in its blocks; Phase 30 takes the colour further with Design System 2.0.
 */
export function CaseStudy({
  project,
  nextProject,
}: {
  project: Project
  nextProject?: Project
}) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('CaseStudy')
  const tNav = useTranslations('Nav')
  const tPlatform = useTranslations('Platforms')

  const heroMedia = project.media?.find((m) => m.placement === 'hero')
  const galleryMedia = project.media?.filter((m) => m.placement === 'gallery') ?? []

  /** Story screenshots grouped by `storyKey`, in `sort_order` (already sorted by the selector). */
  const storyGroups: ProjectMediaItem[][] = []
  {
    const byKey = new Map<string, ProjectMediaItem[]>()
    for (const item of project.media ?? []) {
      if (item.placement !== 'story' || !item.storyKey) continue
      const list = byKey.get(item.storyKey)
      if (list) list.push(item)
      else {
        const group = [item]
        byKey.set(item.storyKey, group)
        storyGroups.push(group)
      }
    }
  }

  const accentStyle = project.accentColor ? ({ '--project-accent': project.accentColor } as React.CSSProperties) : undefined

  return (
    <article className="container-page py-16 md:py-24" style={accentStyle}>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('work'), href: '/work' },
          { label: t(project.title, locale) },
        ]}
        className="mb-10"
      />

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand-soft">{t(project.category, locale)}</Badge>
          {project.industry ? <Badge variant="muted">{t(project.industry, locale)}</Badge> : null}
          {project.year ? <span className="font-mono text-xs text-muted-foreground">{project.year}</span> : null}
        </div>

        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {t(project.title, locale)}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {t(project.summary, locale)}
        </p>

        {project.outcomeLine ? (
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-foreground text-pretty">
            {t(project.outcomeLine, locale)}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-start gap-x-10 gap-y-5">
          {project.platforms.length > 0 ? (
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t18n('platforms')}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {project.platforms.map((platform) => (
                  <li key={platform}>
                    <Badge variant="outline">{tPlatform(platform)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {project.technologies.length > 0 ? (
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t18n('stack')}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <li key={tech}>
                    <Badge variant="muted">
                      <LatinTerm>{tech}</LatinTerm>
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* Repository links are never shown publicly (Phase 26.5, D-19). */}
          {project.liveUrl ? (
            <Button size="sm" variant="outline" render={<a href={project.liveUrl} target="_blank" rel="noreferrer" />}>
              {t18n('liveDemo')}
              <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
              <span className="sr-only">{t18n('opensNewTab')}</span>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Hero media: the one `placement: 'hero'` image; a project with no media yet
          falls back to its cover, so it still shows something rather than nothing. */}
      <div className="mt-12 md:mt-16">
        {heroMedia ? (
          <CaseStudyHeroMedia item={heroMedia} locale={locale} projectSlug={project.slug} />
        ) : (
          <div className="mx-auto max-w-4xl">
            <BrowserFrame url={`artaveo.dev/work/${project.slug}`}>
              <div className="relative aspect-[16/9] bg-muted">
                {project.coverImage ? (
                  <Image
                    src={project.coverImage}
                    alt={`${t(project.title, locale)} interface`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 768px, 100vw"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{project.slug}</span>
                  </div>
                )}
              </div>
            </BrowserFrame>
          </div>
        )}
      </div>

      {/* `min-w-0`: a flex/grid child is as wide as its content by default (Phase 26.3). */}
      <div className="mx-auto mt-14 min-w-0 max-w-4xl md:mt-20">
        <ProjectBlocks project={project} />

        {storyGroups.length > 0 ? (
          <div className="mt-14 flex flex-col gap-10">
            {storyGroups.map((group, i) => (
              <CaseStudyEvidenceGroup key={group[0]?.src ?? i} items={group} locale={locale} projectSlug={project.slug} />
            ))}
          </div>
        ) : null}
      </div>

      {galleryMedia.length > 0 ? (
        <div className="mt-16 border-t border-border pt-10 md:mt-20">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t18n('gallery')}</h2>
          <div className="mt-6">
            <ProjectGallery items={galleryMedia} />
          </div>
        </div>
      ) : null}

      {nextProject ? (
        <div className="mt-20 border-t border-border pt-10 md:mt-28">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t18n('nextProject')}</span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            <Link
              href={`/work/${nextProject.slug}`}
              className="group inline-flex items-center gap-2 rounded-sm outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t(nextProject.title, locale)}
              <ArrowRight
                data-icon="inline-end"
                aria-hidden="true"
                className="size-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
              />
            </Link>
          </h2>
        </div>
      ) : null}
    </article>
  )
}
