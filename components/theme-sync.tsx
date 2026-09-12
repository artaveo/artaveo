'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { applyStoredTheme } from '@/lib/theme'

/**
 * Bug fix: switching locale (`fa` ↔ `en`) reset dark mode back to light.
 *
 * Root cause: `<html>`'s `dark`/`light` class is applied imperatively
 * (`classList.toggle`, by the blocking inline script on first paint and by
 * `ThemeToggle` on click) — it lives outside anything React renders, so
 * nothing about it is wrong on its own. But `app/[locale]/layout.tsx` is
 * the *root* layout and reads `params.locale` directly, and `[locale]` is
 * the very first URL segment for every route. Switching locale via the
 * language switcher's `router.replace(..., { locale })` is a real
 * client-side (soft) navigation — no full page reload — but because the
 * root layout's own dynamic param changes, Next.js re-renders that layout
 * from a fresh server payload, and the `<html>` element gets reconciled
 * as part of that. In practice this wipes the class that was set outside
 * React's own render output, so the page silently falls back to light.
 *
 * Fix: re-apply the stored/system theme every time the pathname changes
 * (the raw, un-stripped pathname — it still includes the `/en`/`/fa`
 * prefix, which is exactly what changes on a locale switch) from a
 * component that lives inside the root layout. Whether or not a given navigation actually remounts `<html>`, this runs
 * after the commit and puts the correct class back — so the initial
 * blocking script (`app/[locale]/layout.tsx`) still prevents any flash on
 * first load, and this component keeps it correct on every navigation
 * after that. Renders nothing.
 */
export function ThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      applyStoredTheme()
    } catch {
      // Best-effort — a failure here should never break navigation.
    }
  }, [pathname])

  return null
}
