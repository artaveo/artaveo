'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

type Lang = 'en' | 'fa'

const langs: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'fa', label: 'فا', dir: 'rtl' },
]

export function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const current = document.documentElement.lang
    setLang(current === 'fa' ? 'fa' : 'en')
  }, [])

  function apply(next: Lang) {
    setLang(next)
    const dir = next === 'fa' ? 'rtl' : 'ltr'
    const root = document.documentElement
    root.lang = next
    root.dir = dir
    try {
      localStorage.setItem('artaveo-lang', next)
    } catch {}
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
    >
      {langs.map((item) => {
        const active = mounted && lang === item.code
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => apply(item.code)}
            aria-pressed={active}
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
