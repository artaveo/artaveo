'use client'

import { useCallback, useEffect, useState } from 'react'

import { searchProvider } from '@/lib/search/provider'
import type { SearchProvider, SearchResult } from '@/lib/search/types'
import type { Locale } from '@/types/content'

/**
 * Phase 18 — the palette's only connection to a `SearchProvider`.
 *
 * - `status` is about the *provider* (index loaded or not), never about the
 *   query. `error` means site search is unavailable; the palette keeps its
 *   built-in pages and actions working and offers a retry.
 * - Results always belong to the last query that actually completed
 *   (`settledQuery`). While a newer query is in flight the previous results
 *   stay on screen and `pending` is true, so the list never flashes empty
 *   between keystrokes and "no results" is only claimed for a query that
 *   really finished.
 * - Every request carries an `AbortSignal`; an answer that arrives after the
 *   query has changed (or the palette closed) is discarded, so results can
 *   never come back out of order.
 */

export type SearchStatus = 'loading' | 'ready' | 'error'

export function useSearch({
  open,
  query,
  locale,
  provider = searchProvider,
  limit = 12,
}: {
  open: boolean
  query: string
  locale: Locale
  provider?: SearchProvider
  limit?: number
}) {
  const trimmed = query.trim()
  const [status, setStatus] = useState<SearchStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [settledQuery, setSettledQuery] = useState('')

  // 1. Load the index each time the palette opens (a no-op once it is cached).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus('loading')
    provider.prepare(locale).then(
      () => {
        if (!cancelled) setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [open, locale, provider, attempt])

  // 2. Run the query once the provider is ready.
  useEffect(() => {
    if (!open || status !== 'ready') return
    const controller = new AbortController()

    async function run() {
      try {
        const response = await provider.search({ query: trimmed, locale, limit }, controller.signal)
        if (controller.signal.aborted) return
        setResults(response.results)
        setSuggestions(response.suggestions)
        setSettledQuery(trimmed)
      } catch {
        if (controller.signal.aborted) return
        setStatus('error')
      }
    }

    if (provider.debounceMs > 0 && trimmed) {
      const timer = setTimeout(run, provider.debounceMs)
      return () => {
        clearTimeout(timer)
        controller.abort()
      }
    }
    void run()
    return () => controller.abort()
  }, [open, status, trimmed, locale, provider, limit])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    status,
    results,
    suggestions,
    settledQuery,
    /** A query (or the index) is still being resolved. */
    pending: status === 'loading' || (status === 'ready' && trimmed !== settledQuery),
    retry,
  }
}
