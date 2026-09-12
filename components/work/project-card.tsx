import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import { LatinTerm } from '@/components/site/latin-term'
import { Badge } from '@/components/ui/badge'
import { BrowserFrame } from '@/components/ui/frames'
import { StatusBadge } from '@/components/ui/tag'
import { t, type Locale, type Project } from '@/types/content'

/**
 * ProjectCard — the `/work` grid tile (roadmap § 6.1). Reuses `BrowserFrame`
 * for the thumbnail so the same screenshot-chrome pattern shows up on the
 * index, the Home "Featured work" section and the case study hero.
 */
export function ProjectCard({ project, priority = false }: { project: Project; priority?: boolean }) {
  const locale = useLocale() as Locale
  const tWork = useTranslations('Work')
  const tStatus = useTranslations('ProjectStatus')
  const href = `/work/${project.slug}`
  const titleId = `project-card-${project.slug}`

  return (
    <article aria-labelledby={titleId} className="group flex flex-col">
      <Link href={href} tabIndex={-1} aria-hidden className="block">
        <BrowserFrame
          url={`artaveo.dev/work/${project.slug}`}
          className="transition-colors group-hover:border-foreground/20"
        >
          <div className="relative aspect-[16/10] bg-muted">
            {project.coverImage ? (
              <Image
                src={project.coverImage}
                alt={`${t(project.title, locale)} interface`}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:24px_24px]"
              />
            )}
            {!project.coverImage ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {tWork('screenshotPlaceholder')}
                </span>
              </div>
            ) : null}
          </div>
        </BrowserFrame>
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="brand-soft">{t(project.category, locale)}</Badge>
        {project.status ? <StatusBadge status={project.status} label={tStatus(project.status)} /> : null}
      </div>

      <h3 id={titleId} className="mt-3 text-xl font-semibold tracking-tight text-balance">
        <Link
          href={href}
          className="rounded-sm outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t(project.title, locale)}
        </Link>
      </h3>

      <p className="mt-2 leading-relaxed text-muted-foreground text-pretty line-clamp-3">
        {t(project.summary, locale)}
      </p>

      <ul aria-label={tWork('technologies')} className="mt-4 flex flex-wrap gap-1.5">
        {project.technologies.slice(0, 5).map((tech) => (
          <li key={tech}>
            <Badge variant="muted">
              <LatinTerm>{tech}</LatinTerm>
            </Badge>
          </li>
        ))}
      </ul>
    </article>
  )
}
