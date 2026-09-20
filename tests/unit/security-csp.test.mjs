/**
 * Phase 23 — the response headers and the Content Security Policy, as data.
 * (What the BROWSER does with them — no violation on any page — is checked by
 * tests/e2e/security.spec.ts against the built app.)
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { describe, it } from 'node:test'

import { buildCsp, cspHeaderName, newNonce, THEME_SCRIPT_HASH } from '../../lib/security/csp.ts'
import { themeScript } from '../../lib/theme-script.ts'
import { BASELINE_HEADERS, PRIVATE_HEADERS, PRIVATE_SOURCES, buildHeaderRules } from '../../lib/security/static-headers.mjs'

const directive = (csp, name) => csp.split('; ').find((d) => d.startsWith(`${name} `))?.slice(name.length + 1).split(' ') ?? null

describe('Content Security Policy — both variants', () => {
  const nonce = newNonce()
  const variants = { public: buildCsp({ mode: 'public' }), admin: buildCsp({ mode: 'admin', nonce }) }

  for (const [mode, csp] of Object.entries(variants)) {
    it(`${mode}: no plugins, no framing, no foreign base or form target, no default-open`, () => {
      assert.deepEqual(directive(csp, 'object-src'), ["'none'"])
      assert.deepEqual(directive(csp, 'frame-ancestors'), ["'none'"])
      assert.deepEqual(directive(csp, 'frame-src'), ["'none'"])
      assert.deepEqual(directive(csp, 'base-uri'), ["'self'"])
      assert.deepEqual(directive(csp, 'form-action'), ["'self'"])
      assert.deepEqual(directive(csp, 'default-src'), ["'self'"])
      assert.deepEqual(directive(csp, 'connect-src'), ["'self'"])
    })
    it(`${mode}: production never allows eval, and only the dev flag adds it`, () => {
      assert.ok(!directive(csp, 'script-src').includes("'unsafe-eval'"))
      const dev = buildCsp({ mode, nonce, dev: true })
      assert.ok(directive(dev, 'script-src').includes("'unsafe-eval'"))
      assert.ok(directive(dev, 'connect-src').includes('ws:'))
    })
  }

  it('admin: scripts need this request\'s nonce or the theme-script hash — NOT unsafe-inline', () => {
    const script = directive(variants.admin, 'script-src')
    assert.ok(script.includes(`'nonce-${nonce}'`) && script.includes(THEME_SCRIPT_HASH) && script.includes("'self'"))
    assert.ok(!script.includes("'unsafe-inline'"))
    assert.throws(() => buildCsp({ mode: 'admin' }), /nonce/)
  })
  it('public: inline scripts are allowed (prerendered pages cannot carry a nonce) and there is no nonce or hash to cancel that out', () => {
    const script = directive(variants.public, 'script-src')
    assert.ok(script.includes("'unsafe-inline'"))
    assert.ok(!script.some((s) => s.startsWith("'nonce-") || s.startsWith("'sha256-")), "a nonce or hash would make browsers ignore 'unsafe-inline'")
  })
  it('the theme-script hash is the SHA-256 of exactly the string the layout renders', () => {
    assert.equal(THEME_SCRIPT_HASH, `'sha256-${crypto.createHash('sha256').update(themeScript).digest('base64')}'`)
  })
  it('nonces are fresh, unguessable and long enough', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newNonce()))
    assert.equal(seen.size, 500)
    assert.ok(Buffer.from(newNonce(), 'base64').length >= 16)
  })
  it('images may come from the Storage host and nowhere else external; fonts and connections stay same-origin', () => {
    const csp = buildCsp({ mode: 'public', supabaseUrl: 'https://abc.supabase.co/rest/v1?x=1' })
    assert.deepEqual(directive(csp, 'img-src'), ["'self'", 'data:', 'blob:', 'https://abc.supabase.co'])
    assert.deepEqual(directive(csp, 'font-src'), ["'self'", 'data:'])
    assert.deepEqual(directive(buildCsp({ mode: 'public', supabaseUrl: 'javascript:alert(1)' }), 'img-src'), ["'self'", 'data:', 'blob:'])
    assert.deepEqual(directive(buildCsp({ mode: 'public' }), 'img-src'), ["'self'", 'data:', 'blob:'])
  })
  it('upgrade-insecure-requests only when asked for (plain-http test servers would break)', () => {
    assert.ok(!buildCsp({ mode: 'public' }).includes('upgrade-insecure-requests'))
    assert.ok(buildCsp({ mode: 'public', upgradeInsecure: true }).includes('upgrade-insecure-requests'))
  })
  it('report-only is an explicit switch and enforcement is the default', () => {
    assert.equal(cspHeaderName({}), 'Content-Security-Policy')
    assert.equal(cspHeaderName({ CSP_REPORT_ONLY: '1' }), 'Content-Security-Policy-Report-Only')
    assert.equal(cspHeaderName({ CSP_REPORT_ONLY: '0' }), 'Content-Security-Policy')
  })
})

describe('static security headers', () => {
  const byKey = (list) => Object.fromEntries(list.map((h) => [h.key, h.value]))
  it('the baseline covers sniffing, referrers, framing, features, opener and transport', () => {
    const h = byKey(BASELINE_HEADERS)
    assert.equal(h['X-Content-Type-Options'], 'nosniff')
    assert.equal(h['X-Frame-Options'], 'DENY')
    assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin')
    assert.equal(h['Cross-Origin-Opener-Policy'], 'same-origin')
    assert.match(h['Strict-Transport-Security'], /^max-age=\d{7,}$/)
    assert.ok(!/includeSubDomains|preload/.test(h['Strict-Transport-Security']), 'a domain-wide commitment is not made before the domain (D-01) is decided')
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) assert.ok(h['Permissions-Policy'].includes(`${feature}=()`), feature)
  })
  it('private links and the admin are never cached, never indexed and never leaked through Referer', () => {
    const h = byKey(PRIVATE_HEADERS)
    assert.equal(h['Cache-Control'], 'no-store')
    assert.equal(h['Referrer-Policy'], 'no-referrer')
    assert.match(h['X-Robots-Tag'], /noindex/)
    for (const needle of ['consultation/:token', 'recommend/:token', 'admin', '/api/admin/', '/api/consultation/']) {
      assert.ok(PRIVATE_SOURCES.some((s) => s.includes(needle)), needle)
    }
  })
  it('the private rules come AFTER the baseline (a later rule wins for the same header), and sw.js keeps its no-cache rule', () => {
    const rules = buildHeaderRules()
    assert.equal(rules[0].source, '/:path*')
    const privateIndex = rules.findIndex((r) => r.source === PRIVATE_SOURCES[0])
    assert.ok(privateIndex > 0)
    assert.ok(rules.some((r) => r.source === '/sw.js' && r.headers.some((h) => h.key === 'Cache-Control' && /no-store/.test(h.value))))
  })
  it('the consultation REQUEST form (no token) is not swept into the private rule', () => {
    assert.ok(!PRIVATE_SOURCES.includes('/:locale(en|fa)/consultation'))
  })
})
