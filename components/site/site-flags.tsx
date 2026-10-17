'use client'

import { createContext, useContext, useMemo } from 'react'

import { FALLBACK_SHELL, LEGAL_KEYS, navFor, type ShellContact, type ShellData } from '@/lib/shell-settings'
import { commandItems, type CommandItem, type ContentFlag, type NavItem } from '@/lib/site'

/**
 * Server-resolved facts the client-side nav surfaces (header, mobile nav,
 * footer, command palette) need, handed down from the root layout.
 *
 * - `flags` — which optional sections have real content (Phase 17). No nav
 *   item opts into one at the moment (Phase 26.5); the plumbing stays for
 *   Phase 33.
 * - `shell` — Phase 27.6: the navigation items and contact channels the owner
 *   manages in the admin (`navigation_items`, `site_settings`), read by
 *   `lib/shell-settings-server.ts`. Visibility, order and placement per surface
 *   all come from there; `lib/site.ts` only supplies labels' keys, the command
 *   palette's keywords and the fallback.
 */
export type SiteFlags = Record<ContentFlag, boolean>

type SiteContextValue = { flags: SiteFlags; shell: ShellData }

const SiteFlagsContext = createContext<SiteContextValue>({ flags: { insights: false }, shell: FALLBACK_SHELL })

export function SiteFlagsProvider({
  flags,
  shell = FALLBACK_SHELL,
  children,
}: {
  flags: SiteFlags
  shell?: ShellData
  children: React.ReactNode
}) {
  const value = useMemo(() => ({ flags, shell }), [flags.insights, shell]) // eslint-disable-line react-hooks/exhaustive-deps
  return <SiteFlagsContext.Provider value={value}>{children}</SiteFlagsContext.Provider>
}

function toNavItem(item: { key: NavItem['key']; href: string; hasDescription: boolean }): NavItem {
  return { key: item.key, href: item.href, hasDescription: item.hasDescription }
}

/** The header's items, in the owner's order. */
export function useVisibleMainNav(): NavItem[] {
  const { shell } = useContext(SiteFlagsContext)
  return useMemo(() => navFor(shell, 'header').map(toNavItem), [shell])
}

/** The mobile menu: its own items first, then the footer-only extras (contact, …) except the legal links. */
export function useMobileNav(): { main: NavItem[]; extra: NavItem[] } {
  const { shell } = useContext(SiteFlagsContext)
  return useMemo(() => {
    const main = navFor(shell, 'mobile')
    const mainKeys = new Set(main.map((item) => item.key))
    const extra = navFor(shell, 'footer').filter((item) => !mainKeys.has(item.key) && !LEGAL_KEYS.includes(item.key))
    return { main: main.map(toNavItem), extra: extra.map(toNavItem) }
  }, [shell])
}

/** The footer's three groups: what is also in the header, the rest, and the legal links. */
export function useFooterNav(): { explore: NavItem[]; more: NavItem[]; legal: NavItem[] } {
  const { shell } = useContext(SiteFlagsContext)
  return useMemo(() => {
    const footer = navFor(shell, 'footer')
    const header = new Set(navFor(shell, 'header').map((item) => item.key))
    return {
      explore: footer.filter((item) => header.has(item.key)).map(toNavItem),
      more: footer.filter((item) => !header.has(item.key) && !LEGAL_KEYS.includes(item.key)).map(toNavItem),
      legal: footer.filter((item) => LEGAL_KEYS.includes(item.key)).map(toNavItem),
    }
  }, [shell])
}

/** Command palette entries: the navigation items placed in the palette, plus the e-mail action when an address is set. */
export function useVisibleCommandItems(): CommandItem[] {
  const { flags, shell } = useContext(SiteFlagsContext)
  return useMemo(() => {
    const inPalette = new Map(navFor(shell, 'command-palette').map((item) => [item.key, item]))
    const items: CommandItem[] = []
    for (const command of commandItems) {
      if (command.labelKey === 'emailArtaveo') {
        if (shell.contact.email) items.push({ ...command, href: `mailto:${shell.contact.email}` })
        continue
      }
      if (command.contentFlag && !flags[command.contentFlag]) continue
      const nav = inPalette.get(command.labelKey)
      if (nav) items.push({ ...command, href: nav.href })
    }
    return items
  }, [flags, shell])
}

export function useShellContact(): ShellContact {
  return useContext(SiteFlagsContext).shell.contact
}

export function useShellProfiles(): { href: string; label: string }[] {
  return useContext(SiteFlagsContext).shell.profiles
}
