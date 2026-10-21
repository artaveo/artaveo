import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — the two grounds of Design System 2.0 (§ 14.1 "dark bands for
 * impact, warm light panels for reading"). The ink band is ink in both
 * themes; the warm panel follows the theme (Phase 32.6, D-22) and gets a
 * hairline in the dark one so its edge still shows against the ink.
 *
 * Each band is an inline-size container, so the components inside it lay out
 * by the width they are given (`@container` variants) — the same component
 * works full-width on a page and inside a narrow preview on /design-system.
 */

/** An ink band: header, hero, products, CTA, footer. */
export function InkBand({
  as: Tag = 'section',
  className,
  children,
  glow = false,
  ...rest
}: {
  as?: 'section' | 'div' | 'footer'
  className?: string
  children: React.ReactNode
  /** Soft gold and blue light at the band's corners (hero, CTA). */
  glow?: boolean
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag className={cn('@container relative isolate overflow-hidden bg-ink text-ink-foreground', className)} {...rest}>
      {glow ? <BandGlow /> : null}
      {children}
    </Tag>
  )
}

/** The warm reading panel: inset 12 px from the edge, 40 px corners (§ 14.1 Layout). */
export function PaperPanel({
  className,
  children,
  ...rest
}: { className?: string; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <div className="bg-ink px-3">
      <section
        className={cn('@container rounded-panel-lg bg-paper px-4 py-14 text-paper-foreground dark:ring-1 dark:ring-white/7 @3xl:px-6 @3xl:py-24', className)}
        {...rest}
      >
        {children}
      </section>
    </div>
  )
}

/** The content width (≈ 1240 px) and side gutter of a band. */
export function BandInner({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('relative mx-auto w-full max-w-[77.5rem] px-4 @3xl:px-6', className)}>{children}</div>
}

/** Eyebrow, heading, one line, and an optional action at the end of the row. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  action,
  tone = 'ink',
  as: Heading = 'h2',
  id,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  lead?: React.ReactNode
  action?: React.ReactNode
  tone?: 'ink' | 'paper'
  as?: 'h1' | 'h2'
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-[40rem]">
        {eyebrow ? (
          <p className={cn('text-small font-bold', tone === 'ink' ? 'text-gold' : 'text-gold-deep')}>{eyebrow}</p>
        ) : null}
        <Heading id={id} className={cn('mt-2 text-balance', Heading === 'h1' ? 'text-h1' : 'text-h2')}>
          {title}
        </Heading>
        {lead ? (
          <p className={cn('mt-3 text-body text-pretty', tone === 'ink' ? 'text-ink-muted' : 'text-paper-muted')}>{lead}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/**
 * Soft radial light — behind the hero mock-ups and inside coloured panels only (§ 14.1 "Glows").
 *
 * The two lights are larger than a short band, so the band's edge used to cut
 * them off in a hard line (owner, 21 October 2026). They sit in a layer that
 * fades to nothing over the band's lower half, so the light dies out before
 * the edge and the band runs into the ink below without a seam.
 */
export function BandGlow() {
  return (
    <div
      aria-hidden="true"
      data-slot="band-glow"
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_40%,transparent_96%)]"
    >
      <div className="absolute -top-56 -left-40 size-[45rem] rounded-full bg-[radial-gradient(circle,rgb(226_182_92/0.2),transparent_65%)]" />
      <div className="absolute top-10 -right-64 size-[47rem] rounded-full bg-[radial-gradient(circle,rgb(64_120_255/0.16),transparent_65%)]" />
    </div>
  )
}
