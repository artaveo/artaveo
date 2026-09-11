import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site'

/**
 * Minimal web-app manifest — enough for "Add to Home Screen" icon quality on
 * mobile, not a PWA install flow (no offline/service-worker work planned).
 * Icons are the mono-white mark on the brand charcoal (#1A1A1A), the same
 * corrected mark used for the favicon (fixed 11 Sep 2026, see
 * ROAD-MAP-ARTAVEO.md § 4.1.2).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#1A1A1A',
    theme_color: '#1A1A1A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
