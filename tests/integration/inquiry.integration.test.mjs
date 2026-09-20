/**
 * Inquiry persistence + outbox, through the REAL server action
 * (`submitInquiry`) against a real PostgreSQL + PostgREST (roadmap § 9.2/§ 9.3,
 * Phase 19). Needs the test stack:  npm run test:stack:up
 */
import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { service, sql, uuid } from '../support/stack-env.mjs'
import { resetRequest } from '../support/next-runtime.mjs'
import { createEmptyInquiryDraft } from '../../types/inquiry.ts'

const { submitInquiry } = await import('../../app/actions/inquiries.ts')
const { processOutboxBatch } = await import('../../lib/notifications/outbox.ts')

const db = service()
const OLD = () => Date.now() - 60_000 // the form was "rendered a minute ago"
const meta = (extra = {}) => ({ honeypot: '', formRenderedAt: OLD(), idempotencyKey: uuid(), ...extra })
const draft = (extra = {}) => ({
  ...createEmptyInquiryDraft('en'),
  projectType: 'web-app-or-mvp',
  goal: 'Rebuild our booking system for buses',
  timeline: '1-3-months',
  name: '  Integration Client  ',
  email: `Client-${uuid().slice(0, 8)}@Example.COM`,
  consent: true,
  ...extra,
})
const ip = (n) => ({ 'x-forwarded-for': `203.0.113.${n}` })
const rowsFor = async (table, column, value) => (await db.from(table).select('*').eq(column, value)).data ?? []

before(() => sql('truncate public.inquiries restart identity cascade'))

describe('a valid submission', () => {
  it('persists exactly one inquiry with normalised values and the default pipeline state', async () => {
    resetRequest(ip(10))
    const d = draft()
    const result = await submitInquiry(d, meta())
    assert.equal(result.ok, true)
    const [row] = await rowsFor('inquiries', 'id', result.id)
    assert.equal(row.name, 'Integration Client', 'name trimmed')
    assert.equal(row.email, d.email.trim().toLowerCase(), 'e-mail lower-cased')
    assert.deepEqual([row.stage, row.priority], ['new', 'normal'])
    assert.equal(row.consent, true)
    assert.deepEqual(row.tags, [])
  })
  it('stores a salted hash of the address, never the address', async () => {
    resetRequest(ip(11))
    const { id } = await submitInquiry(draft(), meta())
    const [row] = await rowsFor('inquiries', 'id', id)
    assert.match(row.submitter_ip_hash, /^[0-9a-f]{64}$/)
    assert.ok(!JSON.stringify(row).includes('203.0.113.11'))
  })
  it('writes the "created" audit event, by the system', async () => {
    resetRequest(ip(12))
    const { id } = await submitInquiry(draft(), meta())
    const events = await rowsFor('inquiry_events', 'inquiry_id', id)
    assert.deepEqual(events.map((e) => [e.type, e.actor]), [['created', 'system']])
  })
  it('drops empty link rows, keeps real ones', async () => {
    resetRequest(ip(13))
    const { id } = await submitInquiry(draft({ links: [{ id: '1', url: ' https://example.com/a ' }, { id: '2', url: '   ' }] }), meta())
    const [row] = await rowsFor('inquiries', 'id', id)
    assert.deepEqual(row.links, [{ url: 'https://example.com/a' }])
  })
  it('records source attribution without anything about the visitor', async () => {
    resetRequest(ip(14))
    const { id } = await submitInquiry(draft(), meta({ sourceReferrer: 'https://news.example/', sourceUtmSource: 'newsletter', sourceChannel: 'brief' }))
    const [row] = await rowsFor('inquiries', 'id', id)
    assert.deepEqual([row.source_referrer, row.source_utm_source, row.source_channel], ['https://news.example/', 'newsletter', 'brief'])
  })
})

