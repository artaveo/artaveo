import { getTranslations } from 'next-intl/server'

import { adminSignOut } from '@/app/actions/admin-auth'
import { Link } from '@/i18n/navigation'
import { AdminBreadcrumbs, AdminNavLinks, type AdminNavLink } from '@/components/admin/admin-nav'
import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { Button } from '@/components/ui/button'
import { canAccessLeads, canAccessNotifications, type AdminSession } from '@/lib/admin/auth'

export async function AdminChrome({
  session,
  locale,
  children,
}: {
  session: AdminSession
  locale: string
  children: React.ReactNode
}) {
  const t = await getTranslations('Admin')
  const signOutForThisLocale = adminSignOut.bind(null, locale)

  // The roles decide which sections exist for this admin (§ 13): editors see content only.
  const links: AdminNavLink[] = [
    { href: '/admin', labelKey: 'dashboardTitle' },
    { href: '/admin/content', labelKey: 'cmsNavLink' },
    // Leads and consultations hold the client's details — owner only (§ 13, Phase 20).
    ...(canAccessLeads(session)
      ? [
          { href: '/admin/leads', labelKey: 'leadsNavLink' },
          { href: '/admin/consultations', labelKey: 'consultationsNavLink' },
        ]
      : []),
    // The notification log holds full lead e-mails; the monitoring page can point at leads — owner only (Phases 19, 24).
    ...(canAccessNotifications(session)
      ? [
          { href: '/admin/notifications', labelKey: 'notifNavLink' },
          { href: '/admin/observability', labelKey: 'obsNavLink' },
        ]
      : []),
    { href: '/admin/security', labelKey: 'securityEyebrow' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={t('dashboardTitle')}>
            <ArtaveoMark className="h-5 w-auto text-foreground" />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{t('dashboardEyebrow')}</span>
          </Link>
          <AdminNavLinks links={links} />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground lg:inline">{session.email}</span>
          {/* Plain form submission — sign-out works without client JS. */}
          <form action={signOutForThisLocale}>
            <Button type="submit" variant="outline" size="sm">
              {t('signOutButton')}
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">
        <AdminBreadcrumbs />
        {children}
      </main>
    </div>
  )
}
