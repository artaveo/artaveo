/**
 * Building PostgREST filters from text a person typed (Phase 23 — the SQL
 * injection review). The Supabase query builder parameterises `.eq()`,
 * `.insert()` and friends, but `.or()` takes a filter *expression* as a string:
 * `name.ilike.%term%,email.ilike.%term%`. Interpolating a search term into it
 * lets the term rewrite the filter — a comma starts a new condition, a
 * parenthesis opens a group — so `x,stage.eq.won` becomes an extra condition.
 * (It is not SQL injection in the database sense — PostgREST still parameterises
 * the values — but it is the same class of bug: input changing the structure of
 * a query.)
 *
 * Two layers, both needed: escape the LIKE wildcards so the term means only
 * what was typed, then quote the value so no character in it is structural.
 */

/** `%`, `_` and `\` are LIKE metacharacters; escape them so "50%" searches for "50%". */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/**
 * A value for use inside a PostgREST logical-tree expression: wrapped in double
 * quotes, with `\` and `"` escaped, so commas, parentheses, dots and colons in
 * it are plain data (PostgREST docs, "Reserved characters").
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`
}

/** Control characters have no business in a search term and some proxies treat them specially. */
function stripControl(term: string): string {
  return term.replace(/[\u0000-\u001f\u007f]/g, ' ')
}

/**
 * `col1.ilike."%term%",col2.ilike."%term%"` — for `query.or(...)`. Returns
 * `null` when the term is empty after cleaning (caller skips the filter). The
 * term is capped: nobody searches for 5,000 characters, and a long pattern is
 * a cheap way to make a database work.
 */
export function ilikeAnyOf(columns: string[], rawTerm: string, maxLength = 100): string | null {
  const term = stripControl(rawTerm).trim().slice(0, maxLength)
  if (!term) return null
  for (const column of columns) {
    if (!/^[a-z_][a-z0-9_]*$/.test(column)) throw new Error(`unsafe column name: ${column}`)
  }
  const pattern = quoteFilterValue(`%${escapeLike(term)}%`)
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',')
}

/** `column.eq.<uuid>` pieces are built only from a validated UUID, never from free text. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function assertUuid(value: string): string {
  if (!UUID.test(value)) throw new Error('expected a UUID')
  return value
}
