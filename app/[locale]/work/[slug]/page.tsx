import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, permanentRedirect } from 'next/navigation'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { ViewTracker } from '@/components/site/view-tracker'
import { CaseStudy } from '@/components/work/case-study'
import { getAllProjects, getProductBySlug, getProjectBySlug } from '@/lib/home-content-projects'
import { routing } from '@/i18n/routing'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
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
  const description = project.outcomeLine ? t(project.outcomeLine, localeKey) : t(project.summary, localeKey)
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/work/${slug}`),
    ...buildPageOpenGraph({ locale, title, description, eyebrow: project.industry ? t(project.industry, localeKey) : undefined }),
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
    // Phase 30.4: a product that is not in the portfolio lives at /products/[slug] — an old /work link still finds it.
    if (await getProductBySlug(slug)) permanentRedirect(`/${locale}/products/${slug}`)
    notFound()
  }

  const projects = await getAllProjects()
  const currentIndex = projects.findIndex((item) => item.slug === project.slug)
  const nextProject =
    projects.length > 1 ? projects[(currentIndex + 1) % projects.length] : undefined

  const localeKey = locale as Locale
  const [tNav, tWork, shell] = await Promise.all([getTranslations('Nav'), getTranslations('Work'), getShellData()])

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
      <CaseStudy project={project} nextProject={nextProject} whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null} />
    </SiteShell>
  )
}
