import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/admin-chrome'
import { getAdminSession } from '@/lib/admin/auth'

/**
 * Every page under this group is a real, provisioned admin (a matching
 * `admin_users` row) — but not necessarily MFA-satisfied yet, which is
 * why this layout doesn't also enforce `mfaSatisfied`. `/admin/security`
 * needs to be reachable at aal1 (an owner with no factor enrolled yet has
 * nowhere else to go); only `/admin` (the dashboard) requires the full
 * aal2 an owner's role demands, and enforces that itself.
 */
export default async function ProtectedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) {
    redirect(`/${locale}/admin/login`)
  }

  return (
    <AdminChrome session={session} locale={locale}>
      {children}
    </AdminChrome>
  )
}
