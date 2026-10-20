'use client'

import { useLocale } from 'next-intl'
import type * as React from 'react'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'

/** Each language named in itself, so a reader of either recognises it. */
const NAMES: Record<string, { short: string; full: string }> = {
  en: { short: 'EN', full: 'English' },
  fa: { short: 'دری', full: 'دری' },
}

/**
 * The language switch of the glass header: one link to the same page in the
 * other language (§ 14.0 "language"), labelled in that language («دری» /
 * "EN", read out as "English").
 *
 * Phase 29.1 decided the query string travels with it — a chosen package on
 * /start (`?service=…&package=…`) must survive the switch, or the visitor
 * lands on an empty form. The link itself is rendered without the query, so
 * no page is forced into dynamic rendering by reading search params; the
 * query is read from the address bar when the link is clicked.
 */
export function LocaleLink({ className }: { className?: string }) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale
  const name = NAMES[other] ?? { short: other, full: other }

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    trackEvent('language_switch', { from: locale, to: other })
    const search = window.location.search
    if (!search || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.push(`${pathname}${search}`, { locale: other })
  }

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      aria-label={name.full}
      onClick={onClick}
      className={
        className ??
        'inline-flex min-h-11 items-center rounded-pill px-3 text-small font-semibold text-glass-muted outline-none hover:bg-white/6 hover:text-glass-foreground focus-visible:ring-2 focus-visible:ring-ring/70'
      }
    >
      {name.short}
    </Link>
  )
}
