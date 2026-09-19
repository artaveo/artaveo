import {
  mergeRanges,
  normalizeWithMap,
  prepareText,
  tokenize,
  toOriginalRange,
  type Prepared,
} from '@/lib/search/normalize'
import type { Range, SearchDocument, SearchKind, SearchResult } from '@/lib/search/types'
import { SEARCH_KIND_ORDER } from '@/lib/search/types'

/**
 * Phase 18 — the matcher behind the in-browser search provider.
 *
 * Deliberately small and predictable (a handful of documents, two
 * languages) rather than a general full-text engine:
 *
 * - The query is split into words. **Every** word must match somewhere in a
 *   document (title, a keyword, or the description); the order doesn't matter.
 * - A word matches a document word exactly, as a prefix (`sea` → `seat`), or —
 *   for words of three letters or more — anywhere inside it (`base` → `Supabase`).
 * - If the word-by-word match fails, the whole query is tried with separators
 *   removed, so `nextjs` finds `Next.js` and `tailwind css` finds `TailwindCSS`.
 * - Title hits outweigh keyword hits, which outweigh description hits; an
 *   exact title, a title that starts with the query, and every word landing
 *   in the title each add a bonus. Featured work carries a small boost.
 *
 * No typo tolerance: a misspelt word finds nothing rather than something
 * plausible-but-wrong (see PHASE-18-README, "Not built").
 */

export const MAX_QUERY_LENGTH = 80
export const MAX_QUERY_WORDS = 6

const W_TITLE = 10
const W_KEYWORD = 6
const W_DESCRIPTION = 2.5

type Rank = 1 | 2 | 3 // substring · prefix · exact
const RANK_FACTOR: Record<Rank, number> = { 3: 1, 2: 0.8, 1: 0.4 }
const COMPACT_FACTOR = 0.7

const BONUS_EXACT_TITLE = 40
const BONUS_TITLE_STARTS_WITH = 15
const BONUS_ALL_WORDS_IN_TITLE = 8
const BONUS_FIRST_TITLE_WORD = 1.5

const KIND_BONUS: Record<SearchKind, number> = {
  page: 2,
  project: 1,
  service: 1,
  article: 1,
  technology: 0,
  action: 0,
}

export type ParsedQuery = {
  words: string[]
  phrase: string
  compact: string
}

/** `null` when the query has nothing searchable in it (empty, punctuation only). */
export function parseQuery(raw: string): ParsedQuery | null {
  const folded = normalizeWithMap(raw.slice(0, MAX_QUERY_LENGTH)).text
  const seen = new Set<string>()
  const words: string[] = []
  for (const word of tokenize(folded)) {
    if (seen.has(word.value)) continue
    seen.add(word.value)
    words.push(word.value)
    if (words.length === MAX_QUERY_WORDS) break
  }
  if (words.length === 0) return null
  return { words, phrase: words.join(' '), compact: words.join('') }
}

type PreparedKeyword = { text: string; p: Prepared }
export type PreparedDocument = {
  doc: SearchDocument
  index: number
  title: Prepared
  description?: Prepared
  keywords: PreparedKeyword[]
}

const preparedCache = new WeakMap<readonly SearchDocument[], PreparedDocument[]>()

export function prepareDocuments(docs: readonly SearchDocument[]): PreparedDocument[] {
  const cached = preparedCache.get(docs)
  if (cached) return cached
  const prepared = docs.map((doc, index) => ({
    doc,
    index,
    title: prepareText(doc.title),
    description: doc.description ? prepareText(doc.description) : undefined,
    keywords: (doc.keywords ?? []).map((text) => ({ text, p: prepareText(text) })),
  }))
  preparedCache.set(docs, prepared)
  return prepared
}

type FieldHit = { rank: Rank; wordIndex: number; ranges: [number, number][] }

function matchWord(field: Prepared, word: string): FieldHit | null {
  let best: { rank: Rank; wordIndex: number } | null = null
  const found: { rank: Rank; range: [number, number] }[] = []

  for (let i = 0; i < field.words.length; i++) {
    const candidate = field.words[i]
    let rank: Rank | 0 = 0
    let start = candidate.start
    if (candidate.value === word) {
      rank = 3
    } else if (candidate.value.startsWith(word)) {
      rank = 2
    } else if (word.length >= 3) {
      const at = candidate.value.indexOf(word)
      if (at >= 0) {
        rank = 1
        start = candidate.start + at
      }
    }
    if (rank === 0) continue
    if (!best || rank > best.rank) best = { rank, wordIndex: i }
    found.push({ rank, range: [start, start + word.length] })
  }

  if (!best) return null
  // Highlight substring hits only when nothing better matched, so `sea` in
  // "Seat holding" doesn't also light up the middle of "research".
  const keepSubstrings = best.rank === 1
  return {
    rank: best.rank,
    wordIndex: best.wordIndex,
    ranges: found.filter((f) => keepSubstrings || f.rank >= 2).map((f) => f.range),
  }
}

function compactRange(field: Prepared, at: number, length: number): [number, number] {
  return [field.compactAt[at], field.compactAt[at + length - 1] + 1]
}

