'use client'

import { ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { LanguageSwitcher } from '@/components/site/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { mainNav, siteConfig, utilityNav } from '@/lib/site'

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-modal lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 bg-overlay backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 end-0 flex w-[min(20rem,85vw)] flex-col border-s border-border bg-background shadow-lg animate-in slide-in-from-right duration-200">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close menu">
            <X />
          </Button>
        </div>

        <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex flex-col rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <span className="text-base font-medium">{item.label}</span>
              {item.description ? (
                <span className="text-xs text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </Link>
          ))}

          <div className="my-2 h-px bg-border" />

          {utilityNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="px-4 pb-5">
          <Button
            className="w-full"
            render={<Link href="/contact" onClick={onClose} />}
          >
            Start a project
            <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
        </div>
        <a
          href={`mailto:${siteConfig.email}`}
          className="px-4 pb-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {siteConfig.email}
        </a>
      </div>
    </div>
  )
}
