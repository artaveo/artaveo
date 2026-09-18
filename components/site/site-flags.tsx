'use client'

import { createContext, useContext, useMemo } from 'react'

import { commandItems, mainNav, type CommandItem, type ContentFlag, type NavItem } from '@/lib/site'

/**
 * Server-resolved facts about which optional sections have real content,
 * handed to the client-side nav surfaces (header, mobile nav, footer,
 * command palette) from the root layout.
 *
 * Phase 17 introduces the first one, `insights`: § 5.2's "Insights hidden
 * until content exists" used to be a hand-flipped `hasContent: false` in
 * `lib/site.ts`; it is now derived from the database (`hasPublishedArticles()`),
 * so the link appears when the first article is published and disappears
 * if the last one is unpublished — with nobody remembering to flip a flag.
 * Items with no `contentFlag` keep the static `hasContent` rule unchanged.
 */
export type SiteFlags = Record<ContentFlag, boolean>

const SiteFlagsContext = createContext<SiteFlags>({ insights: false })

export function SiteFlagsProvider({ flags, children }: { flags: SiteFlags; children: React.ReactNode }) {
  const value = useMemo(() => flags, [flags.insights]) // eslint-disable-line react-hooks/exhaustive-deps
  return <SiteFlagsContext.Provider value={value}>{children}</SiteFlagsContext.Provider>
}

function isVisible(item: { hasContent?: boolean; contentFlag?: ContentFlag }, flags: SiteFlags): boolean {
  if (item.contentFlag) return flags[item.contentFlag]
  return item.hasContent !== false
}

export function useVisibleMainNav(): NavItem[] {
  const flags = useContext(SiteFlagsContext)
  return useMemo(() => mainNav.filter((item) => isVisible(item, flags)), [flags])
}

export function useVisibleCommandItems(): CommandItem[] {
  const flags = useContext(SiteFlagsContext)
  return useMemo(() => commandItems.filter((item) => isVisible(item, flags)), [flags])
}
