'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { THEME_STORAGE_KEY } from '@/lib/theme'

/**
 * Light / dark switch. `tone="glass"` is the glass header's version: Phase 29.1
 * had moved the switch to the end of the footer, where the owner could not find
 * it (20 October 2026), so Phase 31 put it back in the header at every width.
 * `tone="ink"` stays for anything drawn on an ink band.
 */
export function ThemeToggle({ tone = 'default' }: { tone?: 'default' | 'ink' | 'glass' }) {
  const t = useTranslations('Common')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    const root = document.documentElement
    root.classList.toggle('dark', next)
    root.classList.toggle('light', !next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
    } catch {}
  }

  const label = isDark ? t('switchToLightMode') : t('switchToDarkMode')
  const icon = mounted && isDark ? <Moon aria-hidden="true" className="size-4" /> : <Sun aria-hidden="true" className="size-4" />

  if (tone === 'glass') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={mounted ? isDark : undefined}
        data-slot="theme-switch"
        className="grid size-11 shrink-0 place-items-center rounded-pill text-glass-muted outline-none hover:bg-white/6 hover:text-glass-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {icon}
      </button>
    )
  }

  if (tone === 'ink') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={mounted ? isDark : undefined}
        className="grid size-11 place-items-center rounded-pill border border-ink-line text-ink-muted outline-none hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {icon}
      </button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggle}
      aria-label={label}
      aria-pressed={mounted ? isDark : undefined}
    >
      {mounted && isDark ? <Moon /> : <Sun />}
    </Button>
  )
}
