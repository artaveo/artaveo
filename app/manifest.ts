import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site'

/**
 * Web-app manifest (§ 10.1 — Installable PWA & Offline-Safe Shell).
 *
 * `icons`: the mono-white mark on the brand charcoal (#1A1A1A). Regenerated
 * 13 Sep 2026 directly from `public/brand/artaveo-mark-mono-white.svg` (the
 * same corrected, connectivity-verified mark used for the favicon since
 * 11 Sep 2026) — `icon-192.png` / `icon-512.png` / `icon-512-maskable.png`
 * were the one piece of that fix explicitly deferred past § 4.1 pending
 * this phase (see ROAD-MAP-ARTAVEO.md § 4.1, "Not yet updated"); that debt
 * is now closed. The maskable variant is scaled down further (~34% of
 * canvas width vs ~40% for the two `any` icons) so the mark stays clear of
 * the mask safe-zone regardless of the shape a given OS crops it to.
 *
 * `scope`/`id` pin the installed app's boundary and identity to the whole
 * site — there's no separate installable sub-app. Install-prompt handling
 * itself (the actual `beforeinstallprompt` UI) and update-available
 * detection live in `components/site/pwa-manager.tsx`, registered from the
 * root layout; this file only declares what an installed Artaveo *is*.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    scope: '/',
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
