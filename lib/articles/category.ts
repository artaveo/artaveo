/**
 * A category whose both locales are blank is "no category". The admin's
 * localized field hands back `{ en: '', fa: '' }` after a clear, and an
 * object with two empty strings is truthy — it would render an empty badge
 * and make an article look incomplete. Used on both the write path and the
 * read path so a stray blank object can never reach a public component.
 */
export function normalizeCategory(
  category: { en: string; fa: string } | null | undefined,
): { en: string; fa: string } | null {
  if (!category) return null
  const en = (category.en ?? '').trim()
  const fa = (category.fa ?? '').trim()
  return en || fa ? { en, fa } : null
}
