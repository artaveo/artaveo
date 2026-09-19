import type { Range } from '@/lib/search/types'

/**
 * Phase 18 — renders `text` with the given match ranges wrapped in `<mark>`.
 *
 * Ranges come from `lib/search/scoring.ts`, already merged, sorted and
 * expressed against the *original* string (folding — ZWNJ, Arabic/Persian
 * letter variants, diacritics — never shifts them). The mark carries no
 * horizontal padding or weight change on purpose: Persian letters join, and
 * padding or a different weight at a joining point would visibly break the
 * word apart.
 */
export function Highlight({ text, ranges }: { text: string; ranges: readonly Range[] }) {
  if (ranges.length === 0) return <>{text}</>

  const parts: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach(([rawStart, rawEnd], i) => {
    const start = Math.max(cursor, Math.min(rawStart, text.length))
    const end = Math.min(rawEnd, text.length)
    if (end <= start) return
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={i} className="rounded-[2px] bg-brand-muted text-foreground">
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}
