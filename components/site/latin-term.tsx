/**
 * Wraps a Latin technical term (e.g. "Next.js", "PostgreSQL") that appears
 * inside Persian prose, so the RTL paragraph's bidi algorithm doesn't
 * reorder or mis-position it — the term itself always reads LTR regardless
 * of the surrounding paragraph direction (roadmap § 5.1).
 *
 * Only needed inside `fa` prose. In `en` content it is a harmless no-op
 * wrapper, so call sites don't need to branch on locale themselves.
 */
export function LatinTerm({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>
}
