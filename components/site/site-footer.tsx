'use client'

import { Mail, Phone } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { BrandFooter, type FooterLink } from '@/components/brand/brand-footer'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { WhatsAppIcon } from '@/components/brand/whatsapp-icon'
import { useFooterModel, useShellContact, useShellProfiles } from '@/components/site/site-flags'
import { ThemeToggle } from '@/components/theme-toggle'
import { formatDate } from '@/lib/format'
import { formatPhoneNumber, telHref, whatsappHref } from '@/lib/shell-settings'
import type { Locale } from '@/types/content'

/**
 * Phase 29.1 — the site's footer: Design System 2.0's ink footer (§ 14.0
 * Footer: Products · Services · Artaveo · contact; legal), every column from
 * the owner's data — the published products and services, the footer's
 * navigation items, the contact channels and profiles from the admin. An
 * empty column is not drawn (no product published → no Products column).
 * The theme switch sits at the end of the legal row. The year follows the
 * site's calendars: «۱۴۰۵» on Dari pages, 2026 on English ones.
 */
export function SiteFooter() {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const tNav = useTranslations('Nav')
  const model = useFooterModel()
  const contact = useShellContact()
  const profiles = useShellProfiles()

  const contactLinks: FooterLink[] = [
    ...(contact.whatsappNumber
      ? [{ href: whatsappHref(contact.whatsappNumber), label: tr('footerWhatsapp'), icon: <WhatsAppIcon className="text-whatsapp-glyph" /> }]
      : []),
    ...(contact.email ? [{ href: `mailto:${contact.email}`, label: contact.email, dir: 'ltr' as const, icon: <Mail aria-hidden="true" className="size-4 shrink-0" /> }] : []),
    ...(contact.phoneNumber
      ? [{ href: telHref(contact.phoneNumber), label: formatPhoneNumber(contact.phoneNumber), dir: 'ltr' as const, icon: <Phone aria-hidden="true" className="size-4 shrink-0" /> }]
      : []),
    ...profiles.map((profile) => ({ href: profile.href, label: profile.label })),
  ].filter((link, index, all) => all.findIndex((other) => other.href === link.href) === index)

  return (
    <BrandFooter
      mark={<BrandLockup />}
      tagline={tr('footerTagline')}
      year={formatDate(new Date().toISOString(), locale, { day: undefined, month: undefined, year: 'numeric' })}
      columns={[
        { title: tr('products'), links: model.products.map((entry) => ({ href: entry.href, label: entry.title })) },
        {
          title: tr('services'),
          links: [
            ...model.services.map((entry) => ({ href: entry.href, label: entry.title })),
            ...(model.allServicesHref ? [{ href: model.allServicesHref, label: tr('allServices') }] : []),
          ],
        },
        { title: tr('footerArtaveo'), links: model.pages.map((link) => ({ href: link.href, label: tNav(link.key) })) },
        { title: tr('footerContact'), links: contactLinks },
      ]}
      legal={model.legal.map((link) => ({ href: link.href, label: tNav(link.key) }))}
      tools={<ThemeToggle tone="ink" />}
    />
  )
}
