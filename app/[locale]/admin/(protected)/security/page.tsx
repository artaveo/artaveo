import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { MfaEnrollmentPanel } from '@/components/admin/mfa-enrollment-panel'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession } from '@/lib/admin/auth'

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

  // `aal.next` is aal2 exactly when a confirmed TOTP factor exists (lib/admin/auth.ts).
  const hasVerifiedFactor = session.aal.next === 'aal2'

  const t = await getTranslations('Admin')

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('securityEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('securityTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('securityNote')}</p>
      </div>

      <FormMessage variant="info">{t('mfaOptionalNotice')}</FormMessage>

      <MfaEnrollmentPanel
        locale={locale}
        hasVerifiedFactor={hasVerifiedFactor}
        existingFactorId={hasVerifiedFactor ? 'totp' : undefined}
      />
    </div>
  )
}
