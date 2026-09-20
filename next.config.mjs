import createNextIntlPlugin from 'next-intl/plugin'

import { buildHeaderRules } from './lib/security/static-headers.mjs'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  /**
   * § 11.3 — "images sized and modern formats". This used to be
   * `{ unoptimized: true }`, which disables Next's Image Optimization API
   * entirely: every `next/image` in the app already passes correct `fill`
   * + `sizes` (verified across `identity.tsx`, `case-study.tsx`,
   * `project-card.tsx`, `featured-work.tsx`, `about-preview.tsx`), so the
   * responsive-sizing half of this requirement was already done — but with
   * optimization off, the browser still received the original PNG at its
   * original ~480–750 KB (the `work-*.png` case-study covers), just scaled
   * down by CSS instead of actually being smaller. Vercel's own hosting
   * runs the optimizer at the edge with no extra setup (no `sharp`
   * install needed, unlike self-hosting), so this has no deployment cost
   * on the target platform. `next build` doesn't exercise this path
   * itself — optimization happens at request time — so the smaller
   * payload and AVIF/WebP negotiation are confirmed by config here and
   * still need a live-deployment check (real `Content-Type`/size on the
   * deployed image endpoint), same caveat as § 11.1's OG image previews.
   */
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  /**
   * § 10.1 — `/sw.js` must never be served from a cache. Browsers already
   * bypass HTTP cache for the service-worker script's own byte-comparison
   * update check, but CDN/edge caching (Vercel) sits in front of that and
   * can still serve a stale copy to the *first* fetch on a given edge node
   * unless told not to. Without this, a redeploy's new `BUILD_ID` (see
   * `scripts/generate-sw.mjs`) could take until the edge cache naturally
   * expires to reach some visitors, silently delaying the § 10.1 "update
   * available" prompt this header exists to make reliable.
   */
  async headers() {
    // Phase 23: security headers for every path, stricter ones for private links and
    // the admin, and the /sw.js rule above — all in lib/security/static-headers.mjs
    // (the Content Security Policy is set per request by proxy.ts).
    return buildHeaderRules()
  },
  // Phase 23: no `X-Powered-By: Next.js` — it tells a scanner what to try.
  poweredByHeader: false,
  experimental: {
    // Server Actions accept 1 MB by default (Next's documented default), while uploads are
    // allowed up to 5 MB (`MAX_MEDIA_FILE_SIZE_BYTES`); multipart overhead needs a little more
    // than the file itself. Set explicitly so the framework limit and ours are one decision.
    // NOTE: Vercel caps a function's request body at about 4.5 MB (platform limit as documented
    // by Vercel; not verifiable from here) — see docs/security.md § 5 for what to do if it bites.
    serverActions: { bodySizeLimit: '6mb' },
  },
}

export default withNextIntl(nextConfig)
