import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { CaseStudy } from '@/components/work/case-study'
import { FormMessage } from '@/components/ui/form-controls'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getProjectAdmin } from '@/lib/admin/content'

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } }
}

/** § 15's preview step — admin-only read of the same row `/work/[slug]` would render, reusing `CaseStudy` directly against draft data (`getProjectAdmin`, ignores `published`). No `nextProject` — a preview isn't part of the real "next case study" sequence. */
export default async function ProjectPreviewPage({
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
  const project = await getProjectAdmin(id)

  if (!project) {
    return <NotFoundState size="page" title={t('cmsProjectNotFoundTitle')} />
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-warning/25 bg-warning/10 px-4 py-2">
        <FormMessage variant="warning" className="mx-auto max-w-5xl border-0 bg-transparent p-0">
          {project.published ? t('cmsPreviewBannerPublished') : t('cmsPreviewBannerDraft')}
        </FormMessage>
      </div>
      <CaseStudy project={project} />
    </div>
  )
}
