'use client'

import { useTranslations } from 'next-intl'

import { FloatingWhatsAppButton } from '@/components/brand/whatsapp-button'
import { whatsappHref } from '@/lib/shell-settings'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { useShellContact } from '@/components/site/site-flags'

/**
 * Phase 29.1 — the shell of Design System 2.0: the glass header, the page,
 * the ink footer and the floating WhatsApp button (the number from the admin;
 * no number, no button). Phase 31 retired the old mobile call-to-action bar
 * of revisions 1–44 (its availability line went with the Availability Card,
 * § 14.0): the header's *Start a Project* and the WhatsApp button cover it.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const tr = useTranslations('Brand')
  const contact = useShellContact()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Phase 28.4: no whole-page fade on navigation — elements reveal on their own (components/brand/reveal.tsx). */}
        {children}
      </main>
      <SiteFooter />
      <FloatingWhatsAppButton
        href={contact.whatsappNumber ? whatsappHref(contact.whatsappNumber) : null}
        label={tr('whatsapp')}
        className="end-4 bottom-4 md:end-6 md:bottom-6"
      />
    </div>
  )
}
