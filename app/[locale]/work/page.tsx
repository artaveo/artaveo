import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { JsonLd } from '@/components/site/json-ld'
import { PageHeader } from '@/components/ui/patterns'
import { WorkGrid } from '@/components/work/work-grid'
import { getAllProjects } from '@/lib/home-content-projects'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Work' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale, '/work'),
    ...buildPageOpenGraph({ locale, title: t('title'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Work')
  const tNav = await getTranslations('Nav')
  const projects = await getAllProjects()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/work' },
        ])}
      />
      <div className="container-page">
        <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
        <div className="pb-24">
          <WorkGrid projects={projects} />
        </div>
      </div>
    </SiteShell>
  )
}
