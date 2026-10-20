import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — the pill-shaped actions of Design System 2.0 (§ 14.1 "pill
 * buttons and chips"). One visual rule for links and buttons:
 *
 * - `gold`    — the primary action (Start a Project, Request a demo).
 * - `glass`   — the second action on an ink band or a project block.
 * - `project` — a project's own accent (inside a block that set `projectStyle()`).
 * - `project-solid` — a project's own colour, on a white card.
 * - `project-card` — the link of a project card, in the project colour of the card's theme (32.6).
 * - `ink`     — a dark pill on a warm panel.
 * - `outline` — a quiet choice on a warm panel.
 */
export const pillVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill font-bold whitespace-nowrap transition-[filter,background-color] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        gold: 'bg-gold text-gold-foreground hover:brightness-105',
        glass: 'glass border border-glass-line text-glass-foreground hover:bg-white/12',
        project: 'bg-project-accent text-project-accent-foreground hover:brightness-105',
        'project-solid': 'bg-project text-project-on hover:brightness-110',
        'project-card': 'bg-pc-title text-pc-action-text hover:brightness-110',
        ink: 'bg-paper-foreground text-paper-card hover:brightness-125',
        outline: 'border border-paper-foreground text-paper-foreground hover:bg-paper-foreground/5',
      },
      size: {
        sm: 'min-h-10 px-4 text-small',
        md: 'min-h-11 px-5 text-sm',
        lg: 'min-h-12 px-6 text-body',
      },
    },
    defaultVariants: { variant: 'gold', size: 'md' },
  },
)

export type PillVariant = NonNullable<VariantProps<typeof pillVariants>['variant']>

type PillLinkProps = VariantProps<typeof pillVariants> & {
  href: string
  children: React.ReactNode
  className?: string
  /** Opens outside the site (WhatsApp, a demo): a plain `<a>` with a new tab. */
  external?: boolean
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>

/** A pill that navigates. Internal paths go through the locale-aware `Link`; `#…` stays on the page (Phase 30: a product page's request form). */
export function PillLink({ href, variant, size, className, external, children, ...rest }: PillLinkProps) {
  const classes = cn(pillVariants({ variant, size }), className)
  if (href.startsWith('#')) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  if (external || /^(https?:|mailto:|tel:)/.test(href)) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  )
}
