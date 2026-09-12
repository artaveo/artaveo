'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { THEME_STORAGE_KEY } from '@/lib/theme'

export function ThemeToggle() {
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

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={mounted ? isDark : undefined}
    >
      {mounted && isDark ? <Moon /> : <Sun />}
    </Button>
  )
}