function scoreDocument(item: PreparedDocument, query: ParsedQuery): SearchResult | null {
  const titleRanges: [number, number][] = []
  const descriptionRanges: [number, number][] = []
  let matchedKeyword: string | undefined
  let score = 0
  let allWordsInTitle = true
  let complete = true

  for (const word of query.words) {
    let best = 0

    const inTitle = matchWord(item.title, word)
    if (inTitle) {
      best = W_TITLE * RANK_FACTOR[inTitle.rank] + (inTitle.wordIndex === 0 ? BONUS_FIRST_TITLE_WORD : 0)
      titleRanges.push(...inTitle.ranges)
    } else {
      allWordsInTitle = false
    }

    let keywordBest = 0
    let keywordText: string | undefined
    for (const keyword of item.keywords) {
      const hit = matchWord(keyword.p, word)
      if (!hit) continue
      const value = W_KEYWORD * RANK_FACTOR[hit.rank]
      if (value > keywordBest) {
        keywordBest = value
        keywordText = keyword.text
      }
    }
    if (keywordBest > best) best = keywordBest
    if (keywordText && !matchedKeyword) matchedKeyword = keywordText

    if (item.description) {
      const inDescription = matchWord(item.description, word)
      if (inDescription) {
        best = Math.max(best, W_DESCRIPTION * RANK_FACTOR[inDescription.rank])
        descriptionRanges.push(...inDescription.ranges)
      }
    }

    if (best === 0) {
      complete = false
      break
    }
    score += best
  }

  if (!complete) return compactFallback(item, query)

  if (item.title.compact === query.compact) score += BONUS_EXACT_TITLE
  if (item.title.phrase.startsWith(query.phrase)) score += BONUS_TITLE_STARTS_WITH
  if (allWordsInTitle) score += BONUS_ALL_WORDS_IN_TITLE
  score += KIND_BONUS[item.doc.kind] + (item.doc.boost ?? 0)

  return finish(item, score, titleRanges, descriptionRanges, matchedKeyword)
}

function compactFallback(item: PreparedDocument, query: ParsedQuery): SearchResult | null {
  // Below three letters a separator-less match is mostly coincidence.
  if (query.compact.length < 3) return null

  const inTitle = item.title.compact.indexOf(query.compact)
  if (inTitle >= 0) {
    // `nextjs` is an *exact* match for a title `Next.js` — it must rank like one.
    const exact = item.title.compact === query.compact ? BONUS_EXACT_TITLE : 0
    const score = W_TITLE * COMPACT_FACTOR + exact + KIND_BONUS[item.doc.kind] + (item.doc.boost ?? 0)
    return finish(item, score, [compactRange(item.title, inTitle, query.compact.length)], [])
  }

  for (const keyword of item.keywords) {
    if (keyword.p.compact.includes(query.compact)) {
      const score = W_KEYWORD * COMPACT_FACTOR + KIND_BONUS[item.doc.kind] + (item.doc.boost ?? 0)
      return finish(item, score, [], [], keyword.text)
    }
  }

  if (item.description) {
    const inDescription = item.description.compact.indexOf(query.compact)
    if (inDescription >= 0) {
      const score = W_DESCRIPTION * COMPACT_FACTOR + KIND_BONUS[item.doc.kind] + (item.doc.boost ?? 0)
      return finish(item, score, [], [compactRange(item.description, inDescription, query.compact.length)])
    }
  }

  return null
}

function finish(
  item: PreparedDocument,
  score: number,
  titleRanges: [number, number][],
  descriptionRanges: [number, number][],
  matchedKeyword?: string,
): SearchResult {
  const toOriginal = (prepared: Prepared | undefined, ranges: [number, number][]): Range[] =>
    prepared ? mergeRanges(ranges.map(([s, e]) => toOriginalRange(prepared.norm, s, e))) : []

  const result: SearchResult = {
    doc: item.doc,
    score,
    titleRanges: toOriginal(item.title, titleRanges),
    descriptionRanges: toOriginal(item.description, descriptionRanges),
  }
  // A keyword is only worth surfacing when it is the *reason* for the match.
  if (matchedKeyword && result.titleRanges.length === 0 && result.descriptionRanges.length === 0) {
    result.matchedKeyword = matchedKeyword
  }
  return result
}

export function searchDocuments(
  docs: readonly SearchDocument[],
  rawQuery: string,
  options: { limit?: number } = {},
): { results: SearchResult[]; total: number } {
  const query = parseQuery(rawQuery)
  if (!query) return { results: [], total: 0 }

  const scored: { result: SearchResult; index: number }[] = []
  for (const item of prepareDocuments(docs)) {
    const result = scoreDocument(item, query)
    if (result) scored.push({ result, index: item.index })
  }

  scored.sort(
    (a, b) =>
      b.result.score - a.result.score ||
      SEARCH_KIND_ORDER.indexOf(a.result.doc.kind) - SEARCH_KIND_ORDER.indexOf(b.result.doc.kind) ||
      a.index - b.index,
  )

  const results = scored.map((s) => s.result)
  return { results: options.limit ? results.slice(0, options.limit) : results, total: results.length }
}
