import type { Locale } from '@/types/content'

/**
 * Phase 18 — shared shapes for site search (roadmap § 12, "Search & Command
 * Palette").
 *
 * Everything in `lib/search/` except `build-index.ts` is plain, dependency-free
 * TypeScript that runs unchanged in the browser and in Node (the unit tests
 * import it directly). The server-only piece is the index *builder*; the
 * scoring, normalisation and storage helpers never touch the database.
 *
 * The seam for a later server-side provider is `SearchProvider` below: the
 * palette talks only to that interface, so replacing the in-browser matcher
 * with a `GET /api/search?q=` provider means writing one new object and
 * changing one import in `lib/search/provider.ts` — no component changes.
 */

export type SearchKind = 'page' | 'project' | 'service' | 'article' | 'technology' | 'action'

/** Order groups appear in when two groups have an equal best score. */
export const SEARCH_KIND_ORDER: readonly SearchKind[] = [
  'page',
  'project',
  'service',
  'article',
  'technology',
  'action',
]

/**
 * One searchable thing, already resolved to a single locale. The server does
 * all localisation (titles, descriptions, the "used in N projects" line), so
 * the client index carries no translation logic and no `LocalizedText`.
 */
export type SearchDocument = {
  /** Stable, unique within an index — `<kind>:<slug or href>`. */
  id: string
  kind: SearchKind
  /** Locale-independent path (`/work/transportation-system`). The locale-aware router adds the prefix. */
  href: string
  title: string
  /** One short line shown under the title. */
  description?: string
  /** Searchable-only terms (technologies, category). Never rendered as prose. */
  keywords?: string[]
  /** Small ranking nudge — featured work sorts ahead of equal matches. */
  boost?: number
}

export type SearchIndex = {
  locale: Locale
  generatedAt: string
  docs: SearchDocument[]
  /**
   * Terms guaranteed to return at least one result (derived from the same
   * documents), offered as one-tap queries when the box is empty or a search
   * finds nothing.
   */
  suggestions: string[]
}

/** Half-open `[start, end)` range of UTF-16 code units in the *original* string. */
export type Range = readonly [start: number, end: number]

export type SearchResult = {
  doc: SearchDocument
  score: number
  titleRanges: Range[]
  descriptionRanges: Range[]
  /** Set when the only thing that matched was a keyword (e.g. a technology) — shown as "Matches: …". */
  matchedKeyword?: string
}

export type SearchRequest = {
  query: string
  locale: Locale
  limit?: number
}

export type SearchResponse = {
  results: SearchResult[]
  /** Matches before `limit` was applied. */
  total: number
  suggestions: string[]
}

export interface SearchProvider {
  readonly id: string
  /** How long the UI should wait after a keystroke before calling `search`. 0 for an in-memory provider. */
  readonly debounceMs: number
  /**
   * Idempotent warm-up (fetch the index, open a connection…). Resolves when
   * `search` can answer, rejects when it cannot — the UI shows an error state
   * with a retry instead of an empty list.
   */
  prepare(locale: Locale): Promise<void>
  /**
   * An empty query returns no results but still returns `suggestions`.
   * Implementations must reject with an `AbortError` when `signal` aborts.
   */
  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse>
}
