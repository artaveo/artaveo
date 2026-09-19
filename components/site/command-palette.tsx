'use client'

import { LoaderCircle, RotateCw, Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import {
  RecentOption,
  ResultOption,
  SuggestionChips,
} from '@/components/site/command-palette-parts'
import { Kbd } from '@/components/ui/actions'
import { useVisibleCommandItems } from '@/components/site/site-flags'
import { trackEvent } from '@/lib/analytics'
import { addRecentSearch, clearRecentSearches, readRecentSearches } from '@/lib/search/recent'
import { searchDocuments } from '@/lib/search/scoring'
import { useSearch } from '@/lib/search/use-search'
import { SEARCH_KIND_ORDER, type SearchDocument, type SearchKind, type SearchResult } from '@/lib/search/types'
import type { CommandGroup } from '@/lib/site'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { Locale } from '@/types/content'

/**
 * Phase 18 — Search & Command Palette (roadmap § 12).
 *
 * One box, two sources, one ranked list:
 * - **Site search** — published pages, projects, services, articles and
 *   technologies, from a `SearchProvider` (`lib/search/provider.ts`).
 * - **Commands** — the palette's own built-ins (Start a project, Contact,
 *   the e-mail shortcut, the design system…), matched by the same scorer so
 *   they rank alongside real results. They live in the client, so they keep
 *   working when site search is unavailable (offline, database down).
 *
 * With nothing typed it shows recent searches, one-tap suggestions and the
 * full command list, exactly as before. Keyboard: ↑/↓ move (wrapping), Enter
 * opens, Esc closes; the input is a combobox and the list a listbox, so a
 * screen reader hears the active result without focus ever leaving the input.
 */

type Row =
  | { type: 'recent'; key: string; query: string }
  | { type: 'result'; key: string; result: SearchResult }

type Section = { key: string; label: string; rows: Row[] }

const MAX_PER_GROUP = 6

const asResult = (doc: SearchDocument): SearchResult => ({
  doc,
  score: 0,
  titleRanges: [],
  descriptionRanges: [],
})

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('CommandPalette')
  const tNav = useTranslations('Nav')
  const visibleCommandItems = useVisibleCommandItems()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const keyboardMoved = useRef(false)
  const endedWithNoResults = useRef(false)
  const listId = useId()

  const trimmed = query.trim()
  const search = useSearch({ open, query, locale })

  // ── commands (built-ins), as documents so they use the same scorer ────
  const commands = useMemo(
    () =>
      visibleCommandItems.map((item) => {
        const doc: SearchDocument = {
          id: `command:${item.href}`,
          kind: item.group === 'actions' ? 'action' : 'page',
          href: item.href,
          title:
            item.labelNamespace === 'Nav'
              ? tNav(item.labelKey as Parameters<typeof tNav>[0])
              : t(item.labelKey as 'home' | 'emailArtaveo'),
          keywords: item.keywords?.split(/\s+/).filter(Boolean),
        }
        return { group: item.group, doc }
      }),
    [t, tNav, visibleCommandItems],
  )
  const commandDocs = useMemo(() => commands.map((c) => c.doc), [commands])

  // ── the sections that are on screen ───────────────────────────────────
  const sections = useMemo<Section[]>(() => {
    if (!trimmed) {
      const groupLabel: Record<CommandGroup, string> = {
        navigate: t('groupNavigate'),
        resources: t('groupResources'),
        actions: t('groupActions'),
      }
      const out: Section[] = []
      if (recent.length > 0) {
        out.push({
          key: 'recent',
          label: t('groupRecent'),
          rows: recent.map((q) => ({ type: 'recent', key: `recent:${q}`, query: q })),
        })
      }
      for (const group of ['navigate', 'resources', 'actions'] as const) {
        const rows = commands
          .filter((c) => c.group === group)
          .map<Row>((c) => ({ type: 'result', key: c.doc.id, result: asResult(c.doc) }))
        if (rows.length > 0) out.push({ key: group, label: groupLabel[group], rows })
      }
      return out
    }

    // A command is dropped when site search already returned the same page.
    const indexed = new Set(search.results.map((r) => r.doc.href))
    const local = searchDocuments(commandDocs, query).results.filter((r) => !indexed.has(r.doc.href))
    const merged = [...search.results, ...local].sort((a, b) => b.score - a.score)

    const kindLabel: Record<SearchKind, string> = {
      page: t('groupPages'),
      project: t('groupProjects'),
      service: t('groupServices'),
      article: t('groupArticles'),
      technology: t('groupTechnologies'),
      action: t('groupActions'),
    }
    const byKind = new Map<SearchKind, SearchResult[]>()
    for (const result of merged) {
      const list = byKind.get(result.doc.kind) ?? []
      if (list.length < MAX_PER_GROUP) list.push(result)
      byKind.set(result.doc.kind, list)
    }
    return [...byKind.entries()]
      .sort(
        ([ak, a], [bk, b]) =>
          b[0].score - a[0].score || SEARCH_KIND_ORDER.indexOf(ak) - SEARCH_KIND_ORDER.indexOf(bk),
      )
      .map(([kind, results]) => ({
        key: kind,
        label: kindLabel[kind],
        rows: results.map<Row>((result) => ({ type: 'result', key: result.doc.id, result })),
      }))
  }, [trimmed, query, recent, commands, commandDocs, search.results, t])

  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections])
  const settledEmpty = trimmed !== '' && !search.pending && search.status !== 'loading' && flat.length === 0
  // Only a *working* search that found nothing counts — with search down,
  // "nothing found" would just be the outage again.
  const reportNoResults = settledEmpty && search.status === 'ready'
  const activeId = flat.length > 0 ? `${listId}-${active}` : undefined

  // ── lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    setActive(0)
  }, [query, search.settledQuery, search.status])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setRecent(readRecentSearches())
      endedWithNoResults.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Search that ended with nothing found is worth knowing about — reported
  // once, when the palette closes, with no query text (§ 11.1: never send
  // anything a visitor typed).
  useEffect(() => {
    endedWithNoResults.current = reportNoResults
  }, [reportNoResults])
  useEffect(() => {
    if (!open) return
    return () => {
      if (endedWithNoResults.current) {
        trackEvent('search_used', { outcome: 'no-results', locale })
        endedWithNoResults.current = false
      }
    }
  }, [open, locale])

  // Keep the arrow-key selection in view — but only after a keyboard move, so
  // hovering near the edge of the list doesn't make it jump under the pointer.
  useEffect(() => {
    if (!keyboardMoved.current || !activeId) return
    keyboardMoved.current = false
    document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [active, activeId])

  useFocusTrap(open, panelRef, {
    initialFocusRef: inputRef,
    onEscape: () => onOpenChange(false),
  })

  const choose = useCallback(
    (index: number) => {
      const row = flat[index]
      if (!row) return

      if (row.type === 'recent') {
        setQuery(row.query)
        inputRef.current?.focus()
        return
      }

      const { doc } = row.result
      if (trimmed) {
        addRecentSearch(trimmed)
        trackEvent('search_used', { outcome: 'selected', kind: doc.kind, position: index + 1, locale })
      }
      endedWithNoResults.current = false
      onOpenChange(false)
      if (doc.href.startsWith('mailto:')) {
        window.location.href = doc.href
        return
      }
      router.push(doc.href)
    },
    [flat, trimmed, locale, onOpenChange, router],
  )

  function pickSuggestion(suggestion: string) {
    setQuery(suggestion)
    inputRef.current?.focus()
  }

  function clearRecent() {
    clearRecentSearches()
    setRecent([])
    inputRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    // Only the input drives the list. Enter on a focused button (Retry,
    // a suggestion, "Clear") must keep doing what that button does.
    if (event.target !== inputRef.current) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      keyboardMoved.current = true
      setActive((i) => (i + 1) % Math.max(flat.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      keyboardMoved.current = true
      setActive((i) => (i - 1 + flat.length) % Math.max(flat.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(active)
    }
  }

  if (!open) return null

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const showSuggestions = search.status === 'ready' && search.suggestions.length > 0
  const liveMessage =
    search.status === 'error'
      ? offline
        ? t('errorOffline')
        : t('errorUnavailable')
      : !trimmed
        ? ''
        : search.pending
          ? t('searching')
          : flat.length === 0
            ? t('noResults', { query: trimmed })
            : t('statusResults', { count: flat.length })

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-command flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
    >
      <button
        type="button"
        aria-label={t('close')}
        className="fixed inset-0 bg-overlay backdrop-blur-sm animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={t('searchPlaceholder')}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={80}
          />
          {trimmed && search.pending ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground motion-safe:animate-spin"
            />
          ) : null}
          <Kbd className="hidden shrink-0 sm:inline-flex">ESC</Kbd>
        </div>

        <div ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto p-2" aria-busy={search.pending}>
          {search.status === 'error' ? (
            <div className="mx-1 mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              <p>{offline ? t('errorOffline') : t('errorUnavailable')}</p>
              <button
                type="button"
                onClick={search.retry}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <RotateCw aria-hidden="true" className="size-3" />
                {t('retry')}
              </button>
            </div>
          ) : null}

          {!trimmed && showSuggestions ? (
            <SuggestionChips label={t('suggestionsLabel')} suggestions={search.suggestions} onPick={pickSuggestion} />
          ) : null}

          {flat.length > 0 ? (
            <div
              id={listId}
              role="listbox"
              aria-label={trimmed ? t('resultsLabel') : t('label')}
              // Keeps the caret in the input when a row is clicked.
              onMouseDown={(e) => e.preventDefault()}
            >
              {sections.map((section) => (
                <div key={section.key} role="group" aria-label={section.label} className="mb-1 last:mb-0">
                  <p
                    aria-hidden="true"
                    className="px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
                  >
                    {section.label}
                  </p>
                  {section.rows.map((row) => {
                    flatIndex += 1
                    const index = flatIndex
                    const common = {
                      id: `${listId}-${index}`,
                      active: index === active,
                      onHover: () => setActive(index),
                      onChoose: () => choose(index),
                    }
                    return row.type === 'recent' ? (
                      <RecentOption key={row.key} query={row.query} {...common} />
                    ) : (
                      <ResultOption
                        key={row.key}
                        result={row.result}
                        matchesLabel={
                          row.result.matchedKeyword ? t('matchesKeyword', { keyword: row.result.matchedKeyword }) : undefined
                        }
                        {...common}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {trimmed && flat.length === 0 && search.pending && search.status !== 'error' ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('searching')}</p>
          ) : null}

          {settledEmpty ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-foreground">
                {t('noResults', { query: trimmed })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('noResultsHint')}</p>
              {showSuggestions ? (
                <div className="mt-3 text-start">
                  <SuggestionChips
                    label={t('suggestionsLabel')}
                    suggestions={search.suggestions}
                    onPick={pickSuggestion}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {!trimmed && recent.length > 0 ? (
            <div className="px-3 pt-1 pb-1">
              <button
                type="button"
                onClick={clearRecent}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {t('clearRecent')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t('hintNavigate')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {t('hintOpen')}
          </span>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </div>
  )
}
