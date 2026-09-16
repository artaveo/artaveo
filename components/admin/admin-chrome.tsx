import { getTranslations } from 'next-intl/server'

import { adminSignOut } from '@/app/actions/admin-auth'
import { Link } from '@/i18n/navigation'
import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { Button } from '@/components/ui/button'
import { canAccessLeads, type AdminSession } from '@/lib/admin/auth'

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <ArtaveoMark className="h-5 w-auto text-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{t('dashboardEyebrow')}</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/content"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t('cmsNavLink')}
            </Link>
            {/* § 13's own role definition: leads are owner-only ("editor: content only, no leads") — editors never see this link. */}
            {canAccessLeads(session) ? (
              <Link
                href="/admin/leads"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t('leadsNavLink')}
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.email}</span>
          {/* Plain form submission — sign-out works without client JS. */}
          <form action={signOutForThisLocale}>
            <Button type="submit" variant="outline" size="sm">
              {t('signOutButton')}
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
