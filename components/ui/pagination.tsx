import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/** Pagination — page-number nav. Purely presentational; the consumer owns routing/state via `href`/`onClick` per item. */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="Pagination"
      data-slot="pagination"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({
  className,
  active,
  ...props
}: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      data-slot="pagination-item"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function PaginationNav({
  className,
  direction,
  ...props
}: React.ComponentProps<'button'> & { direction: 'prev' | 'next' }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={direction === 'prev' ? 'Previous page' : 'Next page'}
      data-slot="pagination-nav"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Icon className="size-4 rtl:rotate-180" aria-hidden="true" />
    </button>
  )
}

function PaginationEllipsis({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn('inline-flex size-8 items-center justify-center text-muted-foreground', className)}
    >
      <MoreHorizontal className="size-4" />
    </span>
  )
}

export { Pagination, PaginationItem, PaginationNav, PaginationEllipsis }
