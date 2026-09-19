/**
 * Phase 18 — recent searches, kept only in this browser.
 *
 * Nothing here is ever sent anywhere (the privacy policy says so). A query is
 * remembered only when the visitor *acts* on it — opens a result — never per
 * keystroke, so half-typed words don't pile up. Everything is wrapped in
 * try/catch and validated on read: storage can be blocked (private mode),
 * full, or hold something another version of the site wrote.
 */

export const RECENT_SEARCHES_KEY = 'artaveo-recent-searches'
export const RECENT_SEARCHES_MAX = 5
const MAX_LENGTH = 80
const MIN_LENGTH = 2

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH)
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readRecentSearches(): string[] {
  try {
    const raw = storage()?.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const entry of parsed) {
      if (typeof entry !== 'string') continue
      const value = clean(entry)
      const key = value.toLowerCase()
      if (value.length < MIN_LENGTH || seen.has(key)) continue
      seen.add(key)
      out.push(value)
      if (out.length === RECENT_SEARCHES_MAX) break
    }
    return out
  } catch {
    return []
  }
}

/** Newest first, de-duplicated case-insensitively, capped. Returns the new list. */
export function addRecentSearch(query: string): string[] {
  const value = clean(query)
  const current = readRecentSearches()
  if (value.length < MIN_LENGTH) return current
  const next = [value, ...current.filter((q) => q.toLowerCase() !== value.toLowerCase())].slice(
    0,
    RECENT_SEARCHES_MAX,
  )
  try {
    storage()?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable or full — the list simply isn't remembered.
  }
  return next
}

export function clearRecentSearches(): void {
  try {
    storage()?.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
