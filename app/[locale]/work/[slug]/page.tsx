import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { SiteShell } from '@/components/site/site-shell'
import { CaseStudy } from '@/components/work/case-study'
import { getAllProjects, getProjectBySlug } from '@/lib/home-content'
import { routing } from '@/i18n/routing'
import { t } from '@/types/content'

export function generateStaticParams() {
  const projects = getAllProjects()
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
  const project = getProjectBySlug(slug)
  if (!project) return {}

  const localeKey = locale === 'fa' ? 'fa' : 'en'
  return {
    title: t(project.title, localeKey),
    description: t(project.summary, localeKey),
  }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const project = getProjectBySlug(slug)
  if (!project) {
    notFound()
  }

  const projects = getAllProjects()
  const currentIndex = projects.findIndex((item) => item.slug === project.slug)
  const nextProject =
    projects.length > 1 ? projects[(currentIndex + 1) % projects.length] : undefined

  return (
    <SiteShell>
      <CaseStudy project={project} nextProject={nextProject} />
    </SiteShell>
  )
}
