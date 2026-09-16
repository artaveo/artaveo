import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ProjectForm } from '@/components/admin/content/project-form'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { listTechnologiesAdmin } from '@/lib/admin/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsNewProject'), robots: { index: false, follow: false } }
}

export default async function NewProjectPage({
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
  const technologies = await listTechnologiesAdmin()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsProjectsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsNewProject')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('cmsNewProjectNote')}</p>
      </div>
      {technologies === null ? (
        <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>
      ) : (
        <ProjectForm mode="create" technologies={technologies} initialTechnologyIds={[]} />
      )}
    </div>
  )
}
