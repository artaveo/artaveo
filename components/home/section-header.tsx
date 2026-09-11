import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type * as React from 'react'

import { cn } from '@/lib/utils'

type SectionHeaderProps = {
  id: string
  eyebrow: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: { href: string; label: string }
  className?: string
}

/**
 * Heading block shared by every home section. Mirrors the design-system
 * `Section` heading (mono eyebrow, balanced title, muted lead) and adds an
 * optional trailing link that moves under the text on small screens.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-brand-text uppercase">
          {eyebrow}
        </span>
        <h2
          id={id}
          className="text-3xl font-semibold tracking-tight text-balance md:text-4xl"
        >
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
          className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-md text-sm font-medium text-foreground outline-none transition-colors hover:text-brand-text focus-visible:ring-3 focus-visible:ring-ring/50 md:self-auto"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  )
}
