import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

import { OG_SIZE, ogPageCard } from '@/lib/brand/og-card'
import { siteConfig } from '@/lib/site'

/**
 * Roadmap § 11.1 — dynamic Open Graph images (English only; see
 * `lib/og.ts` for why Persian pages keep the static fallback). Runs on
 * the default Node.js runtime — the Edge runtime works too, but Next
 * 16 flags it as deprecated and it isn't needed for a route this simple.
 *
 * Phase 28.6: the card itself (ink, gold, the corrected mark) is built in
 * lib/brand/og-card.ts, shared with the static fallback image.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Phase 23: this endpoint renders whatever text it is given, on the brand's own
  // domain. Lengths are capped and control characters removed so it cannot be
  // used to burn CPU with a huge string; the residual risk (anyone can make an
  // image with chosen words) is recorded in docs/security.md.
  const clean = (value: string | null, max: number) => value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) || null
  const title = clean(searchParams.get('title'), 120) ?? siteConfig.name
  const eyebrow = clean(searchParams.get('eyebrow'), 60) ?? siteConfig.tagline

  return new ImageResponse(ogPageCard({ title, eyebrow }), OG_SIZE)
}
