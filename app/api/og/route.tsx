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
  const title = searchParams.get('title') ?? siteConfig.name
  const eyebrow = searchParams.get('eyebrow') ?? siteConfig.tagline

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
