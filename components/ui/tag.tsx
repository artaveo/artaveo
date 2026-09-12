import { X } from 'lucide-react'
import type * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/content'

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
 * only, never invented ones. Wraps `Badge` so status → color mapping lives
 * in exactly one place (`statusVariant`, also used directly wherever a
 * status needs to be shown without the English fallback label below —
 * e.g. the bilingual `/work` pages, which pass their own translated
 * `label`).
 */
const statusVariant: Record<ProjectStatus, React.ComponentProps<typeof Badge>['variant']> = {
  live: 'success',
  'in-development': 'warning',
  private: 'muted',
  archived: 'outline',
  concept: 'info',
}

/** English-only fallback labels — used by the internal, noindex design-system showcase. */
const statusDefaultLabel: Record<ProjectStatus, string> = {
  live: 'Live',
  'in-development': 'In development',
  private: 'Internal / private',
  archived: 'Archived',
  concept: 'Concept',
}

function StatusBadge({
  status,
  label,
  className,
}: {
  status: ProjectStatus
  /** Translated label. Falls back to the English showcase label when omitted. */
  label?: string
  className?: string
}) {
  return (
    <Badge variant={statusVariant[status]} className={className}>
      {label ?? statusDefaultLabel[status]}
    </Badge>
  )
}

export { Tag, StatusBadge, statusVariant, type ProjectStatus }
