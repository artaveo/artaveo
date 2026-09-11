import { ArrowRight, Check } from 'lucide-react'
import NextLink from 'next/link'
import type * as React from 'react'

import { Link } from '@/components/ui/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Tailwind needs each responsive-grid class spelled out literally to pick it up at build time. */
const metaColsClass: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

/**
 * PageHeader — top-of-page header for content pages (/work, /about, /services…).
 * Distinct from `SectionHeader` below: one per page, not one per section.
 * Optional `meta` renders the same divided key/value grid the design-system
 * intro block uses, for a short set of page-level facts (no invented metrics —
 * only real, known values belong here).
 */
type PageHeaderProps = {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  meta?: { k: string; v: string }[]
  className?: string
}

function PageHeader({ eyebrow, title, description, meta, className }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn('py-16 md:py-24', className)}>
      {eyebrow ? (
        <Badge variant="brand-soft" className="mb-6">
          {eyebrow}
        </Badge>
      ) : null}
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      {meta?.length ? (
        <dl
          className={cn(
            'mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border',
            metaColsClass[Math.min(meta.length, 4)],
          )}
        >
          {meta.map((item) => (
            <div key={item.k} className="bg-card p-4">
              <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {item.k}
              </dt>
              <dd className="mt-1 font-medium">{item.v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

/**
 * SectionHeader — heading block shared by every section on a page (promoted
 * from `components/home/section-header.tsx` per roadmap § 4.4; the home file
 * now re-exports this). Mono eyebrow, balanced title, muted lead, and an
 * optional trailing link that moves under the text on small screens.
 */
type SectionHeaderProps = {
  id: string
  eyebrow: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: { href: string; label: string }
  className?: string
}

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        'mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-brand-text uppercase">
          {eyebrow}
        </span>
        <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="leading-relaxed text-muted-foreground text-pretty md:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <Link
          href={action.href}
          variant="standalone"
          showExternalIcon={false}
          className="group self-start md:self-auto"
        >
          {action.label}
          <ArrowRight
            data-icon="inline-end"
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  )
}

/**
 * CTASection — full-width call-to-action block (generalised from the Home
 * "Have a project in mind?" section). One primary action, one optional
 * secondary action.
 */
type CTAAction = { href: string; label: string }

type CTASectionProps = {
  id?: string
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  primaryAction: CTAAction
  secondaryAction?: CTAAction
  className?: string
}

function CTASection({
  id = 'cta-title',
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: CTASectionProps) {
  return (
    <section aria-labelledby={id} className={cn('section-y', className)}>
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center md:px-12 md:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
              {title}
            </h2>
            {description ? (
              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground text-pretty md:text-lg">
                {description}
              </p>
            ) : null}
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-11 px-5 text-[0.95rem]"
                render={<NextLink href={primaryAction.href} />}
              >
                {primaryAction.label}
                <ArrowRight data-icon="inline-end" aria-hidden="true" className="rtl:rotate-180" />
              </Button>
              {secondaryAction ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-5 text-[0.95rem]"
                  render={<NextLink href={secondaryAction.href} />}
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * FeatureList — icon + title + description grid, the same tile shape Home's
 * "Services" section uses, generalised so any page can reuse it (Services
 * detail, About, package comparisons…). `variant="grid"` (default) is the
 * divided-tile grid; `variant="list"` stacks single-column with more room
 * per item (longer descriptions).
 */
type FeatureItem = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description: React.ReactNode
}

function FeatureList({
  items,
  variant = 'grid',
  className,
}: {
  items: FeatureItem[]
  variant?: 'grid' | 'list'
  className?: string
}) {
  if (variant === 'list') {
    return (
      <ul data-slot="feature-list" className={cn('flex flex-col gap-8', className)}>
        {items.map((item) => (
          <li key={item.id} className="flex gap-4">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
            >
              <item.icon className="size-4" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-medium">{item.title}</h3>
              <p className="leading-relaxed text-muted-foreground text-pretty">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul
      data-slot="feature-list"
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 bg-card p-6 md:p-8">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
          >
            <item.icon className="size-4" />
          </span>
          <h3 className="font-medium">{item.title}</h3>
          <p className="leading-relaxed text-muted-foreground text-pretty">{item.description}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * ProofRow — a qualitative row of credibility statements, deliberately
 * numberless (per the benchmark decisions: no invented metrics, no vanity
 * stats with only two real case studies to draw from). Each item is a short
 * factual claim ("Server-side seat holds", "RLS on every table…") prefixed
 * with a check mark, wrapping into a loose row rather than a rigid grid.
 */
function ProofRow({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul
      data-slot="proof-row"
      className={cn('flex flex-wrap items-center gap-x-6 gap-y-3', className)}
    >
      {items.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key -- static, order-stable content
        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check aria-hidden="true" className="size-4 shrink-0 text-brand-text" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export { PageHeader, SectionHeader, CTASection, FeatureList, ProofRow }
export type { FeatureItem, CTAAction }
