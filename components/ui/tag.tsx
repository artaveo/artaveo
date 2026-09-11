import { X } from 'lucide-react'
import type * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Tag — an interactive chip (selected filter, removable keyword), distinct
 * from `Badge` which is a static label. Renders a `<button>` wrapper when
 * `onRemove` is given so the remove control has a real click target and
 * `aria-label`; otherwise renders as a plain span like `Badge`.
 */
function Tag({
  className,
  children,
  onRemove,
  removeLabel = 'Remove',
  ...props
}: React.ComponentProps<'span'> & { onRemove?: () => void; removeLabel?: string }) {
  return (
    <span
      data-slot="tag"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-muted py-0.5 ps-2 pe-1 text-xs font-medium whitespace-nowrap text-foreground',
        !onRemove && 'pe-2',
        className,
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label={`${removeLabel} ${typeof children === 'string' ? children : ''}`.trim()}
          onClick={onRemove}
          className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

/**
 * StatusBadge — the project-status vocabulary from § 6.1: honest states
 * only, never invented ones. Wraps `Badge` so status color mapping lives
 * in exactly one place.
 */
type ProjectStatus = 'live' | 'in-development' | 'private' | 'archived' | 'concept'

const statusConfig: Record<ProjectStatus, { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  live: { label: 'Live', variant: 'success' },
  'in-development': { label: 'In development', variant: 'warning' },
  private: { label: 'Internal / private', variant: 'muted' },
  archived: { label: 'Archived', variant: 'outline' },
  concept: { label: 'Concept', variant: 'info' },
}

function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus
  className?: string
}) {
  const { label, variant } = statusConfig[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

export { Tag, StatusBadge, type ProjectStatus }
