'use client'

import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

const langs: { code: (typeof routing.locales)[number]; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fa', label: 'فا' },
]

/**
 * Real locale routing (§ 5.1) — replaces the old client-only `lang`/`dir`
 * flip. Switching sends the user to the *same route* in the other locale
 * (never back to Home), via next-intl's locale-aware router, which also
 * persists the choice in the `artaveo-locale` cookie the middleware reads
 * on the next visit.
 */
export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [isPending, startTransition] = useTransition()

  function apply(nextLocale: (typeof routing.locales)[number]) {
    if (nextLocale === locale) return
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- `params` is a generic Record here; next-intl
        // narrows it against the actual route params at each call site.
        { pathname, params },
        { locale: nextLocale },
      )
    })
  }

  return (
    <div
      role="group"
      aria-label="Language"
      aria-busy={isPending}
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
    >
      {langs.map((item) => {
        const active = locale === item.code
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => apply(item.code)}
            aria-pressed={active}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'rounded-[min(var(--radius-md),8px)] px-2 py-0.5 text-xs font-medium transition-colors',
              active
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
