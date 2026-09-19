#!/usr/bin/env node
/**
 * Phase 18 — unit tests for the pure search code: text folding and range
 * mapping (Persian + Latin), the matcher/ranker, index validation, and the
 * recent-searches store. Zero dependencies (Node's built-in test runner with
 * native TypeScript stripping):
 *
 *   npm run test:search
 *
 * A general test setup (Vitest + CI) is Phase 21's job; like the article
 * tests, these cover the part that is pure and easy to get subtly wrong.
 */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

import { mergeRanges, normalizeWithMap } from '../lib/search/normalize.ts'
import { parseSearchIndex } from '../lib/search/local-provider.ts'
import { addRecentSearch, clearRecentSearches, readRecentSearches, RECENT_SEARCHES_KEY } from '../lib/search/recent.ts'
import { parseQuery, searchDocuments } from '../lib/search/scoring.ts'

const doc = (id, title, extra = {}) => ({ id, kind: 'project', href: `/${id}`, title, ...extra })
const ids = (results) => results.map((r) => r.doc.id)
const slice = (text, ranges) => ranges.map(([s, e]) => text.slice(s, e))

// ── folding ───────────────────────────────────────────────────────────────

test('folding: Arabic letter variants, digits, ZWNJ and diacritics all unify', () => {
  assert.equal(normalizeWithMap('كيان').text, 'کیان')
  assert.equal(normalizeWithMap('۱۲۳ ٤٥٦').text, '123 456')
  assert.equal(normalizeWithMap('می‌خواهم').text, 'میخواهم')
  assert.equal(normalizeWithMap('Café').text, 'cafe')
  assert.equal(normalizeWithMap('İstanbul').text, 'istanbul')
  assert.equal(normalizeWithMap('آب').text, 'اب')
})

test('folding: every folded unit maps back to a real span of the original', () => {
  const original = 'می‌خواهم Café'
  const n = normalizeWithMap(original)
  assert.equal(n.starts.length, n.text.length)
  assert.equal(n.ends.length, n.text.length)
  for (let i = 0; i < n.text.length; i++) {
    assert.ok(n.starts[i] >= 0 && n.ends[i] <= original.length && n.starts[i] < n.ends[i])
  }
})

test('queries: empty, punctuation-only and duplicate words', () => {
  assert.equal(parseQuery(''), null)
  assert.equal(parseQuery('  ...  '), null)
  assert.deepEqual(parseQuery('Seat seat  HOLD').words, ['seat', 'hold'])
  assert.equal(parseQuery('Next.js').compact, 'nextjs')
})

test('queries: absurd input is bounded', () => {
  const q = parseQuery('a '.repeat(500))
  assert.ok(q === null || q.words.length <= 6)
  assert.doesNotThrow(() => searchDocuments([doc('a', 'A')], 'x'.repeat(10_000)))
})

// ── matching ──────────────────────────────────────────────────────────────

test('every word must match (order-free), in any field', () => {
  const docs = [
    doc('seat', 'Seat holding', { description: 'Concurrent booking without double sales' }),
    doc('flow', 'Booking flow'),
  ]
  assert.deepEqual(ids(searchDocuments(docs, 'seat booking').results), ['seat'])
  assert.deepEqual(ids(searchDocuments(docs, 'booking seat').results), ['seat'])
  assert.deepEqual(ids(searchDocuments(docs, 'seat payments').results), [])
})

test('prefix matches; a substring needs three letters', () => {
  const docs = [doc('s', 'Supabase backend')]
  assert.equal(searchDocuments(docs, 'sup').total, 1)
  assert.equal(searchDocuments(docs, 'base').total, 1) // inside "Supabase"
  assert.equal(searchDocuments(docs, 'ba').total, 1) // prefix of "backend"
  assert.equal(searchDocuments(docs, 'pa').total, 0) // two letters inside a word: not enough
})

