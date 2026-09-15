import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AdminAuthShell } from '@/components/admin/admin-auth-shell'
import { LoginForm } from '@/components/admin/login-form'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('loginTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Already signed in with everything this session needs — send them
  // straight through instead of showing the login form again.
  const session = await getAdminSession()
  if (session) {
    redirect(mfaSatisfied(session) ? `/${locale}/admin` : `/${locale}/admin/${mfaDestination(session)}`)
  }

  const t = await getTranslations('Admin')

  return (
    <AdminAuthShell eyebrow={t('loginEyebrow')} title={t('loginTitle')} description={t('loginDescription')}>
      <LoginForm locale={locale} />
    </AdminAuthShell>
  )
}
