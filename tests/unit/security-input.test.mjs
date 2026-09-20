/**
 * Phase 23 — the pure security helpers, pinned: what makes a search term
 * harmless, a CSV cell safe, an upload trustworthy, a client address believable.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { escapeLike, ilikeAnyOf, quoteFilterValue, assertUuid } from '../../lib/postgrest.ts'
import { csvEscape, neutraliseFormula, toCsv } from '../../lib/csv.ts'
import { inspectUpload, inspectSvg, MAX_IMAGE_SIDE } from '../../lib/upload-inspection.ts'
import { pickClientIp, hashSecret } from '../../lib/request-ip.ts'
import { checkSecurityConfig } from '../../lib/security/config-check.ts'
import { RATE_LIMITS, bucketKey } from '../../lib/security/rate-limit-policy.ts'
import { parseArticleBody } from '../../lib/articles/markdown.ts'
import { displayFileName } from '../../lib/media-upload.ts'

describe('postgrest filters (the SQL-injection review)', () => {
  it('quotes a value so commas, parentheses and dots are data', () => {
    assert.equal(quoteFilterValue('a,b(c).d'), '"a,b(c).d"')
    assert.equal(quoteFilterValue('say "hi"\\'), '"say \\"hi\\"\\\\"')
  })
  it('a term that tries to add a condition stays inside one quoted pattern', () => {
    const expression = ilikeAnyOf(['name', 'email'], 'x,stage.eq.won')
    assert.equal(expression, 'name.ilike."%x,stage.eq.won%",email.ilike."%x,stage.eq.won%"')
    // Exactly two top-level conditions — the injected `stage.eq.won` is inside the quotes.
    assert.equal(expression.replace(/"(?:[^"\\]|\\.)*"/g, '""').split(',').length, 2)
  })
  it('a quote or a backslash cannot close the quoting', () => {
    const expression = ilikeAnyOf(['name'], '"),email.ilike.%\\')
    assert.equal(expression.replace(/"(?:[^"\\]|\\.)*"/g, '""'), 'name.ilike.""')
  })
  it('LIKE wildcards in the term mean themselves', () => {
    assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\')
  })
  it('empty, whitespace and control-only terms produce no filter; long ones are capped', () => {
    assert.equal(ilikeAnyOf(['name'], '   '), null)
    assert.equal(ilikeAnyOf(['name'], '\u0000\u0007'), null)
    assert.ok(ilikeAnyOf(['name'], 'a'.repeat(5000)).length < 250)
  })
  it('column names are checked too', () => {
    assert.throws(() => ilikeAnyOf(['name,stage'], 'x'))
  })
  it('assertUuid accepts a UUID and refuses anything that could carry filter syntax', () => {
    assert.equal(assertUuid('123e4567-e89b-42d3-a456-426614174000'), '123e4567-e89b-42d3-a456-426614174000')
    assert.throws(() => assertUuid('123e4567-e89b-42d3-a456-426614174000,id.eq.x'))
  })
})

describe('CSV cells a spreadsheet would run', () => {
  const dangerous = ['=HYPERLINK("http://evil","x")', '+cmd|calc', '-2+3', '@SUM(1)', '\t=1', '\r=1']
  it('a cell that starts like a formula is neutralised with a leading quote', () => {
    for (const cell of dangerous) assert.ok(neutraliseFormula(cell).startsWith("'"), cell)
  })
  it('phone numbers and plain numbers are left alone', () => {
    for (const cell of ['+93 790685832', '+44 (0) 20 7946 0958', '-12', '0912-345-6789', '42']) assert.equal(neutraliseFormula(cell), cell)
  })
  it('ordinary text is untouched; commas, quotes and newlines are quoted as before', () => {
    assert.equal(csvEscape('Zakir'), 'Zakir')
    assert.equal(csvEscape('a,b'), '"a,b"')
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""')
    assert.equal(csvEscape('two\nlines'), '"two\nlines"')
  })
  it('a neutralised cell that also needs quoting is both', () => {
    assert.equal(csvEscape('=A1,B1'), `"'=A1,B1"`)
  })
  it('toCsv builds a row per record and neutralises inside it', () => {
    assert.equal(toCsv(['name', 'goal'], [['Ann', '=1+1'], ['Bo', null]]), "name,goal\r\nAnn,'=1+1\r\nBo,")
  })
})

// ---------------------------------------------------------------------------
// Upload inspection
// ---------------------------------------------------------------------------
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const png = (w, h) => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(w), ...be32(h), 8, 6, 0, 0, 0])
const gif = (w, h) => Uint8Array.from([...Buffer.from('GIF89a'), w & 255, w >> 8, h & 255, h >> 8, 0, 0, 0])
const jpeg = (w, h) =>
  Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...Buffer.from('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0])
const riff = (chunk, rest) => Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), ...Buffer.from(chunk), ...rest])
const webpX = (w, h) => riff('VP8X', [10, 0, 0, 0, 0, 0, 0, 0, (w - 1) & 255, ((w - 1) >> 8) & 255, ((w - 1) >> 16) & 255, (h - 1) & 255, ((h - 1) >> 8) & 255, ((h - 1) >> 16) & 255, 0, 0])
const webpL = (w, h) => {
  const bits = ((h - 1) << 14) | (w - 1)
  return riff('VP8L', [5, 0, 0, 0, 0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255, 0, 0, 0, 0, 0, 0, 0])
}

describe('upload inspection — the bytes decide, not the label', () => {
  it('accepts each raster type when the bytes match the declared type, and reads the size', () => {
    assert.deepEqual(inspectUpload(png(640, 480), 'image/png', { allowSvg: false }), { ok: true, contentType: 'image/png', width: 640, height: 480 })
    assert.deepEqual(inspectUpload(jpeg(800, 600), 'image/jpeg', { allowSvg: false }), { ok: true, contentType: 'image/jpeg', width: 800, height: 600 })
    assert.deepEqual(inspectUpload(gif(32, 16), 'image/gif', { allowSvg: false }), { ok: true, contentType: 'image/gif', width: 32, height: 16 })
    assert.deepEqual(inspectUpload(webpX(1200, 630), 'image/webp', { allowSvg: false }), { ok: true, contentType: 'image/webp', width: 1200, height: 630 })
    assert.deepEqual(inspectUpload(webpL(100, 50), 'image/webp', { allowSvg: false }), { ok: true, contentType: 'image/webp', width: 100, height: 50 })
  })
  it('a declared type that the bytes contradict is refused', () => {
    assert.equal(inspectUpload(png(10, 10), 'image/jpeg', { allowSvg: false }).reason, 'invalid-type')
    assert.equal(inspectUpload(jpeg(10, 10), 'image/png', { allowSvg: false }).reason, 'invalid-type')
  })
  it('HTML, a script, a PDF or an empty file wearing an image label is refused', () => {
    for (const text of ['<html><script>alert(1)</script>', '<?php echo 1;', '%PDF-1.7', '']) {
      assert.equal(inspectUpload(new TextEncoder().encode(text), 'image/png', { allowSvg: true }).ok, false, text)
    }
  })
  it('a truncated header is corrupt, not accepted', () => {
    assert.equal(inspectUpload(png(10, 10).slice(0, 14), 'image/png', { allowSvg: false }).ok, false)
  })
  it('an image that describes a huge canvas is refused, whatever its file size', () => {
    assert.equal(inspectUpload(png(MAX_IMAGE_SIDE + 1, 10), 'image/png', { allowSvg: false }).reason, 'dimensions')
    assert.equal(inspectUpload(png(10000, 10000), 'image/png', { allowSvg: false }).reason, 'dimensions', '100 megapixels')
    assert.equal(inspectUpload(png(0, 10), 'image/png', { allowSvg: false }).reason, 'corrupt')
  })
  it('SVG only where allowed', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')
    assert.equal(inspectUpload(svg, 'image/svg+xml', { allowSvg: true }).ok, true)
    assert.equal(inspectUpload(svg, 'image/svg+xml', { allowSvg: false }).ok, false)
    assert.equal(inspectUpload(svg, 'image/png', { allowSvg: true }).ok, false, 'declared as something else')
  })
})

describe('SVG — text that can carry script', () => {
  const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">${inner}</svg>`
  it('plain drawing markup passes, including gradients referenced by fragment and an XML prolog', () => {
    assert.equal(inspectSvg(wrap('<defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="5" height="5"/><use href="#g"/>')), true)
    assert.equal(inspectSvg(`<?xml version="1.0"?>\n<!-- made in an editor -->\n${wrap('<circle r="2"/>')}`), true)
    assert.equal(inspectSvg('\uFEFF' + wrap('<circle r="2"/>')), true)
  })
  it('refuses everything that runs code or loads something else', () => {
    const hostile = [
      wrap('<script>alert(1)</script>'),
      wrap('<SCRIPT >alert(1)</SCRIPT>'),
      wrap('<circle onload="x()" r="1"/>'),
      wrap('<a href="javascript:alert(1)"><text>x</text></a>'),
      wrap('<a xlink:href="https://evil.example/"><text>x</text></a>'),
      wrap('<image href="https://evil.example/pixel.png"/>'),
      wrap('<foreignObject><iframe src="x"/></foreignObject>'),
      wrap('<style>@import url(https://evil.example/x.css);</style>'),
      wrap('<rect style="fill:url(https://evil.example/x)"/>'),
      wrap('<use href="data:image/svg+xml;base64,PHN2Zz4="/>'),
      '<!DOCTYPE svg [<!ENTITY x "boom">]>' + wrap('<text>&x;</text>'),
      '<html>' + wrap(''),
      'just some text',
    ]
    for (const svg of hostile) assert.equal(inspectSvg(svg), false, svg.slice(0, 80))
  })
})

describe('display names for uploads', () => {
  it('cannot carry a path, control characters or HTML through', () => {
    for (const hostile of ['../../etc/passwd', 'a/b\\c.png', 'x\u0000y.png', '<img src=x onerror=1>.png']) {
      const out = displayFileName(hostile)
      assert.ok(!/[\\/<>\u0000]/.test(out) && !out.includes('..'), `${hostile} → ${out}`)
    }
    assert.equal(displayFileName(''), 'file')
    assert.ok(displayFileName('a'.repeat(500)).length <= 120)
  })
  it('keeps a Persian name readable', () => assert.equal(displayFileName('نمونه کار.png'), 'نمونه کار.png'))
})

describe('client address (pickClientIp)', () => {
  const headers = (h) => (name) => h[name] ?? null
  it('off Vercel: first hop of x-forwarded-for, then x-real-ip (unchanged behaviour)', () => {
    assert.equal(pickClientIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'x-real-ip': '198.51.100.2' }), {}), '203.0.113.7')
    assert.equal(pickClientIp(headers({ 'x-real-ip': '198.51.100.2' }), {}), '198.51.100.2')
  })
  it('on Vercel: the platform header wins over a forwarded chain a client may have started', () => {
    const h = headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9', 'x-real-ip': '203.0.113.9' })
    assert.equal(pickClientIp(h, { VERCEL: '1' }), '203.0.113.9')
  })
  it('a value that is not an address is ignored — no header text ever becomes a bucket', () => {
    assert.equal(pickClientIp(headers({ 'x-forwarded-for': 'not-an-ip' }), {}), '0.0.0.0')
    assert.equal(pickClientIp(headers({ 'x-forwarded-for': '1.2.3.4<script>' }), {}), '0.0.0.0')
    assert.equal(pickClientIp(headers({}), { VERCEL: '1' }), '0.0.0.0')
  })
  it('IPv6 is an address too', () => assert.equal(pickClientIp(headers({ 'x-real-ip': '2001:db8::1' }), {}), '2001:db8::1'))
})

describe('the salt for hashes', () => {
  it('prefers the dedicated secret, derives one from the service-role key when it is missing, and never returns the key itself', () => {
    assert.equal(hashSecret({ INQUIRY_IP_HASH_SECRET: 'dedicated' }), 'dedicated')
    const derived = hashSecret({ SUPABASE_SERVICE_ROLE_KEY: 'service-key-value' })
    assert.match(derived, /^[0-9a-f]{64}$/)
    assert.ok(!derived.includes('service-key-value'))
    assert.notEqual(derived, hashSecret({ SUPABASE_SERVICE_ROLE_KEY: 'another-key' }))
    assert.equal(hashSecret({}), 'artaveo-dev-only-unset-secret')
  })
})

describe('rate-limit policy', () => {
  it('every rule has an address limit, and every number is a sane positive integer', () => {
    for (const [name, policy] of Object.entries(RATE_LIMITS)) {
      assert.ok(policy.ip, name)
      for (const rule of [policy.ip, policy.subject, policy.global].filter(Boolean)) {
        assert.ok(Number.isInteger(rule.limit) && rule.limit >= 1 && rule.limit <= 100000, name)
        assert.ok(Number.isInteger(rule.windowSeconds) && rule.windowSeconds >= 1 && rule.windowSeconds <= 86400, name)
      }
      if (policy.global && policy.ip) assert.ok(policy.global.limit >= policy.ip.limit, `${name}: the overall ceiling is not below one address's limit`)
    }
  })
  it('every public mutation is covered', () => {
    for (const name of ['inquiry.submit', 'inquiry.upload', 'inquiry.upload-remove', 'consultation.request', 'consultation.client-action', 'recommendation.submit', 'token.calendar', 'admin.sign-in', 'admin.mfa']) {
      assert.ok(name in RATE_LIMITS, name)
    }
  })
  it('a bucket key carries no address, e-mail or token — only scope, dimension and a hash', () => {
    const key = bucketKey('admin.sign-in', 'subject', 'a'.repeat(32))
    assert.equal(key, `admin.sign-in:subject:${'a'.repeat(32)}`)
    assert.ok(key.length <= 200)
  })
})

describe('configuration check (secret inventory)', () => {
  const prod = { VERCEL_ENV: 'production', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_ANON_KEY: 'k', CRON_SECRET: 'x'.repeat(32), INQUIRY_IP_HASH_SECRET: 'y'.repeat(32) }
  it('says nothing outside production and nothing when everything is right', () => {
    assert.deepEqual(checkSecurityConfig({}), [])
    assert.deepEqual(checkSecurityConfig(prod), [])
  })
  it('names what is missing, never a value', () => {
    const findings = checkSecurityConfig({ VERCEL_ENV: 'production', CRON_SECRET: 'short', SUPABASE_SERVICE_ROLE_KEY: 'super-secret-value' })
    const ids = findings.map((f) => f.id)
    assert.ok(ids.includes('SUPABASE_ANON_KEY') && ids.includes('CRON_SECRET') && ids.includes('INQUIRY_IP_HASH_SECRET'))
    assert.ok(!JSON.stringify(findings).includes('super-secret-value'))
    assert.equal(findings.find((f) => f.id === 'CRON_SECRET').severity, 'error')
    assert.equal(findings.find((f) => f.id === 'INQUIRY_IP_HASH_SECRET').severity, 'warning')
  })
  it('warns when the policy is only reporting', () => {
    assert.ok(checkSecurityConfig({ ...prod, CSP_REPORT_ONLY: '1' }).some((f) => f.id === 'CSP_REPORT_ONLY'))
  })
})

describe('article links (XSS review)', () => {
  const linkOf = (href) => parseArticleBody(`A [link](${href}) here.`).blocks[0].children.find((c) => c.type === 'link')?.href ?? null
  it('allows http(s), mailto, site-relative and in-page links', () => {
    assert.equal(linkOf('https://example.com/a'), 'https://example.com/a')
    assert.equal(linkOf('mailto:a@b.co'), 'mailto:a@b.co')
    assert.equal(linkOf('/en/work'), '/en/work')
    assert.equal(linkOf('#section'), '#section')
  })
  it('drops script, data, protocol-relative and backslash-smuggled links', () => {
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,AAAA', '//evil.example', '/\\evil.example', 'vbscript:x']) {
      assert.equal(linkOf(href), null, href)
    }
  })
})
