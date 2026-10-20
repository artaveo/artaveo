/**
 * Phase 33.1 — an article's tags (`articles.tags`, 0032): a list of `{ en, fa }`.
 * Used on the write path and the read path alike, so the public site only
 * ever sees tags written in both languages, trimmed, without duplicates and
 * at most `MAX_TAGS` of them.
 */
export const MAX_TAGS = 8
const MAX_TAG_LENGTH = 40

export function normalizeTags(raw: unknown): { en: string; fa: string }[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: { en: string; fa: string }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const en = String((item as { en?: unknown }).en ?? '').trim().slice(0, MAX_TAG_LENGTH)
    const fa = String((item as { fa?: unknown }).fa ?? '').trim().slice(0, MAX_TAG_LENGTH)
    if (!en || !fa) continue
    const key = `${en.toLowerCase()}|${fa}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ en, fa })
    if (out.length === MAX_TAGS) break
  }
  return out
}
