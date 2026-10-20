'use client'

import { useTranslations } from 'next-intl'

import { FloatingWhatsAppButton } from '@/components/brand/whatsapp-button'
import { usePathname } from '@/i18n/navigation'
import { getDeveloperProfile } from '@/lib/home-content'
import { whatsappHref } from '@/lib/shell-settings'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { useShellContact } from '@/components/site/site-flags'
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
 * `/start` (§ 9.1) is exempt for the same reason as Home: the page itself
 * *is* the "Start a project" destination every other CTA points to now,
 * so a floating duplicate of the same action would be redundant rather
 * than helpful. `/contact` (§ 8.3) stays exempt too — it's still a real,
 * direct "Start a project" alternative (email/WhatsApp/hire channels),
 * just no longer the primary one.
 */
const STICKY_CTA_EXEMPT_PATHS = ['/', '/design-system', '/contact', '/start']

/**
 * Phase 29.1 — the shell of Design System 2.0: the glass header, the page,
 * the ink footer and the floating WhatsApp button (the number from the admin;
 * no number, no button). Where the mobile call-to-action bar is shown the
 * button rides above it on phones, so neither covers the other.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tr = useTranslations('Brand')
  const contact = useShellContact()
  const showStickyCta = !STICKY_CTA_EXEMPT_PATHS.includes(pathname)
  const developer = showStickyCta ? getDeveloperProfile() : undefined

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className={cn('flex-1', showStickyCta && 'pb-20 md:pb-0')}>
        {/* Phase 28.4: no whole-page fade on navigation — elements reveal on their own (components/brand/reveal.tsx). */}
        {children}
      </main>
      <SiteFooter />
      <FloatingWhatsAppButton
        href={contact.whatsappNumber ? whatsappHref(contact.whatsappNumber) : null}
        label={tr('whatsapp')}
        className={cn('end-4 bottom-4 md:end-6 md:bottom-6', showStickyCta && 'bottom-24 md:bottom-6')}
      />
      {showStickyCta ? <StickyMobileCta availability={developer?.availability} /> : null}
    </div>
  )
}
