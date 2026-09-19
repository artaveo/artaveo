import type { Range } from '@/lib/search/types'

/**
 * Phase 18 — text normalisation for search, written for a bilingual site.
 *
 * Two texts match when they are equal *after* this folding, so a visitor can
 * type either script the way they actually type it:
 *
 * - Latin: lower-cased, diacritics dropped (`Café` ↔ `cafe`).
 * - Persian/Arabic: the Arabic letters Persian keyboards and copy-paste
 *   produce interchangeably are unified (`ي`/`ى` → `ی`, `ك` → `ک`, `ة` → `ه`,
 *   `أ`/`إ`/`آ` → `ا`), vowel marks and tatweel are dropped.
 * - Digits: Persian (`۰–۹`) and Arabic-Indic (`٠–٩`) digits fold to `0–9`.
 * - Invisible characters are removed, notably the zero-width non-joiner
 *   (`می‌خواهم` ↔ `میخواهم`) and bidi marks.
 *
 * Folding never *reorders* anything, and every output unit remembers the span
 * of the original character it came from (`starts`/`ends`), so a match found
 * in the folded text can be highlighted in the text the visitor actually
 * sees — even when the folding removed characters in between.
 */

export type Normalized = {
  text: string
  /** For each UTF-16 unit of `text`: where its source character starts in the original string. */
  starts: number[]
  /** …and where it ends (exclusive). */
  ends: number[]
}

export type Word = { value: string; start: number; end: number }

/** Text prepared once per document field and reused for every query. */
export type Prepared = {
  norm: Normalized
  words: Word[]
  /** Words joined with single spaces — for "title starts with the query". */
  phrase: string
  /** Letters and digits only, no separators — for `nextjs` ↔ `Next.js`. */
  compact: string
  /** For each unit of `compact`: its index in `norm.text`. */
  compactAt: number[]
}

// soft hyphen · tatweel · zero-width & bidi controls · BOM
const STRIP = /[\u00AD\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/u
const MARK = /\p{M}/u

const UNIFY: Record<string, string> = {
  '\u064A': '\u06CC', // ي → ی
  '\u0649': '\u06CC', // ى → ی
  '\u0643': '\u06A9', // ك → ک
  '\u0629': '\u0647', // ة → ه
  '\u06C0': '\u0647', // ۀ → ه
  '\u0623': '\u0627', // أ → ا
  '\u0625': '\u0627', // إ → ا
  '\u0622': '\u0627', // آ → ا
}

function fold(piece: string): string {
  const code = piece.codePointAt(0) ?? 0
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0) // Persian digits
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660) // Arabic-Indic digits
  return (UNIFY[piece] ?? piece).toLowerCase()
}

export function normalizeWithMap(input: string): Normalized {
  let text = ''
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0

  for (const ch of input) {
    const start = offset
    const end = offset + ch.length
    offset = end

    for (const piece of ch.normalize('NFD')) {
      if (STRIP.test(piece) || MARK.test(piece)) continue
      for (const out of fold(piece)) {
        // `toLowerCase` can introduce a combining mark (`İ` → `i̇`).
        if (MARK.test(out) || STRIP.test(out)) continue
        text += out
        for (let k = 0; k < out.length; k++) {
          starts.push(start)
          ends.push(end)
        }
      }
    }
  }

  return { text, starts, ends }
}

const WORD = /[\p{L}\p{N}]+/gu

export function tokenize(text: string): Word[] {
  const words: Word[] = []
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0
    words.push({ value: match[0], start, end: start + match[0].length })
  }
  return words
}

export function prepareText(input: string): Prepared {
  const norm = normalizeWithMap(input)
  const words = tokenize(norm.text)
  let compact = ''
  const compactAt: number[] = []
  for (const word of words) {
    compact += word.value
    for (let i = word.start; i < word.end; i++) compactAt.push(i)
  }
  return { norm, words, phrase: words.map((w) => w.value).join(' '), compact, compactAt }
}

/** Maps a `[start, end)` range in folded text back onto the original string. */
export function toOriginalRange(norm: Normalized, start: number, end: number): Range {
  return [norm.starts[start] ?? 0, norm.ends[end - 1] ?? norm.ends[norm.ends.length - 1] ?? 0]
}

/** Sorts and merges overlapping or touching ranges. */
export function mergeRanges(ranges: readonly Range[]): Range[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: [number, number][] = [[sorted[0][0], sorted[0][1]]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const [start, end] = sorted[i]
    if (start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}
