import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { ViewTracker } from '@/components/site/view-tracker'
import { CaseStudy } from '@/components/work/case-study'
import { getAllProjects, getProjectBySlug } from '@/lib/home-content-projects'
import { routing } from '@/i18n/routing'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd, buildCreativeWorkJsonLd } from '@/lib/structured-data'
import { t, type Locale } from '@/types/content'

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return routing.locales.flatMap((locale) =>
    projects.map((project) => ({ locale, slug: project.slug })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return {}

  const localeKey = locale === 'fa' ? 'fa' : 'en'
  const title = t(project.title, localeKey)
  const description = t(project.summary, localeKey)
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/work/${slug}`),
    ...buildPageOpenGraph({ locale, title, description, eyebrow: t(project.category, localeKey) }),
  }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const project = await getProjectBySlug(slug)
  if (!project) {
    notFound()
  }

  const projects = await getAllProjects()
  const currentIndex = projects.findIndex((item) => item.slug === project.slug)
  const nextProject =
    projects.length > 1 ? projects[(currentIndex + 1) % projects.length] : undefined

  const localeKey = locale as Locale
  const tNav = await getTranslations('Nav')
  const tWork = await getTranslations('Work')

  return (
    <SiteShell>
      <JsonLd data={buildCreativeWorkJsonLd(localeKey, project)} />
      <JsonLd
        data={buildBreadcrumbJsonLd(localeKey, [
          { name: tNav('home'), path: '/' },
          { name: tWork('title'), path: '/work' },
          { name: t(project.title, localeKey), path: `/work/${project.slug}` },
        ])}
      />
      <ViewTracker event="project_view" properties={{ slug: project.slug }} />
      <CaseStudy project={project} nextProject={nextProject} />
    </SiteShell>
  )
}
