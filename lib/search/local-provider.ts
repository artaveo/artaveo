import { searchDocuments } from '@/lib/search/scoring'
import type {
  SearchDocument,
  SearchIndex,
  SearchKind,
  SearchProvider,
  SearchRequest,
  SearchResponse,
} from '@/lib/search/types'
import type { Locale } from '@/types/content'

/**
 * Phase 18 — the first `SearchProvider`: the whole (small) index is fetched
 * once per language from `/api/search/index/<locale>` and matched in the
 * browser, so typing never waits on the network after the first open.
 *
 * Failure handling is explicit rather than silent: a failed or malformed
 * fetch rejects `prepare`/`search` (the palette shows an error state with a
 * retry) and is *not* cached, so the next attempt really tries again.
 */

const INDEX_URL = (locale: Locale) => `/api/search/index/${locale}`
const FETCH_TIMEOUT_MS = 8000
/** A tab left open for hours re-fetches instead of searching stale content. */
const MAX_AGE_MS = 30 * 60 * 1000
const DEFAULT_LIMIT = 12

const KINDS: readonly SearchKind[] = ['page', 'project', 'service', 'article', 'technology', 'action']

type Loaded = { promise: Promise<SearchIndex>; loadedAt: number }
const cache = new Map<Locale, Loaded>()

function isDocument(value: unknown): value is SearchDocument {
  if (typeof value !== 'object' || value === null) return false
  const doc = value as Record<string, unknown>
  return (
    typeof doc.id === 'string' &&
    typeof doc.href === 'string' &&
    doc.href.startsWith('/') &&
    typeof doc.title === 'string' &&
    doc.title.length > 0 &&
    typeof doc.kind === 'string' &&
    (KINDS as readonly string[]).includes(doc.kind) &&
    (doc.description === undefined || typeof doc.description === 'string') &&
    (doc.keywords === undefined || (Array.isArray(doc.keywords) && doc.keywords.every((k) => typeof k === 'string'))) &&
    (doc.boost === undefined || typeof doc.boost === 'number')
  )
}

/** Exported for tests. Invalid documents are dropped, not fatal — a bad row must not take search down. */
export function parseSearchIndex(json: unknown, locale: Locale): SearchIndex {
  if (typeof json !== 'object' || json === null) throw new Error('Search index is not an object')
  const raw = json as Record<string, unknown>
  if (raw.locale !== locale || !Array.isArray(raw.docs)) throw new Error('Search index has an unexpected shape')
  return {
    locale,
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    docs: raw.docs.filter(isDocument),
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 60)
      : [],
  }
}

async function fetchIndex(locale: Locale): Promise<SearchIndex> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(INDEX_URL(locale), {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Search index request failed (${response.status})`)
    return parseSearchIndex(await response.json(), locale)
  } finally {
    clearTimeout(timer)
  }
}

function loadIndex(locale: Locale): Promise<SearchIndex> {
  const existing = cache.get(locale)
  if (existing && Date.now() - existing.loadedAt < MAX_AGE_MS) return existing.promise

  const promise = fetchIndex(locale)
  const entry: Loaded = { promise, loadedAt: Date.now() }
  cache.set(locale, entry)
  promise.catch(() => {
    if (cache.get(locale) === entry) cache.delete(locale)
  })
  return promise
}

/** Fire-and-forget warm-up (e.g. when the header's search button is hovered). Never throws. */
export function warmSearchIndex(locale: Locale): void {
  loadIndex(locale).catch(() => {})
}

function abortError(): DOMException {
  return new DOMException('Search aborted', 'AbortError')
}

export const localSearchProvider: SearchProvider = {
  id: 'local',
  debounceMs: 0,

  async prepare(locale) {
    await loadIndex(locale)
  },

  async search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    if (signal?.aborted) throw abortError()
    const index = await loadIndex(request.locale)
    if (signal?.aborted) throw abortError()

    const { results, total } = searchDocuments(index.docs, request.query, {
      limit: request.limit ?? DEFAULT_LIMIT,
    })
    return { results, total, suggestions: index.suggestions }
  },
}
