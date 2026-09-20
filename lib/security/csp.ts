import crypto from 'node:crypto'

import { themeScript } from '@/lib/theme-script'

/**
 * Content Security Policy (Phase 23) — one builder, two policies.
 *
 * WHY TWO. A strict script policy ("only scripts that carry this request's
 * nonce") needs the HTML to be generated per request, because the nonce is part
 * of the markup. The public pages are prerendered and served from the CDN: their
 * HTML exists before any request, so no nonce can be in it — making them dynamic
 * to get one would cost the static rendering, the CDN caching and, with them, the
 * performance the design is built around (roadmap principle 17), and would
 * fight the service worker's cache-first pages.
 *
 *   'public'  — the prerendered site. Scripts: same origin + inline (`'unsafe-inline'`),
 *               which Next's own bootstrap needs on a static page. Everything that
 *               does NOT depend on scripts is strict: no plugins, no framing, no
 *               foreign base URL or form target, images/fonts/connections only from
 *               where the site really loads them. What protects this side from
 *               XSS is not the CSP but that no visitor-supplied text is ever
 *               rendered as HTML — reviewed and pinned by tests (docs/security.md).
 *   'admin'   — dynamic pages (they read the session). Scripts: same origin, this
 *               request's nonce, and the one inline script every page carries
 *               (the theme script), allowed by its hash. No `'unsafe-inline'`:
 *               an injected inline script in the admin panel does not run. This
 *               is the side where an XSS would do the most damage.
 *
 * `'unsafe-inline'` for STYLES stays on both: React and the design system use
 * style attributes, and script-less style injection is a far smaller risk.
 */

export type CspMode = 'public' | 'admin'

export type CspOptions = {
  mode: CspMode
  /** Required for `admin`. */
  nonce?: string
  /** `next dev` needs `eval` for its overlay and websockets for hot reload. Never true in production. */
  dev?: boolean
  /** `SUPABASE_URL` — uploaded media is served from the Storage host, so `img-src` names exactly that origin. */
  supabaseUrl?: string | null
  /** Only where the site is served over HTTPS (Vercel). Behind plain http (the test stack) it would break every subresource. */
  upgradeInsecure?: boolean
}

/** `'sha256-…'` of the theme script exactly as the layout renders it. */
export const THEME_SCRIPT_HASH = `'sha256-${crypto.createHash('sha256').update(themeScript).digest('base64')}'`

export function newNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

function originOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null
  } catch {
    return null
  }
}

export function buildCsp(options: CspOptions): string {
  const { mode, nonce, dev = false, supabaseUrl = null, upgradeInsecure = false } = options
  if (mode === 'admin' && !nonce) throw new Error('the admin policy needs a nonce')

  const script =
    mode === 'admin'
      ? ["'self'", `'nonce-${nonce}'`, THEME_SCRIPT_HASH]
      : ["'self'", "'unsafe-inline'"]
  if (dev) script.push("'unsafe-eval'")

  const storage = originOf(supabaseUrl)

  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', script],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', ...(storage ? [storage] : [])]],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...(dev ? ['ws:', 'wss:'] : [])]],
    ['manifest-src', ["'self'"]],
    ['worker-src', ["'self'"]],
    ['media-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['frame-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ]

  const parts = directives.map(([name, values]) => `${name} ${values.join(' ')}`)
  if (upgradeInsecure) parts.push('upgrade-insecure-requests')
  return parts.join('; ')
}

/** `CSP_REPORT_ONLY=1` turns enforcement into observation (violations are reported in the browser console, nothing is blocked) — an operational escape hatch that needs a redeploy, not a code change. */
export function cspHeaderName(env: Record<string, string | undefined> = process.env): string {
  return env.CSP_REPORT_ONLY === '1' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
}