describe('the outbox', () => {
  it('one submission queues exactly two messages: an owner alert and a client confirmation', async () => {
    resetRequest(ip(20))
    const d = draft()
    const { id } = await submitInquiry(d, meta())
    const out = await rowsFor('notification_outbox', 'inquiry_id', id)
    assert.deepEqual(out.map((o) => o.kind).sort(), ['client-confirmation', 'owner-alert'])
    const confirmation = out.find((o) => o.kind === 'client-confirmation')
    assert.equal(confirmation.recipient_email, d.email.trim().toLowerCase())
    assert.ok(confirmation.dedupe_key, 'every message carries a dedupe key')
  })
  it('with the console provider the inline attempt marks them sent — and logs, does not deliver', async () => {
    resetRequest(ip(21))
    const { id } = await submitInquiry(draft(), meta())
    const out = await rowsFor('notification_outbox', 'inquiry_id', id)
    assert.ok(out.every((o) => o.status === 'sent' && o.last_provider === 'console'), JSON.stringify(out.map((o) => [o.status, o.last_provider])))
    const attempts = await db.from('notification_attempts').select('provider, ok').in('outbox_id', out.map((o) => o.id))
    assert.ok(attempts.data.length >= 2 && attempts.data.every((a) => a.provider === 'console' && a.ok === true), JSON.stringify(attempts))
  })
  it('the client confirmation is in the language the visitor chose', async () => {
    resetRequest(ip(22))
    const { id } = await submitInquiry(draft({ preferredLocale: 'fa' }), meta())
    const out = await rowsFor('notification_outbox', 'inquiry_id', id)
    assert.equal(out.find((o) => o.kind === 'client-confirmation').locale, 'fa')
  })
  it('the owner alert replies to the client (Reply-To), the confirmation does not need to', async () => {
    resetRequest(ip(23))
    const d = draft()
    const { id } = await submitInquiry(d, meta())
    const out = await rowsFor('notification_outbox', 'inquiry_id', id)
    assert.equal(out.find((o) => o.kind === 'owner-alert').reply_to, d.email.trim().toLowerCase())
  })
  it('a due sweep finds nothing left to send afterwards (no message is ever sent twice)', async () => {
    resetRequest(ip(24))
    await submitInquiry(draft(), meta())
    const result = await processOutboxBatch(db, { limit: 50 })
    assert.equal(result.attempted, 0)
  })
})

describe('idempotency', () => {
  it('the same key twice → one inquiry, "replay" on the second, still exactly two outbox rows', async () => {
    resetRequest(ip(30))
    const d = draft()
    const m = meta()
    const first = await submitInquiry(d, m)
    const second = await submitInquiry(d, m)
    assert.equal(first.ok && second.ok, true)
    assert.equal(second.id, first.id)
    assert.equal(second.replay, true)
    assert.equal((await rowsFor('inquiries', 'idempotency_key', m.idempotencyKey)).length, 1)
    assert.equal((await rowsFor('notification_outbox', 'inquiry_id', first.id)).length, 2)
  })
  it('six parallel submits with one key (a double-click storm) → one row, everyone told the same id', async () => {
    resetRequest(ip(31))
    const d = draft()
    const m = meta()
    const results = await Promise.all(Array.from({ length: 6 }, () => submitInquiry(d, m)))
    assert.ok(results.every((r) => r.ok), JSON.stringify(results))
    assert.equal(new Set(results.map((r) => r.id)).size, 1)
    assert.equal((await rowsFor('inquiries', 'idempotency_key', m.idempotencyKey)).length, 1)
    assert.equal((await rowsFor('notification_outbox', 'inquiry_id', results[0].id)).length, 2, 'no duplicate messages under a race')
  })
})

describe('refusals write nothing', () => {
  const count = async () => (await db.from('inquiries').select('id', { count: 'exact', head: true })).count
  it('an invalid draft → "invalid"', async () => {
    resetRequest(ip(40))
    const before = await count()
    assert.deepEqual(await submitInquiry(draft({ email: 'not-an-email' }), meta()), { ok: false, code: 'invalid' })
    assert.equal(await count(), before)
  })
  it('a filled honeypot and a too-fast submit both → the same generic "rejected"', async () => {
    resetRequest(ip(41))
    const before = await count()
    assert.deepEqual(await submitInquiry(draft(), meta({ honeypot: 'http://spam.example' })), { ok: false, code: 'rejected' })
    assert.deepEqual(await submitInquiry(draft(), meta({ formRenderedAt: Date.now() - 500 })), { ok: false, code: 'rejected' })
    assert.equal(await count(), before)
  })
  it('a hostile link scheme cannot be persisted (the server re-validates)', async () => {
    resetRequest(ip(42))
    const result = await submitInquiry(draft({ links: [{ id: '1', url: 'javascript:alert(1)' }] }), meta())
    assert.equal(result.ok, false)
  })
})

describe('rate limits', () => {
  it('4th submission for one e-mail within a day is refused (limit 3)', async () => {
    const email = `limit-${uuid().slice(0, 8)}@example.com`
    const outcomes = []
    for (let i = 0; i < 4; i += 1) {
      resetRequest(ip(50 + i)) // different IPs: this is the per-e-mail limit
      outcomes.push((await submitInquiry(draft({ email }), meta())).ok)
    }
    assert.deepEqual(outcomes, [true, true, true, false])
  })
  it('6th submission from one address within an hour is refused (limit 5)', async () => {
    const outcomes = []
    for (let i = 0; i < 6; i += 1) {
      resetRequest(ip(99)) // same IP, different e-mails: this is the per-IP limit
      outcomes.push((await submitInquiry(draft(), meta())).ok)
    }
    assert.deepEqual(outcomes, [true, true, true, true, true, false])
  })
})
