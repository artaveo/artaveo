import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { PageHeader } from '@/components/ui/patterns'
import { WorkGrid } from '@/components/work/work-grid'
import { getAllProjects } from '@/lib/home-content'

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
  const projects = getAllProjects()

  return (
    <SiteShell>
      <div className="container-page">
        <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
        <div className="pb-24">
          <WorkGrid projects={projects} />
        </div>
      </div>
    </SiteShell>
  )
}
