'use client'

import { ArrowUpRight, CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { commandItems } from '@/lib/site'
import { cn } from '@/lib/utils'

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commandItems
    return commandItems.filter((item) =>
      `${item.label} ${item.group} ${item.keywords ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [query])

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
      className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close command palette"
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
            placeholder="Search pages and actions…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Array.from(new Set(results.map((r) => r.group))).map((group) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {group}
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
                          'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground',
                        )}
                      >
                        <span>{item.label}</span>
                        {isActive ? (
                          external ? (
                            <ArrowUpRight className="size-3.5 text-muted-foreground" />
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
