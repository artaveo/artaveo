/**
 * The response headers every path gets, and the stricter set for paths that
 * carry a private link or the admin (Phase 23). A plain module (not TypeScript)
 * because `next.config.mjs` imports it directly and the unit tests read the same
 * values — the config and the tests can not disagree about what is sent.
 *
 * The Content Security Policy is NOT here: the two variants need a per-request
 * nonce for the admin, so `proxy.ts` sets it (`lib/security/csp.ts` explains why).
 */

/**
 * - `nosniff`: a file is only ever treated as the type it was served as.
 * - `strict-origin-when-cross-origin`: other sites learn our origin, never a path.
 * - `X-Frame-Options`: the older twin of CSP `frame-ancestors 'none'` — nothing here is meant to be framed.
 * - Permissions-Policy: none of these browser features is used by the site; a compromised
 *   script or an embedded third party cannot switch them on. `fullscreen` stays for `self`.
 * - COOP `same-origin`: no other window keeps a handle to ours.
 * - HSTS: one year, WITHOUT `includeSubDomains` or `preload` — those are commitments about a
 *   whole domain that cannot be taken back quickly, and the production domain is still
 *   undecided (D-01). Add them deliberately once it is (docs/security.md).
 */
export const BASELINE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'publickey-credentials-get=()',
      'usb=()',
      'xr-spatial-tracking=()',
    ].join(', '),
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

/** Pages whose URL IS a credential (a consultation or recommendation link), the admin, and the routes behind them: never cached, never indexed, never leaked through the Referer header. */
export const PRIVATE_HEADERS = [
  { key: 'Cache-Control', value: 'no-store' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

export const PRIVATE_SOURCES = [
  '/:locale(en|fa)/consultation/:token',
  '/:locale(en|fa)/recommend/:token',
  '/:locale(en|fa)/admin',
  '/:locale(en|fa)/admin/:path*',
  '/api/consultation/:path*',
  '/api/admin/:path*',
  '/api/cron/:path*',
]

/** Data-only routes: nothing they return is a document, so nothing may load from one. */
export const API_CSP = { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" }
export const API_CSP_SOURCES = ['/api/consultation/:path*', '/api/admin/:path*', '/api/cron/:path*', '/api/search/:path*']

/** The array `next.config.mjs` returns from `headers()`. Order matters: a later entry overrides an earlier one for the same key. */
export function buildHeaderRules() {
  return [
    { source: '/:path*', headers: BASELINE_HEADERS },
    ...PRIVATE_SOURCES.map((source) => ({ source, headers: PRIVATE_HEADERS })),
    ...API_CSP_SOURCES.map((source) => ({ source, headers: [API_CSP] })),
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
  ]
}
