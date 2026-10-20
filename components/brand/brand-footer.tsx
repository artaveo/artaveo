import { useTranslations } from 'next-intl'
import type * as React from 'react'

import { Link } from '@/i18n/navigation'

/**
 * Phase 28.5 — the footer of Design System 2.0 (§ 14.0 Footer): the mark and
 * one line, then Products · Services · Artaveo · Contact columns and the legal
 * row. Every column comes from data (navigation items, products, services,
 * the contact channels from the admin); an empty column is not drawn. `mark`
 * is the logo element, so the footer does not decide which mark file to use.
 *
 * Phase 29.1: a link may leave the site (e-mail, WhatsApp, phone, a profile)
 * and carry an icon; `tools` is the end of the legal row (the theme switch).
 */
export type FooterLink = {
  href: string
  label: React.ReactNode
  icon?: React.ReactNode
  /** The label's own direction — an e-mail address or a phone number reads left to right on Dari pages too. */
  dir?: 'ltr'
}
export type FooterColumn = { title: string; links: FooterLink[] }

const EXTERNAL = /^(https?:|mailto:|tel:)/

export function BrandFooter({
  mark,
  tagline,
  columns,
  legal,
  year,
  tools,
}: {
  mark: React.ReactNode
  tagline: string
  columns: FooterColumn[]
  legal: { href: string; label: string }[]
  /** Already formatted for the locale («۱۴۰۵», "2026"). */
  year: string
  tools?: React.ReactNode
}) {
  const tr = useTranslations('Brand')
  const filled = columns.filter((column) => column.links.length > 0)
  return (
    <footer className="@container bg-ink px-4 pt-14 pb-8 text-ink-foreground @3xl:px-6" data-slot="brand-footer">
      <div className="mx-auto grid max-w-[77.5rem] gap-8 border-t border-ink-line pt-12 @xl:grid-cols-2 @4xl:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          {mark}
          <p className="mt-3 max-w-[18rem] text-sm text-ink-muted">{tagline}</p>
        </div>
        {filled.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex min-w-0 flex-col gap-2.5 text-sm">
            <p className="font-extrabold">{column.title}</p>
            <ul className="flex flex-col gap-2.5 text-ink-subtle">
              {column.links.map((link) => (
                <li key={link.href} className="min-w-0">
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-[77.5rem] flex-wrap items-center justify-between gap-3 border-t border-ink-line pt-5 text-xs text-ink-muted">
        <span>{tr('copyright', { year })}</span>
        <div className="flex flex-wrap items-center gap-4">
          {legal.length > 0 ? (
            <ul className="flex gap-4">
              {legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-6 items-center rounded-sm outline-none hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-ring/60">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {tools}
        </div>
      </div>
    </footer>
  )
}

function FooterAnchor({ link }: { link: FooterLink }) {
  const className =
    'inline-flex max-w-full items-center gap-2 rounded-sm break-words outline-none hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-ring/60'
  const content = (
    <>
      {link.icon}
      <span dir={link.dir} className="min-w-0 break-words">
        {link.label}
      </span>
    </>
  )
  if (EXTERNAL.test(link.href)) {
    const newTab = /^https?:/.test(link.href)
    return (
      <a href={link.href} className={className} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {content}
      </a>
    )
  }
  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  )
}
