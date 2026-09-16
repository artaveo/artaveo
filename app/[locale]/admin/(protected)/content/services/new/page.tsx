import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ServiceForm } from '@/components/admin/content/service-form'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsNewService'), robots: { index: false, follow: false } }
}

export default async function NewServicePage({
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsServicesEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsNewService')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('cmsNewServiceNote')}</p>
      </div>
      <ServiceForm mode="create" />
    </div>
  )
}
