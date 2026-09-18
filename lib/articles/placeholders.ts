/**
 * Roadmap § 16.3 — "the build fails if [a placeholder] appears in published
 * content." Article bodies live in the database, so there is no build step
 * that can read them; the equivalent gate is enforced at the moment an
 * article is *published* (`app/actions/content.ts#publishArticle`).
 *
 * Same pattern `scripts/check-content-placeholders.mjs` uses for file-based
 * content: bracketed UPPER_SNAKE_CASE tokens such as `[CLIENT_NAME]`. It never
 * matches Markdown links (`[text](url)`) or lowercase/numeric brackets.
 */
const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9_]*\]/g

export function findPlaceholders(...texts: string[]): string[] {
  const found = new Set<string>()
  for (const text of texts) {
    for (const match of text.match(PLACEHOLDER_PATTERN) ?? []) found.add(match)
  }
  return [...found]
}
