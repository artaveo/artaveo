import { createElement as h, type ReactElement } from 'react'

import { ARTAVEO_MARK_PATH, ARTAVEO_MARK_TRANSFORM, ARTAVEO_MARK_VIEWBOX } from './mark-path'

/**
 * Phase 28.6 — the share card (Open Graph / Twitter image) in Design System
 * 2.0's ink and gold, with the corrected mark. One builder for both:
 *
 * - app/api/og/route.tsx — per-page cards with a title (English pages);
 * - scripts/brand/render-og-image.mjs → public/brand/og-image.png — the
 *   language-neutral card (mark and wordmark only) every page falls back to,
 *   Dari pages included (lib/og.ts explains why those have no per-page card).
 *
 * Plain `createElement`, no JSX, so the Node script can load it without a
 * build step. Satori lays out flexbox only: every element is `display: flex`.
 */

const INK = '#0a0c11'
const GOLD = '#e2b65c'
const TEXT = '#f3f1ec'

export const OG_SIZE = { width: 1200, height: 630 } as const

function mark(size: number): ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: ARTAVEO_MARK_VIEWBOX },
    h('g', { transform: ARTAVEO_MARK_TRANSFORM }, h('path', { d: ARTAVEO_MARK_PATH, fill: GOLD, fillRule: 'evenodd' })),
  )
}

const ground = {
  width: '100%',
  height: '100%',
  display: 'flex',
  backgroundColor: INK,
  backgroundImage: `radial-gradient(circle at 0% 0%, rgba(226,182,92,0.24), rgba(226,182,92,0) 55%), radial-gradient(circle at 100% 100%, rgba(64,120,255,0.18), rgba(64,120,255,0) 55%)`,
  fontFamily: 'sans-serif',
} as const

/** A page's card: the lockup, then a gold eyebrow and the title. */
export function ogPageCard({ title, eyebrow }: { title: string; eyebrow: string }): ReactElement {
  return h(
    'div',
    { style: { ...ground, flexDirection: 'column', justifyContent: 'space-between', padding: '72px' } },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
      mark(56),
      h('div', { style: { display: 'flex', fontSize: 28, fontWeight: 600, letterSpacing: '0.3em', color: TEXT } }, 'ARTAVEO'),
    ),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
      h('div', { style: { display: 'flex', fontSize: 26, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD } }, eyebrow),
      h('div', { style: { display: 'flex', fontSize: 62, fontWeight: 600, lineHeight: 1.15, color: TEXT, maxWidth: '1000px' } }, title),
    ),
  )
}

/** The fallback card: the mark and the wordmark, centred — no words that would need translating. */
export function ogBrandCard(): ReactElement {
  return h(
    'div',
    { style: { ...ground, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '36px' } },
    mark(220),
    h('div', { style: { display: 'flex', fontSize: 56, fontWeight: 600, letterSpacing: '0.32em', color: TEXT, paddingLeft: '0.32em' } }, 'ARTAVEO'),
    h('div', { style: { display: 'flex', width: '96px', height: '3px', backgroundColor: GOLD, opacity: 0.8 } })
  )
}
