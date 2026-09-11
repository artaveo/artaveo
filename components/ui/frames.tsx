import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * BrowserFrame — wraps a screenshot or live preview in a browser-chrome
 * shell (traffic-light dots + optional URL bar). Per § 4.1.3's imagery
 * rules: product screenshots only ever appear inside a frame with demo
 * data, never bare.
 */
function BrowserFrame({
  url,
  children,
  className,
}: {
  url?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="browser-frame"
      className={cn('overflow-hidden rounded-xl border border-border bg-elevated', className)}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        {url ? (
          <div
            dir="ltr"
            className="flex-1 truncate rounded-md bg-background px-3 py-1 text-center font-mono text-xs text-muted-foreground"
          >
            {url}
          </div>
        ) : null}
      </div>
      <div className="bg-background">{children}</div>
    </div>
  )
}

/**
 * DeviceFrame — wraps a screenshot or preview in a phone/tablet shell for
 * mobile-context mockups (case studies, Home "Tech Stack"/Expertise-matrix
 * visuals).
 */
function DeviceFrame({
  variant = 'phone',
  children,
  className,
}: {
  variant?: 'phone' | 'tablet'
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="device-frame"
      data-variant={variant}
      className={cn(
        'mx-auto overflow-hidden rounded-[2.5rem] border-[10px] border-elevated bg-elevated shadow-lg',
        variant === 'phone' ? 'max-w-[300px]' : 'max-w-[520px] rounded-[1.75rem] border-[12px]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'mx-auto rounded-b-2xl bg-elevated',
          variant === 'phone' ? 'h-5 w-28' : 'h-4 w-20',
        )}
      />
      <div className="overflow-hidden rounded-[1.25rem] bg-background">{children}</div>
    </div>
  )
}

/**
 * DiagramContainer — frames an architecture/flow diagram (SVG, or an
 * imported image) with a visible caption and, when the diagram encodes
 * information beyond what the caption says, a fuller text alternative for
 * assistive tech (per § 6.2 "Architecture — accessible diagram + short
 * explanation"). The text alternative is visually hidden, not duplicated
 * on-screen, so sighted and screen-reader readers each get one clear
 * explanation rather than two competing ones.
 */
function DiagramContainer({
  id,
  caption,
  textAlternative,
  children,
  className,
}: {
  id: string
  caption: React.ReactNode
  /** Longer prose description of what the diagram shows, read only by assistive tech. */
  textAlternative?: string
  children: React.ReactNode
  className?: string
}) {
  const describedById = textAlternative ? `${id}-description` : undefined
  return (
    <figure
      data-slot="diagram-container"
      className={cn('rounded-xl border border-border bg-elevated p-6', className)}
    >
      <div role="img" aria-describedby={describedById} className="[&_svg]:h-auto [&_svg]:w-full">
        {children}
      </div>
      {textAlternative ? (
        <p id={describedById} className="sr-only">
          {textAlternative}
        </p>
      ) : null}
      <figcaption className="mt-4 text-center text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  )
}

export { BrowserFrame, DeviceFrame, DiagramContainer }
