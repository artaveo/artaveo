import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — a glass chip floating over a mock-up (§ 14.1 Glass: one of
 * the five places glass is allowed). Short text only: a title and one line.
 * Positioned by the caller (`className`, logical insets), hidden by
 * `DeviceShowcase` on narrow widths.
 */
export function FloatingChip({
  icon: Icon,
  title,
  line,
  tone = 'gold',
  className,
}: {
  icon: LucideIcon
  title: string
  line?: string
  tone?: 'gold' | 'cool'
  className?: string
}) {
  return (
    <div
      className={cn(
        'glass absolute flex items-center gap-3 rounded-card border border-glass-line px-3.5 py-2.5 text-glass-foreground shadow-float',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl',
          tone === 'gold' ? 'bg-gold/16 text-gold' : 'bg-cool/18 text-cool-text',
        )}
      >
        <Icon aria-hidden="true" className="size-[1.15rem]" />
      </span>
      <span className="flex flex-col">
        <span className="text-small font-bold">{title}</span>
        {line ? <span className="text-xs text-glass-muted">{line}</span> : null}
      </span>
    </div>
  )
}
