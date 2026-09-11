'use client'

import { ArrowRight, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/site/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { mainNav, siteConfig, utilityNav } from '@/lib/site'
import { cn } from '@/lib/utils'

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const tNav = useTranslations('Nav')
  const tCommon = useTranslations('Common')

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
        aria-label={tCommon('closeMenu')}
        className="fixed inset-0 bg-overlay backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 end-0 flex w-[min(20rem,85vw)] flex-col border-s border-border bg-background shadow-lg animate-in slide-in-from-right duration-200">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={tCommon('closeMenu')}>
            <X />
          </Button>
        </div>

        <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col rounded-lg px-3 py-2.5 ps-4 transition-colors hover:bg-muted',
                  active && 'bg-muted',
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-brand"
                  />
                ) : null}
                <span className="text-base font-medium">{tNav(item.key)}</span>
                {item.hasDescription ? (
                  <span className="text-xs text-muted-foreground">
                    {tNav(`${item.key}Description` as Parameters<typeof tNav>[0])}
                  </span>
                ) : null}
              </Link>
            )
          })}

          <div className="my-2 h-px bg-border" />

          {utilityNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {tNav(item.key)}
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
            {tCommon('startProject')}
            <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
        </div>
        <a
          href={`mailto:${siteConfig.email}`}
          dir="ltr"
          className="px-4 pb-4 text-end text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {siteConfig.email}
        </a>
      </div>
    </div>
  )
}
