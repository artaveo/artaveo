import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { canAccessLeads, canAccessNotifications, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { countExhaustedNotifications } from '@/lib/admin/notifications'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('dashboardTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Re-verified independently of the (protected) layout (roadmap § 13:
  // "permissions checked server-side on every action") — including the
  // MFA gate the layout deliberately doesn't enforce for every page.
  const session = await getAdminSession()
  if (!session) {
    redirect(`/${locale}/admin/login`)
  }
  if (!mfaSatisfied(session)) {
    redirect(`/${locale}/admin/${mfaDestination(session)}`)
  }

  const t = await getTranslations('Admin')
  const hasVerifiedFactor = session.aal.next === 'aal2'
  // Phase 19: a message that failed for good must not depend on the e-mail
  // that just failed to reach the owner — it is also shown here.
  const exhaustedNotifications = canAccessNotifications(session) ? await countExhaustedNotifications() : null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('dashboardEyebrow')}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('dashboardTitle')}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t('signedInAs')}</span>
            <span className="font-medium">{session.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t('roleLabel')}</span>
            <span className="font-medium">{session.role === 'owner' ? t('roleOwner') : t('roleEditor')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {hasVerifiedFactor ? t('mfaStatusEnabled') : t('mfaStatusDisabled')}
            </span>
            <Link href="/admin/security" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('securityLink')}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <span className="text-sm font-medium">{t('cmsNavLink')}</span>
          <Link href="/admin/content" className="text-sm text-primary underline-offset-4 hover:underline">
            {t('cmsOpen')}
          </Link>
        </CardContent>
      </Card>

      {canAccessLeads(session) ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <span className="text-sm font-medium">{t('leadsNavLink')}</span>
            <Link href="/admin/leads" className="text-sm text-primary underline-offset-4 hover:underline">
              {t('leadsDashboardLink')}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {canAccessNotifications(session) ? (
        <>
          {exhaustedNotifications ? (
            <FormMessage variant="destructive">{t('notifExhaustedBanner', { count: exhaustedNotifications })}</FormMessage>
          ) : null}
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <span className="text-sm font-medium">{t('notifNavLink')}</span>
              <Link href="/admin/notifications" className="text-sm text-primary underline-offset-4 hover:underline">
                {t('notifDashboardLink')}
              </Link>
            </CardContent>
          </Card>
        </>
      ) : null}

      <FormMessage variant="info">{t('comingSoonNotice')}</FormMessage>
    </div>
  )
}
