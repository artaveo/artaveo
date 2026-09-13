import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
