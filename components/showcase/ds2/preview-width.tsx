'use client'

import { createContext, useContext, useState } from 'react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Phase 28 — "every component in three sizes". The Design System 2.0
 * components lay out by their container's width (`@container`), so one
 * switch at the top of the section narrows every preview to a phone, a
 * tablet or a desktop width — the same layouts a visitor gets at those
 * screen widths, with the page itself staying where it is.
 */
export const PREVIEW_WIDTHS = [
  { id: 'phone', label: 'Phone · 375', px: 375 },
  { id: 'tablet', label: 'Tablet · 768', px: 768 },
  { id: 'desktop', label: 'Desktop · 1240', px: 1240 },
] as const

type WidthId = (typeof PREVIEW_WIDTHS)[number]['id']

const WidthContext = createContext<WidthId>('desktop')

export function PreviewWidthProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState<WidthId>('desktop')
  return (
    <WidthContext.Provider value={width}>
      <div
        role="radiogroup"
        aria-label="Preview width"
        className="sticky top-16 z-sticky mb-10 flex w-fit flex-wrap gap-1 rounded-pill border border-border bg-background/90 p-1 backdrop-blur"
      >
        {PREVIEW_WIDTHS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={width === option.id}
            onClick={() => setWidth(option.id)}
            className={cn(
              'min-h-9 rounded-pill px-4 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
              width === option.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {children}
    </WidthContext.Provider>
  )
}

/** One preview, as wide as the chosen size (never wider than the page). */
export function Preview({ children, label, className }: { children: React.ReactNode; label?: string; className?: string }) {
  const id = useContext(WidthContext)
  const px = PREVIEW_WIDTHS.find((w) => w.id === id)?.px ?? 1240
  return (
    <figure className="flex flex-col gap-2">
      <div
        data-preview-width={id}
        style={{ maxWidth: px }}
        className={cn('mx-auto w-full overflow-hidden rounded-2xl border border-border', className)}
      >
        {children}
      </div>
      {label ? <figcaption className="text-center font-mono text-xs text-muted-foreground">{label}</figcaption> : null}
    </figure>
  )
}
