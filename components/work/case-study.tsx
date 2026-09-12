import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LatinTerm } from '@/components/site/latin-term'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrowserFrame } from '@/components/ui/frames'
import { Prose } from '@/components/ui/prose'
import { StatusBadge } from '@/components/ui/tag'
import { t, type Locale, type Project } from '@/types/content'

/**
 * CaseStudy — the shared `/work/[slug]` template (roadmap § 6.1). Every
 * body section (Context, Problem & Goals, Constraints, Architecture, Key
 * Decisions, Engineering Highlight, Data Integrity & Security, Responsive &
 * RTL, Quality, Current Status & Next, Lessons Learned) reads from an
 * optional field on `Project` and renders only when that field is present —
 * "metadata that is unknown or not true is omitted, never guessed" (§ 6.1).
 *
 * Today neither project has those fields filled in yet: writing them means
 * verifying each claim against the real codebase and is the actual work of
 * § 6.2 / § 6.3, which stay gated behind D-06 (publication consent). So this
 * template currently renders the Hero + Snapshot, the already-verified
 * highlights, the tech stack and the real links — everything already true —
 * plus a plain notice that the fuller write-up is still pending, instead of
 * inventing filler content for the missing sections.
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
  const tStatus = useTranslations('ProjectStatus')
  const tNav = useTranslations('Nav')

  const hasFullWriteUp =
    project.context ||
    project.problemAndGoals ||
    (project.constraints && project.constraints.length > 0) ||
    project.architecture ||
    (project.keyDecisions && project.keyDecisions.length > 0) ||
    project.engineeringHighlight ||
    project.dataIntegrityAndSecurity ||
    project.responsiveAndRtl ||
    project.quality ||
    project.currentStatusAndNext ||
    project.lessonsLearned

  return (
    <article className="container-page py-16 md:py-24">
      <Breadcrumb
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('work'), href: '/work' },
          { label: t(project.title, locale) },
        ]}
        className="mb-10"
      />

      {/* Hero + Snapshot */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand-soft">{t(project.category, locale)}</Badge>
          {project.status ? (
            <StatusBadge status={project.status} label={tStatus(project.status)} />
          ) : null}
          {project.year ? (
            <span className="font-mono text-xs text-muted-foreground">{project.year}</span>
          ) : null}
        </div>

        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {t(project.title, locale)}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {t(project.summary, locale)}
        </p>

        <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {project.role ? (
            <div className="bg-card p-4">
              <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {t18n('role')}
              </dt>
              <dd className="mt-1 leading-relaxed">{t(project.role, locale)}</dd>
            </div>
          ) : null}
          <div className="bg-card p-4">
            <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {t18n('stack')}
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <Badge key={tech} variant="muted">
                  <LatinTerm>{tech}</LatinTerm>
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </header>

      {/* Media */}
      <div className="mt-12 md:mt-16">
        <BrowserFrame url={`artaveo.dev/work/${project.slug}`}>
          <div className="relative aspect-[16/9] bg-muted">
            {project.coverImage ? (
              <Image
                src={project.coverImage}
                alt={`${t(project.title, locale)} interface`}
                fill
                priority
                sizes="100vw"
                className="object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {project.slug}
                </span>
              </div>
            )}
          </div>
        </BrowserFrame>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          <Prose>
            {project.context ? (
              <section>
                <h2>{t18n('context')}</h2>
                <p>{t(project.context, locale)}</p>
              </section>
            ) : null}

            {project.problemAndGoals ? (
              <section>
                <h2>{t18n('problemAndGoals')}</h2>
                <p>{t(project.problemAndGoals, locale)}</p>
              </section>
            ) : null}

            {project.constraints?.length ? (
              <section>
                <h2>{t18n('constraints')}</h2>
                <ul>
                  {project.constraints.map((item) => (
                    <li key={item.en}>{t(item, locale)}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {project.role ? (
              <section>
                <h2>{t18n('myRoleAndScope')}</h2>
                <p>{t(project.role, locale)}</p>
              </section>
            ) : null}

            {project.architecture ? (
              <section>
                <h2>{t18n('architecture')}</h2>
                <p>{t(project.architecture, locale)}</p>
              </section>
            ) : null}

            {project.keyDecisions?.length ? (
              <section>
                <h2>{t18n('keyDecisions')}</h2>
                {project.keyDecisions.map((decision, index) => (
                  <div
                    key={index}
                    className="not-prose mt-4 rounded-lg border border-border bg-card p-4"
                  >
                    <p className="text-sm text-muted-foreground">{t(decision.context, locale)}</p>
                    <p className="mt-2 font-medium">{t(decision.decision, locale)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t(decision.tradeoff, locale)}
                    </p>
                  </div>
                ))}
              </section>
            ) : null}

            {project.engineeringHighlight ? (
              <section>
                <h2>{t18n('engineeringHighlight')}</h2>
                <p>{t(project.engineeringHighlight, locale)}</p>
              </section>
            ) : null}

            {project.dataIntegrityAndSecurity ? (
              <section>
                <h2>{t18n('dataIntegrityAndSecurity')}</h2>
                <p>{t(project.dataIntegrityAndSecurity, locale)}</p>
              </section>
            ) : null}

            {project.responsiveAndRtl ? (
              <section>
                <h2>{t18n('responsiveAndRtl')}</h2>
                <p>{t(project.responsiveAndRtl, locale)}</p>
              </section>
            ) : null}

            {project.quality ? (
              <section>
                <h2>{t18n('quality')}</h2>
                <p>{t(project.quality, locale)}</p>
              </section>
            ) : null}

            {project.currentStatusAndNext ? (
              <section>
                <h2>{t18n('currentStatusAndNext')}</h2>
                <p>{t(project.currentStatusAndNext, locale)}</p>
              </section>
            ) : null}

            {project.lessonsLearned ? (
              <section>
                <h2>{t18n('lessonsLearned')}</h2>
                <p>{t(project.lessonsLearned, locale)}</p>
              </section>
            ) : null}
          </Prose>

          {!hasFullWriteUp ? (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/40 p-6">
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {t18n('pendingNotice')}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {t18n('highlights')}
            </h2>
            <ul className="mt-4 space-y-2.5">
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

            {project.liveUrl || project.githubUrl ? (
              <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
                <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {t18n('links')}
                </h3>
                {project.liveUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    render={<a href={project.liveUrl} target="_blank" rel="noreferrer" />}
                  >
                    {t18n('liveDemo')}
                    <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
                    <span className="sr-only">{t18n('opensNewTab')}</span>
                  </Button>
                ) : null}
                {project.githubUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    render={<a href={project.githubUrl} target="_blank" rel="noreferrer" />}
                  >
                    {t18n('repository')}
                    <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
                    <span className="sr-only">{t18n('opensNewTab')}</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {nextProject ? (
        <div className="mt-20 border-t border-border pt-10 md:mt-28">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {t18n('nextProject')}
          </span>
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