test('ranking: exact title > title prefix > keyword > description', () => {
  const docs = [
    doc('desc', 'Other thing', { description: 'mentions react somewhere' }),
    doc('kw', 'Another thing', { keywords: ['React'] }),
    doc('prefix', 'Reactive systems'),
    doc('exact', 'React'),
  ]
  assert.deepEqual(ids(searchDocuments(docs, 'react').results), ['exact', 'prefix', 'kw', 'desc'])
})

test('ranking: featured (boost) wins an otherwise equal match; ties keep source order', () => {
  const docs = [doc('a', 'Booking'), doc('b', 'Booking', { boost: 2 }), doc('c', 'Booking')]
  assert.deepEqual(ids(searchDocuments(docs, 'booking').results), ['b', 'a', 'c'])
})

test('separator-less fallback: nextjs ↔ Next.js, tailwind css ↔ TailwindCSS', () => {
  const docs = [doc('t', 'Next.js'), doc('c', 'Styling', { keywords: ['TailwindCSS'] })]
  const next = searchDocuments(docs, 'nextjs')
  assert.deepEqual(ids(next.results), ['t'])
  assert.deepEqual(slice('Next.js', next.results[0].titleRanges), ['Next.js'])

  // …and an exact-title match outranks projects that merely list it as a keyword.
  const ranked = searchDocuments(
    [doc('proj', 'Booking system', { keywords: ['Next.js'], boost: 2 }), doc('tech', 'Next.js', { kind: 'technology' })],
    'nextjs',
  )
  assert.deepEqual(ids(ranked.results), ['tech', 'proj'])

  const tw = searchDocuments(docs, 'tailwind css')
  assert.deepEqual(ids(tw.results), ['c'])
  assert.equal(tw.results[0].matchedKeyword, 'TailwindCSS')
})

test('a keyword is surfaced only when it is the reason for the match', () => {
  const docs = [doc('p', 'Transport booking', { keywords: ['Supabase'] })]
  assert.equal(searchDocuments(docs, 'supabase').results[0].matchedKeyword, 'Supabase')
  assert.equal(searchDocuments(docs, 'transport').results[0].matchedKeyword, undefined)
})

test('no typo tolerance: a misspelling finds nothing rather than something wrong', () => {
  assert.equal(searchDocuments([doc('a', 'Booking')], 'bokoing').total, 0)
})

test('limit caps the results but total reports every match', () => {
  const docs = Array.from({ length: 20 }, (_, i) => doc(`d${i}`, `Booking ${i}`))
  const { results, total } = searchDocuments(docs, 'booking', { limit: 5 })
  assert.equal(results.length, 5)
  assert.equal(total, 20)
})

// ── bilingual ─────────────────────────────────────────────────────────────

test('Persian: letter variants and ZWNJ do not stop a match', () => {
  const docs = [doc('k', 'کتاب‌خانه دیجیتال'), doc('m', 'می‌خواهم شروع کنم')]
  assert.deepEqual(ids(searchDocuments(docs, 'كتاب').results), ['k']) // Arabic kaf
  assert.deepEqual(ids(searchDocuments(docs, 'میخواهم').results), ['m']) // no ZWNJ typed
  assert.deepEqual(ids(searchDocuments(docs, 'می‌خواهم').results), ['m']) // ZWNJ typed
})

test('Persian: digits fold, so ۲ finds 2 and 2 finds ۲', () => {
  const docs = [doc('a', 'مرحله ۲'), doc('b', 'Phase 2')]
  assert.deepEqual(ids(searchDocuments(docs, '2').results).sort(), ['a', 'b'])
  assert.deepEqual(ids(searchDocuments(docs, '۲').results).sort(), ['a', 'b'])
})

// ── highlighting ──────────────────────────────────────────────────────────

test('highlight ranges are in the original text, even across removed characters', () => {
  const title = 'می‌خواهم شروع کنم' // ZWNJ after the second letter
  const [result] = searchDocuments([doc('m', title)], 'خواهم').results
  assert.deepEqual(slice(title, result.titleRanges), ['خواهم'])

  const latin = 'Café society'
  const [cafe] = searchDocuments([doc('c', latin)], 'cafe').results
  assert.deepEqual(slice(latin, cafe.titleRanges), ['Café'])
})

