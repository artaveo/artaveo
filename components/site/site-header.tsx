'use client'

import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { BrandLockup } from '@/components/brand/brand-lockup'
import { GlassHeader } from '@/components/brand/glass-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleLink } from '@/components/brand/locale-link'
import { useHeaderModel, useShellContact } from '@/components/site/site-flags'
import { whatsappHref } from '@/lib/shell-settings'
import { warmSearchIndex } from '@/lib/search/local-provider'
import type { Locale } from '@/types/content'

/**
 * Phase 34: the search window is ~40 KB of script every page used to load and
 * run before anyone asked for it. It now loads when it is first wanted — the
 * pointer or focus reaching the search icon starts the download (with the
 * search index, as before), and a click or the keyboard shortcut mounts it.
 */
const loadPalette = () => import('@/components/site/command-palette')
const CommandPalette = dynamic(() => loadPalette().then((m) => m.CommandPalette), { ssr: false })

/**
 * Phase 29.1 — the site's header: Design System 2.0's glass header (Phase
 * 28.5), fed by the owner's data. Products and Services are mega menus (each
 * drawn only when it has entries — `lib/shell-menus.ts`), then the other
 * header items (Work, About), a search icon with no "⌘K" text, the language
 * link and *Start a Project*; below tablet width they fold into the glass
 * mobile menu. Glass in both themes (§ 14.1: the header is always glass).
 *
 * The search icon opens the command palette (Phase 18). The keyboard
 * shortcut still works — it is just no longer printed in the header.
 */
export function SiteHeader() {
  const tNav = useTranslations('Nav')
  const tCommon = useTranslations('Common')
  const locale = useLocale() as Locale
  const model = useHeaderModel()
  const contact = useShellContact()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchWanted, setSearchWanted] = useState(false)
  const openSearch = (open: boolean) => {
    if (open) setSearchWanted(true)
    setSearchOpen(open)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchWanted(true)
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const label = (link: { key: Parameters<typeof tNav>[0]; href: string }) => ({ href: link.href, label: tNav(link.key) })

  return (
    <>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:start-3 focus-visible:z-toast focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:shadow-lg focus-visible:outline-2 focus-visible:outline-brand"
      >
        {tCommon('skipToContent')}
      </a>

      <GlassHeader
        logo={<BrandLockup />}
        products={model.products}
        allProductsHref={model.allProductsHref}
        services={model.services}
        allServicesHref={model.allServicesHref}
        links={model.links.map(label)}
        mobileLinks={model.mobileLinks.map(label)}
        startHref="/start"
        whatsappHref={contact.whatsappNumber ? whatsappHref(contact.whatsappNumber) : null}
        languageSwitch={<LocaleLink />}
        themeSwitch={<ThemeToggle tone="glass" />}
        onSearch={() => openSearch(true)}
        onSearchWarm={() => {
          void loadPalette()
          warmSearchIndex(locale)
        }}
      />

      {searchWanted ? <CommandPalette open={searchOpen} onOpenChange={openSearch} /> : null}
    </>
  )
}
