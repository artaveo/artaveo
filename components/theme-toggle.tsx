'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { THEME_STORAGE_KEY } from '@/lib/theme'

/**
 * Light / dark switch. `tone="ink"` is the footer's version (Phase 29.1): the
 * header of Design System 2.0 carries no theme control (§ 14.0), and the ink
 * bands look the same in both themes, so the switch sits at the end of the
 * footer's legal row.
 */
export function ThemeToggle({ tone = 'default' }: { tone?: 'default' | 'ink' }) {
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
