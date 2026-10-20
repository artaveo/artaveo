'use client'

import { createContext, useContext, useMemo } from 'react'

import { buildFooterModel, buildHeaderModel, EMPTY_MENUS, type FooterModel, type HeaderModel, type ShellMenus } from '@/lib/shell-menus'
import { FALLBACK_SHELL, navFor, type ShellContact, type ShellData } from '@/lib/shell-settings'
import { commandItems, type CommandItem, type ContentFlag } from '@/lib/site'

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
 * - `menus` — Phase 29.1: the published products and services the header's
 *   mega menus and the footer list (`lib/shell-menus.ts`).
 */
export type SiteFlags = Record<ContentFlag, boolean>

type SiteContextValue = { flags: SiteFlags; shell: ShellData; menus: ShellMenus }

const SiteFlagsContext = createContext<SiteContextValue>({ flags: { articles: false }, shell: FALLBACK_SHELL, menus: EMPTY_MENUS })

export function SiteFlagsProvider({
  flags,
  shell = FALLBACK_SHELL,
  menus = EMPTY_MENUS,
  children,
}: {
  flags: SiteFlags
  shell?: ShellData
  menus?: ShellMenus
  children: React.ReactNode
}) {
  const value = useMemo(() => ({ flags, shell, menus }), [flags.articles, shell, menus]) // eslint-disable-line react-hooks/exhaustive-deps
  return <SiteFlagsContext.Provider value={value}>{children}</SiteFlagsContext.Provider>
}

/** The glass header and its mobile menu (Phase 29.1). */
export function useHeaderModel(): HeaderModel {
  const { shell, menus } = useContext(SiteFlagsContext)
  return useMemo(() => buildHeaderModel(shell, menus), [shell, menus])
}

/** The footer's columns (Phase 29.1). */
export function useFooterModel(): FooterModel {
  const { shell, menus } = useContext(SiteFlagsContext)
  return useMemo(() => buildFooterModel(shell, menus), [shell, menus])
}

/** Command palette entries: the navigation items placed in the palette, plus the e-mail action when an address is set. */
export function useVisibleCommandItems(): CommandItem[] {
  const { flags, shell, menus } = useContext(SiteFlagsContext)
  return useMemo(() => {
    const inPalette = new Map(navFor(shell, 'command-palette').map((item) => [item.key, item]))
    const items: CommandItem[] = []
    for (const command of commandItems) {
      if (command.labelKey === 'emailArtaveo') {
        if (shell.contact.email) items.push({ ...command, href: `mailto:${shell.contact.email}` })
        continue
      }
      if (command.contentFlag && !flags[command.contentFlag]) continue
      // Phase 30: Products only while a product is published.
      if (command.labelKey === 'products' && menus.products.length === 0) continue
      const nav = inPalette.get(command.labelKey)
      if (nav) items.push({ ...command, href: nav.href })
    }
    return items
  }, [flags, shell, menus])
}

export function useShellContact(): ShellContact {
  return useContext(SiteFlagsContext).shell.contact
}

export function useShellProfiles(): { href: string; label: string }[] {
  return useContext(SiteFlagsContext).shell.profiles
}
