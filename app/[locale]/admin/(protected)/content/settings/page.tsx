import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { SiteSettingsForm } from '@/components/admin/content/site-settings-form'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getSiteSettings } from '@/lib/admin/settings'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsSettingsTitle'), robots: { index: false, follow: false } }
}

export default async function SettingsPage({
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
  const settings = await getSiteSettings()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsSettingsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsSettingsTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('cmsSettingsNote')}</p>
      </div>
      {settings === null ? <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage> : <SiteSettingsForm settings={settings} />}
    </div>
  )
}
