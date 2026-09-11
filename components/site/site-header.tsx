'use client'

import { ArrowRight, Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { CommandPalette } from '@/components/site/command-palette'
import { LanguageSwitcher } from '@/components/site/language-switcher'
import { MobileNav } from '@/components/site/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { mainNav } from '@/lib/site'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
      <header
        className={cn(
          'sticky top-0 z-sticky border-b transition-colors ease-standard',
          scrolled
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
              {mainNav.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
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
              aria-label="Search"
            >
              <Search className="size-4" />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">
                ⌘K
              </kbd>
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <Button className="hidden sm:inline-flex" render={<Link href="/contact" />}>
              Start a project
              <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
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
