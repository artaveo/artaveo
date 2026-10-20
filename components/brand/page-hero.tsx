import { useTranslations } from 'next-intl'
import type * as React from 'react'

import { BandInner, InkBand } from '@/components/brand/bands'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * Phase 31 — the top of a page that is not a project or a product (Services,
 * a service, About, Contact, Start, Consultation): an ink band with the soft
 * glow (§ 14.1), a small path back, an eyebrow, the page's one `h1`, a line
 * and optional actions. `aside` takes the end column on wide screens (the
 * founder's photo on About, the price on a service page).
 */
export function PageHero({
  trail,
  current,
  eyebrow,
  title,
  lead,
  actions,
  aside,
  titleId,
  className,
  children,
}: {
  /** The way back, e.g. Home › Services; the current page closes the path. */
  trail: { href: string; label: string }[]
  current: string
  eyebrow?: React.ReactNode
  title: React.ReactNode
  lead?: React.ReactNode
  actions?: React.ReactNode
  aside?: React.ReactNode
  titleId: string
  className?: string
  /** Anything that belongs under the hero's text on the same band (a short list of chips). */
  children?: React.ReactNode
}) {
  const tb = useTranslations('Brand')
  return (
    <InkBand glow aria-labelledby={titleId} data-slot="page-hero" className={cn('pt-10 pb-16 @3xl:pt-14 @3xl:pb-20', className)}>
      <BandInner className={cn('grid items-center gap-10', aside && '@4xl:grid-cols-[1.2fr_0.8fr]')}>
        <div className="flex min-w-0 flex-col gap-5">
          <nav aria-label={tb('trailLabel')}>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
              {trail.map((step) => (
                <li key={step.href} className="flex items-center gap-2">
                  <Link href={step.href} className="rounded-sm underline-offset-4 outline-none hover:text-ink-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/70">
                    {step.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))}
              <li aria-current="page" className="min-w-0 truncate text-ink-foreground">
                {current}
              </li>
            </ol>
          </nav>
          {eyebrow ? <p className="text-small font-bold text-gold">{eyebrow}</p> : null}
          <h1 id={titleId} className="max-w-[44rem] text-h1 text-balance">
            {title}
          </h1>
          {lead ? <p className="max-w-[40rem] text-body text-pretty text-ink-muted">{lead}</p> : null}
          {actions ? <div className="mt-1 flex max-w-full flex-wrap items-center gap-3">{actions}</div> : null}
          {children}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </BandInner>
    </InkBand>
  )
}
