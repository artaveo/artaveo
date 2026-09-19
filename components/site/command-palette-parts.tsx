'use client'

import {
  ArrowUpRight,
  BookOpen,
  Clock,
  CornerDownLeft,
  Cpu,
  FileText,
  FolderOpen,
  Wrench,
  Zap,
} from 'lucide-react'

import { Highlight } from '@/components/site/search-highlight'
import type { SearchKind, SearchResult } from '@/lib/search/types'
import { cn } from '@/lib/utils'

/**
 * Phase 18 — presentational pieces of the command palette, split out of
 * `command-palette.tsx` so the palette itself stays about state, keyboard
 * handling and data flow.
 */

const KIND_ICON: Record<SearchKind, typeof FileText> = {
  page: FileText,
  project: FolderOpen,
  service: Wrench,
  article: BookOpen,
  technology: Cpu,
  action: Zap,
}

export function OptionShell({
  id,
  active,
  onHover,
  onChoose,
  children,
}: {
  id: string
  active: boolean
  onHover: () => void
  onChoose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onChoose}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'text-foreground',
      )}
    >
      {children}
    </div>
  )
}

export function ResultOption({
  id,
  result,
  active,
  matchesLabel,
  onHover,
  onChoose,
}: {
  id: string
  result: SearchResult
  active: boolean
  /** Already-translated "Matches: {keyword}" — passed only for keyword-only hits, and then shown instead of the description. */
  matchesLabel?: string
  onHover: () => void
  onChoose: () => void
}) {
  const { doc } = result
  const Icon = KIND_ICON[doc.kind]
  const external = doc.href.startsWith('mailto:')
  // A keyword-only hit says *why* it matched instead of showing a description
  // with nothing highlighted in it.
  const secondary = matchesLabel ? (
    <bdi dir="auto">{matchesLabel}</bdi>
  ) : doc.description ? (
    <bdi dir="auto">
      <Highlight text={doc.description} ranges={result.descriptionRanges} />
    </bdi>
  ) : null

  return (
    <OptionShell id={id} active={active} onHover={onHover} onChoose={onChoose}>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">
          {/* `bdi` resolves each string's own direction (a Latin technology
              name inside the Persian UI) without changing the row's alignment. */}
          <bdi dir="auto">
            <Highlight text={doc.title} ranges={result.titleRanges} />
          </bdi>
        </span>
        {secondary ? <span className="truncate text-xs text-muted-foreground">{secondary}</span> : null}
      </span>
      {active ? (
        external ? (
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        ) : (
          <CornerDownLeft aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        )
      ) : null}
    </OptionShell>
  )
}

export function RecentOption({
  id,
  query,
  active,
  onHover,
  onChoose,
}: {
  id: string
  query: string
  active: boolean
  onHover: () => void
  onChoose: () => void
}) {
  return (
    <OptionShell id={id} active={active} onHover={onHover} onChoose={onChoose}>
      <Clock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">
        <bdi dir="auto">{query}</bdi>
      </span>
    </OptionShell>
  )
}

export function SuggestionChips({
  label,
  suggestions,
  onPick,
}: {
  label: string
  suggestions: string[]
  onPick: (suggestion: string) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="px-3 pt-2 pb-3">
      <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <bdi dir="auto">{suggestion}</bdi>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
