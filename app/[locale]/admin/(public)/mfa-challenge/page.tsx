import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AdminAuthShell } from '@/components/admin/admin-auth-shell'
import { MfaChallengeForm } from '@/components/admin/mfa-challenge-form'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('mfaChallengeTitle'),
    robots: { index: false, follow: false },
  }
}

/**
 * Requires an existing aal1 session (proxy.ts already redirects anonymous
 * visitors to /admin/login before this ever renders) but not a
 * satisfied one — that's exactly the state this page exists to resolve.
 * An owner who hasn't enrolled a factor yet lands on /admin/security
 * instead (mfaDestination), not here — there is nothing to challenge.
 */
export default async function AdminMfaChallengePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) {
    redirect(`/${locale}/admin/login`)
  }
  if (mfaSatisfied(session)) {
    redirect(`/${locale}/admin`)
  }
  if (mfaDestination(session) !== 'mfa-challenge') {
    redirect(`/${locale}/admin/security`)
  }

  const t = await getTranslations('Admin')

  return (
    <AdminAuthShell
      eyebrow={t('mfaChallengeEyebrow')}
      title={t('mfaChallengeTitle')}
      description={t('mfaChallengeDescription')}
    >
      <MfaChallengeForm locale={locale} />
    </AdminAuthShell>
  )
}
