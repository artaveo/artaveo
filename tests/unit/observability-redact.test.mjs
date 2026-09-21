/**
 * Phase 24 — what may leave a request as a log line or a stored error. Every case
 * here is a way private data could otherwise end up in a log: a database error that
 * quotes a row, a private-link path, a header, a stack that names a file system.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { EVENT_NAME, fingerprintOf, normalizeMessage, redactFields, redactPath, scrubText, serializeError } from '../../lib/observability/redact.ts'

const UUID = '3f2b8c1e-5d4a-4e6b-9a7c-0d1e2f3a4b5c'
const TOKEN = 'Zk3nQ8xLp2VbYw9RtUeA7hGd'.repeat(2) // 48 chars, letters and digits, like a link token

describe('scrubText', () => {
  it('removes e-mail addresses, including the one a database error quotes', () => {
    const out = scrubText('duplicate key value violates unique constraint: Key (email)=(ada.lovelace+test@example.co.uk) already exists')
    assert.ok(!out.includes('ada.lovelace'), out)
    assert.ok(out.includes('[email]'))
  })
  it('removes JWTs, bearer credentials and key=value secrets', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    assert.ok(!scrubText(`token ${jwt}`).includes('eyJ'))
    assert.ok(!scrubText('Authorization: Bearer abcdef0123456789abcdef').includes('abcdef0123456789'))
    const kv = scrubText('connect failed password=hunter2hunter2 host=db')
    assert.ok(!kv.includes('hunter2'), kv)
    assert.ok(scrubText('api_key: "sk_live_abcdefghijk"').includes('[redacted]'))
  })
  it('removes long random-looking tokens and phone-like numbers, keeps ids and words', () => {
    assert.ok(!scrubText(`GET /consultation/${TOKEN} failed`).includes(TOKEN))
    assert.ok(!scrubText('call +93 790 685 832 back').includes('790'))
    assert.equal(scrubText(`request ${UUID} failed`), `request ${UUID} failed`)
    assert.equal(scrubText('ERR_INVALID_ARG_TYPE_THAT_IS_LONG_BUT_ONLY_LETTERS'), 'ERR_INVALID_ARG_TYPE_THAT_IS_LONG_BUT_ONLY_LETTERS')
  })
  it('caps length', () => {
    assert.ok(scrubText('x '.repeat(1000), 100).length <= 100)
  })
})

describe('redactPath', () => {
  it('drops the query string and fragment', () => {
    assert.equal(redactPath('/en/work?utm_source=x&email=a@b.co#top'), '/en/work')
  })
  it('replaces a private-link token in the path — the path would be a working key', () => {
    assert.equal(redactPath(`/en/consultation/${TOKEN}`), '/en/consultation/[token]')
    assert.equal(redactPath(`/api/consultation/${TOKEN}/calendar`), '/api/consultation/[token]/calendar')
    assert.equal(redactPath(`/fa/recommend/${TOKEN}`), '/fa/recommend/[token]')
  })
  it('replaces ids and keeps route patterns and ordinary slugs', () => {
    assert.equal(redactPath(`/en/admin/leads/${UUID}`), '/en/admin/leads/[id]')
    assert.equal(redactPath('/[locale]/work/[slug]'), '/[locale]/work/[slug]')
    assert.equal(redactPath('/en/work/transportation-system'), '/en/work/transportation-system')
  })
  it('survives malformed encodings and long input', () => {
    assert.doesNotThrow(() => redactPath('/en/%E0%A4%A'))
    assert.ok(redactPath(`/${'a'.repeat(500)}`).length <= 200)
  })
})

describe('serializeError', () => {
  it('handles an Error, with the stack trimmed and cleaned of file-system prefixes and query strings', () => {
    const err = new Error('boom for ada@example.com')
    err.stack = ['Error: boom', '    at run (/home/runner/work/app/lib/observability/store.ts:10:5)', '    at next (/var/task/.next/server/chunks/a.js?x=1:2:3)', ...Array(30).fill('    at frame')].join('\n')
    const out = serializeError(err)
    assert.ok(!out.message.includes('ada@'))
    assert.ok(!out.stack.includes('/home/runner'), out.stack)
    assert.ok(!out.stack.includes('?x=1'))
    assert.ok(out.stack.split('\n').length <= 12)
  })
  it('handles the plain objects Supabase returns, and drops details and hint (they hold row values)', () => {
    const out = serializeError({ message: 'insert failed', code: '23505', details: 'Key (email)=(a@b.co) already exists.', hint: 'secret hint' })
    assert.equal(out.code, '23505')
    assert.ok(!JSON.stringify(out).includes('a@b.co'))
    assert.ok(!JSON.stringify(out).includes('secret hint'))
  })
  it('handles strings, null, undefined and circular objects without throwing', () => {
    assert.equal(serializeError('plain').message, 'plain')
    assert.doesNotThrow(() => serializeError(null))
    assert.doesNotThrow(() => serializeError(undefined))
    const loop = {}
    loop.self = loop
    assert.doesNotThrow(() => serializeError(loop))
  })
  it('keeps one level of cause, scrubbed', () => {
    const out = serializeError(new Error('outer', { cause: new Error('inner ada@example.com') }))
    assert.ok(out.cause.message.includes('[email]'))
  })
})

describe('redactFields', () => {
  it('replaces the value under a private key, whatever its shape', () => {
    const out = redactFields({ email: 'a@b.co', phone: '123', token: 'abc', goal: 'my secret plan', password: 'x', authorization: 'Bearer y', ok: 'fine', count: 3 })
    assert.equal(out.email, '[redacted]')
    assert.equal(out.phone, '[redacted]')
    assert.equal(out.token, '[redacted]')
    assert.equal(out.goal, '[redacted]')
    assert.equal(out.password, '[redacted]')
    assert.equal(out.authorization, '[redacted]')
    assert.equal(out.ok, 'fine')
    assert.equal(out.count, 3)
  })
  it('redacts nested private keys and scrubs values that look private under innocent keys', () => {
    const out = redactFields({ ctx: { user: { email: 'a@b.co' } }, detail: 'sent to ada@example.com' })
    assert.equal(out.ctx.user.email, '[redacted]')
    assert.ok(out.detail.includes('[email]'))
  })
  it('bounds depth, width, array length and cycles', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } }
    assert.equal(redactFields(deep).a.b.c.d, '[truncated]')
    const wide = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]))
    assert.ok(Object.keys(redactFields(wide)).length <= 31)
    assert.equal(redactFields({ list: Array.from({ length: 50 }, (_, i) => i) }).list.length, 21)
    const loop = { name2: 'x' }
    loop.self = loop
    assert.equal(redactFields(loop).self, '[circular]')
  })
  it('drops functions and symbols, stringifies bigint, serialises dates and errors', () => {
    const out = redactFields({ f() {}, s: Symbol('x'), n: 10n, d: new Date('2026-09-21T00:00:00Z'), e: new Error('x') })
    assert.equal('f' in out, true)
    assert.equal(out.f, undefined)
    assert.equal(out.n, '10')
    assert.equal(out.d, '2026-09-21T00:00:00.000Z')
    assert.equal(out.e.name, 'Error')
  })
})

describe('fingerprint', () => {
  const base = { event: 'inquiry.persist_failed', name: 'Error', route: '/[locale]/start' }
  it('is the same for the same failure with different ids, numbers and quoted values', () => {
    const a = fingerprintOf({ ...base, message: `row ${UUID} not found after 12 ms for "ada"` })
    const b = fingerprintOf({ ...base, message: 'row 11111111-2222-4333-8444-555555555555 not found after 987 ms for "grace"' })
    assert.equal(a, b)
    assert.match(a, /^[0-9a-f]{32}$/)
  })
  it('differs by event, by message and by route', () => {
    const a = fingerprintOf({ ...base, message: 'x failed' })
    assert.notEqual(a, fingerprintOf({ ...base, event: 'other.failed', message: 'x failed' }))
    assert.notEqual(a, fingerprintOf({ ...base, message: 'y failed' }))
    assert.notEqual(a, fingerprintOf({ ...base, route: '/[locale]/work/[slug]', message: 'x failed' }))
  })
  it('normalizeMessage removes what varies', () => {
    assert.equal(normalizeMessage('timeout after 5000 ms on 3 attempts'), 'timeout after <n> ms on <n> attempts')
  })
})

describe('EVENT_NAME', () => {
  it('accepts area.what_happened and rejects everything else', () => {
    for (const ok of ['inquiry.submitted', 'notification.exhausted', 'rate_limit.unavailable', 'a.b.c']) assert.match(ok, EVENT_NAME)
    for (const bad of ['inquiry', 'Inquiry.Submitted', 'inquiry submitted', 'inquiry.', '.x', 'x.y-z', "x.y'; drop table"]) assert.doesNotMatch(bad, EVENT_NAME)
  })
})
