'use client'

import { useLocale } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * Phase 28.5 — the language switch of the glass header: one link to the same
 * page in the other language (§ 14.0 "language"), labelled in that language
 * («دری» / "EN"). It reads no search params, so it never forces a page into
 * dynamic rendering; Phase 29 decides whether the shell's switch keeps them.
 */
export function LocaleLink({ className }: { className?: string }) {
  const locale = useLocale()
  const pathname = usePathname()
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale
  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      className={
        className ??
        'inline-flex min-h-11 items-center rounded-pill px-3 text-small font-semibold text-glass-muted outline-none hover:bg-white/6 hover:text-glass-foreground focus-visible:ring-2 focus-visible:ring-ring/70'
      }
    >
      {other === 'fa' ? 'دری' : 'EN'}
    </Link>
  )
}
