'use client'

import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import type { LocaleCompleteness } from '@/types/cms'

/**
 * Phase 27 — the header strip of one block / sale option / after-sales service in
 * the project editor: its state, its completeness per language, and the actions
 * that act on the row as a whole (move up / down, show / hide, delete). Showing
 * needs it complete in both languages; the server checks the same.
 */
export function ChildRowControls({
  label,
  published,
  completeness,
  pending,
  isFirst,
  isLast,
  onMove,
  onTogglePublished,
  onDelete,
}: {
  label: string
  published: boolean
  completeness: LocaleCompleteness
  pending: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (direction: -1 | 1) => void
  onTogglePublished: () => void
  onDelete: () => void
}) {
  const t = useTranslations('Admin')
  const canPublish = completeness.en && completeness.fa

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <Badge variant={published ? 'success' : 'outline'}>{published ? t('cmsStatusShown') : t('cmsStatusHidden')}</Badge>
        <CompletenessBadges completeness={completeness} />
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending || isFirst} onClick={() => onMove(-1)} aria-label={t('cmsMoveUp')}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending || isLast} onClick={() => onMove(1)} aria-label={t('cmsMoveDown')}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || (!published && !canPublish)}
          onClick={onTogglePublished}
          title={!published && !canPublish ? t('cmsErrorNotComplete') : undefined}
        >
          {published ? <EyeOff aria-hidden="true" data-icon="inline-start" /> : <Eye aria-hidden="true" data-icon="inline-start" />}
          {published ? t('cmsHide') : t('cmsShow')}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending} onClick={onDelete} aria-label={t('cmsDelete')} className="text-destructive-text">
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

/** `ids` with the item at `index` moved one step in `direction`. */
export function moved(ids: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction
  if (target < 0 || target >= ids.length) return ids
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
