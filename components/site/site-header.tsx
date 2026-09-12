'use client'

import { ArrowRight, Menu, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { Kbd } from '@/components/ui/actions'
import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { CommandPalette } from '@/components/site/command-palette'
import { LanguageSwitcher } from '@/components/site/language-switcher'
import { MobileNav } from '@/components/site/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { visibleMainNav } from '@/lib/site'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const tNav = useTranslations('Nav')
  const tCommon = useTranslations('Common')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isHome = pathname === '/'
  /**
   * § 5.2: solid on content pages. Home keeps the transparent-until-scroll
   * treatment (its hero sits directly under the header), every other route
   * is solid immediately since there's no hero to show through.
   */
  const solid = scrolled || !isHome

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:start-3 focus-visible:z-toast focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:shadow-lg focus-visible:outline-2 focus-visible:outline-brand"
      >
        {tCommon('skipToContent')}
      </a>

      <header
        className={cn(
          'sticky top-0 z-sticky border-b transition-colors ease-standard',
          solid
            ? 'border-border bg-background/80 backdrop-blur-md'
            : 'border-transparent bg-background',
        )}
      >
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-2" aria-label="Artaveo home">
              <ArtaveoMark className="size-7 text-foreground" />
              <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
                ARTAVEO
              </span>
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {visibleMainNav.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tNav(item.key)}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-[1px] h-px bg-brand"
                      />
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-card py-1.5 pe-2 ps-3 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
              aria-label={tCommon('search')}
            >
              <Search className="size-4" />
              <span className="hidden lg:inline">{tCommon('searchPlaceholder')}</span>
              <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <Button className="hidden sm:inline-flex" render={<Link href="/contact" />}>
              {tCommon('startProject')}
              <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={tCommon('openMenu')}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
