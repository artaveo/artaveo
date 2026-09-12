'use client'

import { usePathname } from '@/i18n/navigation'
import { getDeveloperProfile } from '@/lib/home-content'
import { PageTransition } from '@/components/site/page-transition'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { StickyMobileCta } from '@/components/ui/identity'
import { cn } from '@/lib/utils'

/**
 * § 5.2: the Sticky Mobile CTA (built in § 4.5) shows on every content page
 * except Home — the Hero already puts an equivalent CTA above the fold —
 * and the internal, noindex `/design-system` tool, which isn't a page a
 * visitor is trying to hire from. This is a deny-list on purpose: every
 * future content page (Work, Services, About, …) opts in automatically
 * without needing to remember to wire the CTA itself.
 *
 * `/contact` (§ 8.3) is exempt for the same reason as Home: the page
 * itself *is* the "Start a project" destination every other CTA points
 * to, so a floating duplicate of the same action would be redundant
 * rather than helpful.
 */
const STICKY_CTA_EXEMPT_PATHS = ['/', '/design-system', '/contact']

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showStickyCta = !STICKY_CTA_EXEMPT_PATHS.includes(pathname)
  const developer = showStickyCta ? getDeveloperProfile() : undefined

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className={cn('flex-1', showStickyCta && 'pb-20 md:pb-0')}>
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      {showStickyCta ? <StickyMobileCta availability={developer?.availability} /> : null}
    </div>
  )
}
