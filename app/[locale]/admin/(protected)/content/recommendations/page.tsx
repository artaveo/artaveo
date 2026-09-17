import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { RecommendationRequestPanel } from '@/components/admin/content/recommendation-request-panel'
import { RecommendationsEditor } from '@/components/admin/content/recommendations-editor'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { listProjectsAdmin, listRecommendationRequestsAdmin, listRecommendationsAdmin, listServicesAdmin } from '@/lib/admin/content'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsRecommendationsTitle'), robots: { index: false, follow: false } }
}

export default async function RecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')

  const [recommendations, requests, projects, services] = await Promise.all([
    listRecommendationsAdmin(),
    listRecommendationRequestsAdmin(),
    listProjectsAdmin(),
    listServicesAdmin(),
  ])

  if (recommendations === null || requests === null || projects === null || services === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('cmsRecommendationsTitle')}</h1>
        <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>
      </div>
    )
  }

  const projectOptions = projects.map((project) => ({ id: project.id, title: project.title }))
  const serviceOptions = services.map((service) => ({ id: service.id, title: service.title }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsRecommendationsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsRecommendationsTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('cmsRecommendationsNote')}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t('cmsRecRequestsHeading')}</h2>
        <RecommendationRequestPanel requests={requests} projects={projectOptions} services={serviceOptions} locale={locale as Locale} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t('cmsRecQueueHeading')}</h2>
        <RecommendationsEditor recommendations={recommendations} projects={projectOptions} services={serviceOptions} locale={locale as Locale} />
      </section>
    </div>
  )
}
