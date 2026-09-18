import { countWords, parseArticleBody } from './markdown'

/**
 * Phase 17 — "reading time per locale" (roadmap § 12 Phase 17).
 *
 * Computed from the body at read time, never stored, so it cannot go
 * stale when the body is edited and can differ between `en` and `fa`
 * (the same article is rarely the same length in both languages).
 *
 * These two speeds are **heuristics, not measurements** — there is no
 * study behind them and none is claimed. They are a single named constant
 * each so they are one line to change if real reader feedback ever says
 * they are off. English keeps the 200 wpm Phase 15's admin already used;
 * Persian uses a slightly lower 180 wpm because the same idea usually
 * takes more words and the script is read a little more slowly on screen.
 * Code is skimmed rather than read, so it counts at half weight.
 */
export const WORDS_PER_MINUTE = { en: 200, fa: 180 } as const
export const CODE_WORD_WEIGHT = 0.5

export type ReadingLocale = keyof typeof WORDS_PER_MINUTE

/** Whole minutes, never below 1 for a non-empty body, `0` for an empty one. */
export function estimateReadingMinutes(body: string, locale: ReadingLocale): number {
  const { prose, code } = countWords(parseArticleBody(body).blocks)
  const effectiveWords = prose + code * CODE_WORD_WEIGHT
  if (effectiveWords === 0) return 0
  return Math.max(1, Math.ceil(effectiveWords / WORDS_PER_MINUTE[locale]))
}
