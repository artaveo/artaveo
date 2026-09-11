import { createNavigation } from 'next-intl/navigation'

import { routing } from '@/i18n/routing'

/**
 * Drop-in replacements for `next/link` and `next/navigation`, aware of
 * `routing`. Components under `app/[locale]` should import `Link`,
 * `useRouter`, `usePathname`, `redirect` and `getPathname` from here
 * instead of `next/navigation` / `next/link` directly, so every generated
 * href is automatically prefixed with the active locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
