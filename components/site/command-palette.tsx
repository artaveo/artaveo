'use client'

import { ArrowUpRight, CornerDownLeft, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import { Kbd } from '@/components/ui/actions'
import { visibleCommandItems, type CommandGroup } from '@/lib/site'
import { cn } from '@/lib/utils'

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const t = useTranslations('CommandPalette')
  const tNav = useTranslations('Nav')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const groupLabel: Record<CommandGroup, string> = {
    navigate: t('groupNavigate'),
    resources: t('groupResources'),
    actions: t('groupActions'),
  }

  const items = useMemo(
    () =>
      visibleCommandItems.map((item) => ({
        ...item,
        label:
          item.labelNamespace === 'Nav'
            ? tNav(item.labelKey as Parameters<typeof tNav>[0])
            : t(item.labelKey as 'home' | 'emailArtaveo'),
      })),
    [t, tNav],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      `${item.label} ${item.group} ${item.keywords ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [items, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  const select = useCallback(
    (href: string) => {
      onOpenChange(false)
      if (href.startsWith('mailto:')) {
        window.location.href = href
        return
      }
      router.push(href)
    },
    [onOpenChange, router],
  )

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % Math.max(results.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = results[active]
      if (item) select(item.href)
    }
  }

  if (!open) return null

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-command flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
    >
      <button
        type="button"
        aria-label={t('close')}
        className="fixed inset-0 bg-overlay backdrop-blur-sm animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={t('searchPlaceholder')}
          />
          <Kbd className="hidden shrink-0 sm:inline-flex">ESC</Kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('noResults', { query })}
            </p>
          ) : (
            Array.from(new Set(results.map((r) => r.group))).map((group) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {groupLabel[group]}
                </p>
                {results
                  .filter((r) => r.group === group)
                  .map((item) => {
                    flatIndex += 1
                    const index = flatIndex
                    const isActive = index === active
                    const external = item.href.startsWith('mailto:')
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onMouseMove={() => setActive(index)}
                        onClick={() => select(item.href)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground',
                        )}
                      >
                        <span>{item.label}</span>
                        {isActive ? (
                          external ? (
                            <ArrowUpRight className="size-3.5 text-muted-foreground rtl:-scale-x-100" />
                          ) : (
                            <CornerDownLeft className="size-3.5 text-muted-foreground" />
                          )
                        ) : null}
                      </button>
                    )
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
