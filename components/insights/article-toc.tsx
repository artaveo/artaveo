'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { TOC_MIN_ENTRIES, type TocEntry } from '@/lib/articles/markdown'

/**
 * Article table of contents (roadmap § 12 Phase 17 / § 14 "Article ToC").
 *
 * One `<nav>`: on `lg` and up it is always open and sticks beside the body;
 * below `lg` it collapses behind a disclosure button (`aria-expanded`) so it
 * never pushes the article down the page on a phone. The active section is
 * tracked with an `IntersectionObserver` — pure enhancement: without JS
 * (or without `IntersectionObserver`) every link still works as a plain
 * in-page anchor. No animation, so `prefers-reduced-motion` needs no branch.
 */
export function ArticleToc({
  entries,
  label,
  toggleLabel,
}: {
  entries: TocEntry[]
  label: string
  toggleLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id)
          else visible.delete(record.target.id)
        }
        const first = entries.find((entry) => visible.has(entry.id))
        if (first) setActiveId(first.id)
      },
      // The band between just under the sticky header and the upper third of the viewport.
      { rootMargin: '-80px 0px -65% 0px' },
    )
    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries])

  if (entries.length < TOC_MIN_ENTRIES) return null

  return (
    <nav aria-label={label} className="lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="article-toc-list"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium lg:hidden"
      >
        {toggleLabel}
        <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
      </button>

      <div id="article-toc-list" className={cn('mt-3 lg:mt-0 lg:block', open ? 'block' : 'hidden')}>
        <p className="mb-3 hidden font-mono text-xs tracking-widest text-muted-foreground uppercase lg:block">{label}</p>
        <ol className="flex flex-col gap-1 border-s border-border text-sm">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={activeId === entry.id ? 'location' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  '-ms-px block border-s-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground',
                  entry.level === 3 ? 'ps-7' : 'ps-4',
                  activeId === entry.id && 'border-brand font-medium text-foreground',
                )}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
