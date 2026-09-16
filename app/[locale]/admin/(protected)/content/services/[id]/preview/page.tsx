import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ServiceDetail } from '@/components/services/service-detail'
import { FormMessage } from '@/components/ui/form-controls'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getServiceAdmin } from '@/lib/admin/content'
import { getProjectBySlug } from '@/lib/home-content-projects'

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } }
}

/**
 * § 15's "preview" step of draft → preview → publish → unpublish: an
 * admin-only read of the same row the public `/services/[slug]` page
 * would render, regardless of `published` (`getServiceAdmin` — unlike
 * the public `getServiceBySlug`, which 404s on an unpublished slug).
 * Reuses `ServiceDetail` directly rather than a second template, so a
 * preview can never drift from what publishing will actually show.
 */
export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')
  const service = await getServiceAdmin(id)

  if (!service) {
    return <NotFoundState size="page" title={t('cmsServiceNotFoundTitle')} />
  }

  const relatedProjects = (
    await Promise.all((service.relatedProjectSlugs ?? []).map((slug) => getProjectBySlug(slug)))
  ).filter((project): project is NonNullable<typeof project> => Boolean(project))

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-warning/25 bg-warning/10 px-4 py-2">
        <FormMessage variant="warning" className="mx-auto max-w-5xl border-0 bg-transparent p-0">
          {service.published ? t('cmsPreviewBannerPublished') : t('cmsPreviewBannerDraft')}
        </FormMessage>
      </div>
      <ServiceDetail service={service} relatedProjects={relatedProjects} />
    </div>
  )
}
