import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { MfaEnrollmentPanel } from '@/components/admin/mfa-enrollment-panel'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession } from '@/lib/admin/auth'
import { createAuthServerClient } from '@/lib/supabase/server-auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('securityTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminSecurityPage({
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

  const authClient = await createAuthServerClient()
  const { data: factorsData } = authClient
    ? await authClient.auth.mfa.listFactors()
    : { data: null }
  const verifiedFactor = factorsData?.totp?.[0]

  const t = await getTranslations('Admin')

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('securityEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('securityTitle')}</h1>
      </div>

      <FormMessage variant={session.role === 'owner' ? 'warning' : 'info'}>
        {session.role === 'owner' ? t('mfaRequiredNotice') : t('mfaOptionalNotice')}
      </FormMessage>

      <MfaEnrollmentPanel
        locale={locale}
        hasVerifiedFactor={Boolean(verifiedFactor)}
        existingFactorId={verifiedFactor?.id}
      />
    </div>
  )
}
