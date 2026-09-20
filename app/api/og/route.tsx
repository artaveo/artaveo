import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

import { siteConfig } from '@/lib/site'

/**
 * Roadmap § 11.1 — dynamic Open Graph images (English only; see
 * `lib/og.ts` for why Persian pages keep the static fallback). Runs on
 * the default Node.js runtime — the Edge runtime works too, but Next
 * 16 flags it as deprecated and it isn't needed for a route this simple.
 */

const BRAND_BG = '#1A1A1A'
const BRAND_GOLD = '#D4A24C'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Phase 23: this endpoint renders whatever text it is given, on the brand's own
  // domain. Lengths are capped and control characters removed so it cannot be
  // used to burn CPU with a huge string; the residual risk (anyone can make an
  // image with chosen words) is recorded in docs/security.md.
  const clean = (value: string | null, max: number) => value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) || null
  const title = clean(searchParams.get('title'), 120) ?? siteConfig.name
  const eyebrow = clean(searchParams.get('eyebrow'), 60) ?? siteConfig.tagline

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BRAND_BG,
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: '#FFFFFF',
          }}
        >
          ARTAVEO
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: BRAND_GOLD,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.15,
              color: '#FFFFFF',
              maxWidth: '980px',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
