import { ARTAVEO_MARK_PATH, ARTAVEO_MARK_TRANSFORM, ARTAVEO_MARK_VIEWBOX } from '@/lib/brand/mark-path'

/**
 * Artaveo mark-only lockup, mono variant, theme-aware.
 *
 * Traced from the corrected, connectivity-verified mono mark
 * (public/brand/artaveo-mark-mono-black.png / -mono-white.png, fixed
 * 11 Sep 2026 — see ROAD-MAP-ARTAVEO.md § 4.1.2). Replaces the earlier
 * trace of the AI-generated placeholder sheet that had a detached facet
 * at the lower right.
 *
 * Mono (not flat/gold) is used here deliberately: the flat variant's
 * charcoal fill doesn't clear contrast against a dark header, and the two
 * flat files share the same colours despite being named "-light"/"-dark".
 * Mono-black / mono-white always reads correctly against the header's
 * light/dark surface. The outline itself lives in lib/brand/mark-path.ts.
 */

/** The mark in `currentColor` — e.g. gold on the Design System 2.0 ink bands (components/brand/brand-lockup.tsx). */
export function ArtaveoMarkGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={ARTAVEO_MARK_VIEWBOX} className={className}>
      <g transform={ARTAVEO_MARK_TRANSFORM}>
        <path d={ARTAVEO_MARK_PATH} fill="currentColor" fillRule="evenodd" />
      </g>
    </svg>
  )
}

/** Both themes used to get their own copy of the same `currentColor` path; one glyph does the same job. */
export function ArtaveoMark({ className }: { className?: string }) {
  return <ArtaveoMarkGlyph className={className} />
}
