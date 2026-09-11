import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import { SectionHeader } from '@/components/home/section-header'
import { LatinTerm } from '@/components/site/latin-term'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getFeaturedProjects } from '@/lib/home-content'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project, type ProjectStatus } from '@/types/content'

export function FeaturedWork() {
  const projects = getFeaturedProjects()
  const locale = useLocale() as Locale
  const tSection = useTranslations('FeaturedWork')

  const statusLabel: Record<ProjectStatus, { label: string; variant: 'info' | 'success' | 'muted' }> = {
    'in-development': { label: tSection('statusInDevelopment'), variant: 'info' },
    live: { label: tSection('statusLive'), variant: 'success' },
    archived: { label: tSection('statusArchived'), variant: 'muted' },
  }

  return (
    <section aria-labelledby="work-title" className="section-y">
      <div className="container-page">
        <SectionHeader
          id="work-title"
          eyebrow={tSection('eyebrow')}
          title={tSection('title')}
          description={tSection('description')}
          action={{ href: '/work', label: tSection('allWork') }}
        />

        <div className="flex flex-col gap-16 md:gap-24">
          {projects.map((project, index) => (
            <ProjectFeature
              key={project.id}
              project={project}
              locale={locale}
              statusLabel={statusLabel}
              t={tSection}
              reversed={index % 2 === 1}
              priority={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProjectFeature({
  project,
  locale,
  statusLabel,
  t: tSection,
  reversed,
  priority,
}: {
  project: Project
  locale: Locale
  statusLabel: Record<ProjectStatus, { label: string; variant: 'info' | 'success' | 'muted' }>
  t: ReturnType<typeof useTranslations<'FeaturedWork'>>
  reversed: boolean
  priority: boolean
}) {
  const href = `/work/${project.slug}`
  const titleId = `project-${project.slug}`
  const status = project.status ? statusLabel[project.status] : null

  return (
    <article
      aria-labelledby={titleId}
      className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className={cn(
          'group block lg:col-span-7',
          reversed && 'lg:order-last',
        )}
      >
        <ProjectMedia project={project} locale={locale} priority={priority} screenshotPlaceholder={tSection('screenshotPlaceholder')} />
      </Link>

      <div className="lg:col-span-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand-soft">{t(project.category, locale)}</Badge>
          {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
          {project.year ? (
            <span className="font-mono text-xs text-muted-foreground">
              {project.year}
            </span>
          ) : null}
        </div>

        <h3
          id={titleId}
          className="mt-4 text-2xl font-semibold tracking-tight text-balance md:text-3xl"
        >
          <Link
            href={href}
            className="rounded-sm outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t(project.title, locale)}
          </Link>
        </h3>

        <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
          {t(project.summary, locale)}
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
          {project.highlights.map((item) => (
            <li key={item.en} className="flex gap-3 text-sm leading-relaxed">
              <span
                aria-hidden
                className="mt-[0.55rem] size-1.5 shrink-0 rounded-[2px] bg-brand"
              />
              <span className="text-pretty">{t(item, locale)}</span>
            </li>
          ))}
        </ul>

        <ul aria-label={tSection('technologies')} className="mt-6 flex flex-wrap gap-1.5">
          {project.technologies.map((tech) => (
            <li key={tech}>
              <Badge variant="muted">
                <LatinTerm>{tech}</LatinTerm>
              </Badge>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button size="lg" render={<Link href={href} />}>
            {tSection('viewCaseStudy')}
            <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
          {project.liveUrl ? (
            <ExternalButton href={project.liveUrl} label={tSection('liveDemo')} opensNewTab={tSection('opensNewTab')} />
          ) : null}
          {project.githubUrl ? (
            <ExternalButton href={project.githubUrl} label={tSection('github')} opensNewTab={tSection('opensNewTab')} />
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ExternalButton({ href, label, opensNewTab }: { href: string; label: string; opensNewTab: string }) {
  return (
    <Button
      size="lg"
      variant="outline"
      render={<a href={href} target="_blank" rel="noreferrer" />}
    >
      {label}
      <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
      <span className="sr-only">{opensNewTab}</span>
    </Button>
  )
}

/**
 * Project cover. Shows the real screenshot when `coverImage` is set;
 * otherwise a neutral, clearly-labelled browser frame marks where the
 * screenshot will go.
 */
function ProjectMedia({
  project,
  locale,
  priority,
  screenshotPlaceholder,
}: {
  project: Project
  locale: Locale
  priority: boolean
  screenshotPlaceholder: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-foreground/20">
      <div className="flex items-center gap-3 border-b border-border bg-elevated px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </span>
        <span
          dir="ltr"
          className="truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
        >
          /work/{project.slug}
        </span>
      </div>

      <div className="relative aspect-[16/10] bg-muted">
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt={`${t(project.title, locale)} interface`}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.015]"
          />
        ) : (
          <>
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:32px_32px]"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {screenshotPlaceholder}
              </span>
              <span className="text-lg font-semibold tracking-tight text-foreground/70 md:text-xl">
                {t(project.title, locale)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