test('highlight: prefix highlights only what was typed; several words highlight separately', () => {
  const title = 'Seat holding system'
  const [result] = searchDocuments([doc('s', title)], 'sea hold').results
  assert.deepEqual(slice(title, result.titleRanges), ['Sea', 'hold'])
})

test('highlight: description matches are highlighted in the description', () => {
  const description = 'Handles concurrent seat booking'
  const [result] = searchDocuments([doc('s', 'Transport', { description })], 'seat').results
  assert.deepEqual(result.titleRanges, [])
  assert.deepEqual(slice(description, result.descriptionRanges), ['seat'])
})

test('mergeRanges joins overlapping and touching ranges only', () => {
  assert.deepEqual(mergeRanges([[5, 8], [0, 2], [2, 4], [7, 10]]), [[0, 4], [5, 10]])
  assert.deepEqual(mergeRanges([]), [])
})

// ── index validation ──────────────────────────────────────────────────────

test('parseSearchIndex drops malformed documents instead of failing', () => {
  const index = parseSearchIndex(
    {
      locale: 'en',
      generatedAt: '2026-09-19T00:00:00Z',
      docs: [
        { id: 'a', kind: 'page', href: '/work', title: 'Work' },
        { id: 'b', kind: 'nope', href: '/x', title: 'Bad kind' },
        { id: 'c', kind: 'page', href: 'https://evil.example', title: 'Absolute URL' },
        { id: 'd', kind: 'page', href: '/y', title: '' },
        { id: 'e', kind: 'page', href: '/z', title: 'Bad keywords', keywords: [1] },
        null,
      ],
      suggestions: ['Next.js', '', 3],
    },
    'en',
  )
  assert.deepEqual(index.docs.map((d) => d.id), ['a'])
  assert.deepEqual(index.suggestions, ['Next.js'])
})

test('parseSearchIndex rejects a wrong-locale or shapeless payload', () => {
  assert.throws(() => parseSearchIndex({ locale: 'fa', docs: [] }, 'en'))
  assert.throws(() => parseSearchIndex({ locale: 'en' }, 'en'))
  assert.throws(() => parseSearchIndex(null, 'en'))
})

// ── recent searches ───────────────────────────────────────────────────────

function fakeStorage() {
  const data = new Map()
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  }
}

let storage
beforeEach(() => {
  storage = fakeStorage()
  globalThis.window = { localStorage: storage }
})

test('recent: newest first, case-insensitive de-duplication, capped at five', () => {
  for (const q of ['one', 'two', 'three', 'four', 'five', 'six']) addRecentSearch(q)
  assert.deepEqual(readRecentSearches(), ['six', 'five', 'four', 'three', 'two'])
  addRecentSearch('THREE')
  assert.deepEqual(readRecentSearches(), ['THREE', 'six', 'five', 'four', 'two'])
})

test('recent: one-letter and blank queries are not remembered; whitespace is collapsed', () => {
  addRecentSearch('a')
  addRecentSearch('   ')
  addRecentSearch('  seat   booking ')
  assert.deepEqual(readRecentSearches(), ['seat booking'])
})

test('recent: corrupt or foreign storage contents are ignored, not fatal', () => {
  storage.setItem(RECENT_SEARCHES_KEY, '{not json')
  assert.deepEqual(readRecentSearches(), [])
  storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify({ a: 1 }))
  assert.deepEqual(readRecentSearches(), [])
  storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['ok', 7, null, 'ok', 'x']))
  assert.deepEqual(readRecentSearches(), ['ok'])
})

test('recent: clear empties it; blocked storage never throws', () => {
  addRecentSearch('seat')
  clearRecentSearches()
  assert.deepEqual(readRecentSearches(), [])

  globalThis.window = {
    get localStorage() {
      throw new Error('blocked')
    },
  }
  assert.deepEqual(readRecentSearches(), [])
  assert.doesNotThrow(() => addRecentSearch('seat'))
  assert.doesNotThrow(() => clearRecentSearches())
})
