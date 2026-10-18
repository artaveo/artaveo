import { useTranslations } from 'next-intl'
import type * as React from 'react'

import { Link } from '@/i18n/navigation'

/**
 * Phase 28.5 — the footer of Design System 2.0 (§ 14.0 Footer): the mark and
 * one line, then Products · Services · Artaveo columns and the legal row.
 * Every column comes from data (navigation items, products, services); an
 * empty column is not drawn. `mark` is the logo element, so the footer does
 * not decide which mark file to use.
 */
export type FooterColumn = { title: string; links: { href: string; label: string }[] }

export function BrandFooter({
  mark,
  tagline,
  columns,
  legal,
  year,
}: {
  mark: React.ReactNode
  tagline: string
  columns: FooterColumn[]
  legal: { href: string; label: string }[]
  /** Already formatted for the locale («۱۴۰۵», "2026"). */
  year: string
}) {
  const tr = useTranslations('Brand')
  const filled = columns.filter((column) => column.links.length > 0)
  return (
    <footer className="@container bg-ink px-4 pt-14 pb-8 text-ink-foreground @3xl:px-6" data-slot="brand-footer">
      <div className="mx-auto grid max-w-[77.5rem] gap-8 border-t border-ink-line pt-12 @xl:grid-cols-2 @4xl:grid-cols-4">
        <div>
          {mark}
          <p className="mt-3 text-sm text-ink-muted">{tagline}</p>
        </div>
        {filled.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2.5 text-sm">
            <p className="font-extrabold">{column.title}</p>
            <ul className="flex flex-col gap-2.5 text-ink-subtle">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="rounded-sm outline-none hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-ring/60">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-[77.5rem] flex-wrap justify-between gap-3 border-t border-ink-line pt-5 text-xs text-ink-muted">
        <span>{tr('copyright', { year })}</span>
        {legal.length > 0 ? (
          <ul className="flex gap-4">
            {legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-ink-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  )
}
