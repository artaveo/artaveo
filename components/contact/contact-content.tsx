import { CalendarClock, ClipboardList, Mail, Phone } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type * as React from 'react'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { ForwardArrow } from '@/components/brand/brand-icons'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { WhatsAppIcon } from '@/components/brand/whatsapp-icon'
import { LatinTerm } from '@/components/site/latin-term'
import { getDirectContactChannels, type DirectContactKind } from '@/lib/contact-content'
import type { ShellData } from '@/lib/shell-settings'
import { t, type Locale } from '@/types/content'

const CHANNEL_ICONS: Record<DirectContactKind, React.ComponentType<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  phone: Phone,
  email: Mail,
}

/**
 * Phase 31.4 — `/contact`: direct channels only (D-05). WhatsApp, phone and
 * e-mail as large cards on the ink band — each one tap away, each shown only
 * when the owner set it — with the reply commitment (D-08: the same day) in
 * one line. Below, on the warm panel, the two ways to start in writing: the
 * Start-a-Project form and a consultation request. No platform comparison,
 * no availability widget (§ 14.0, retired in revision 45).
 */
export function ContactContent({ shell }: { shell: ShellData }) {
  const locale = useLocale() as Locale
  const tc = useTranslations('ContactPage')
  const tb = useTranslations('Brand')
  const tNav = useTranslations('Nav')
  const channels = getDirectContactChannels(shell.contact)

  return (
    <div className="bg-ink">
      <PageHero titleId="contact-title" trail={[{ href: '/', label: tNav('home') }]} current={tNav('contact')} eyebrow={tc('eyebrow')} title={tc('title')} lead={tc('lead')} />

      {channels.length > 0 ? (
        <InkBand aria-labelledby="contact-channels-title" className="pb-16 @3xl:pb-20" data-slot="contact-channels">
          <BandInner className="flex flex-col gap-8">
            <h2 id="contact-channels-title" className="sr-only">
              {tc('channelsTitle')}
            </h2>
            <ul className="grid gap-4 @3xl:grid-cols-3">
              {channels.map((channel) => {
                const Icon = CHANNEL_ICONS[channel.id]
                return (
                  <li key={channel.id}>
                    <a
                      href={channel.href}
                      {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="hover-lift glass flex h-full flex-col gap-4 rounded-card-lg border border-glass-line p-7 text-glass-foreground outline-none hover:bg-white/12 focus-visible:ring-3 focus-visible:ring-ring/60"
                      data-slot="contact-channel"
                    >
                      <span className={channel.id === 'whatsapp' ? 'grid size-12 place-items-center rounded-2xl bg-whatsapp/20 text-whatsapp-glyph' : 'grid size-12 place-items-center rounded-2xl bg-gold/15 text-gold'}>
                        <Icon className="size-6" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-card-title">{t(channel.label, locale)}</span>
                        <span className="truncate text-body text-glass-muted" dir="ltr">
                          <LatinTerm>{channel.value}</LatinTerm>
                        </span>
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1.5 text-small font-bold text-gold">
                        {tc(`action_${channel.id}`)}
                        <ForwardArrow />
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
            <p className="text-small text-ink-muted">{tc('replyLine')}</p>
          </BandInner>
        </InkBand>
      ) : null}

      <PaperPanel aria-labelledby="contact-paths-title" data-slot="contact-paths">
        <BandInner className="flex flex-col gap-10">
          <SectionHeading tone="paper" id="contact-paths-title" title={tc('pathsTitle')} lead={tc('pathsLead')} />
          <ul className="grid gap-4 @3xl:grid-cols-2">
            <li className="flex flex-col gap-4 rounded-card-lg border border-paper-line bg-paper-card p-7 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-paper-ink text-gold">
                <ClipboardList aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-card-title">{tc('startTitle')}</h3>
                <p className="mt-1.5 text-sm text-pretty text-paper-muted">{tc('startLine')}</p>
              </div>
              <PillLink href="/start" variant="ink" className="mt-auto self-start">
                {tb('start')}
              </PillLink>
            </li>
            <li className="flex flex-col gap-4 rounded-card-lg border border-paper-line bg-paper-card p-7 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-paper-ink text-gold">
                <CalendarClock aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-card-title">{tc('consultationTitle')}</h3>
                <p className="mt-1.5 text-sm text-pretty text-paper-muted">{tc('consultationLine')}</p>
              </div>
              <PillLink href="/consultation" variant="outline" className="mt-auto self-start">
                {tNav('consultation')}
              </PillLink>
            </li>
          </ul>
        </BandInner>
      </PaperPanel>
      <div className="h-16" aria-hidden="true" />
    </div>
  )
}
