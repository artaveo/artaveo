/**
 * Phase 24 against the REAL database: the two recording functions (grouping,
 * windows, regressions, the cap, who may call them), the real Server Actions leaving
 * correlated records behind, error tracking that survives hostile input, every alert
 * rule against real rows, the alert e-mail's once-a-day rule, the routes, and the
 * limiter failing open in the open.
 */
import assert from 'node:assert/strict'
import { before, beforeEach, describe, it } from 'node:test'

import { EDITOR, OWNER } from '../support/stack/accounts.mjs'
import { anon, quietSink, service, sql, uuid } from '../support/stack-env.mjs'
import { resetRequest } from '../support/next-runtime.mjs'
import { createEmptyInquiryDraft } from '../../types/inquiry.ts'

const { setLogSink } = await import('../../lib/observability/logger.ts')
const { runWithRequestId } = await import('../../lib/observability/context.ts')
const { captureError, track, purgeOpsData } = await import('../../lib/observability/store.ts')
const { captureRequestError } = await import('../../lib/observability/request-error.ts')
const { evaluateAlerts, raiseAlerts, alertDay } = await import('../../lib/observability/alerts.ts')
const { checkInquiryPathUncached } = await import('../../lib/observability/health.ts')
const { lookupReference, getObservabilityOverview } = await import('../../lib/admin/observability.ts')
const { checkRateLimit } = await import('../../lib/security/rate-limit.ts')
const { writeAuditLog } = await import('../../lib/admin/audit.ts')
const { submitInquiry } = await import('../../app/actions/inquiries.ts')
const { adminSignIn } = await import('../../app/actions/admin-auth.ts')
const { setErrorGroupStatus } = await import('../../app/actions/observability.ts')
const { processOutboxBatch } = await import('../../lib/notifications/outbox.ts')

const db = service()
const HOUR = 3600_000
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const form = (email, password) => {
  const f = new FormData()
  f.set('email', email)
  f.set('password', password)
  return f
}
const signIn = (account) => adminSignIn(form(account.email, account.password))
const groups = async () => (await db.from('error_groups').select('*').order('first_seen_at')).data ?? []
const events = async (name) => (await db.from('ops_events').select('*').eq('name', name).order('occurred_at')).data ?? []
const meta = (extra = {}) => ({ honeypot: '', formRenderedAt: Date.now() - 60_000, idempotencyKey: uuid(), ...extra })
const draft = (extra = {}) => ({
  ...createEmptyInquiryDraft('en'),
  projectType: 'web-app-or-mvp',
  goal: 'Rebuild our booking system for buses',
  timeline: '1-3-months',
  name: 'Ada Observability',
  email: `ada-${uuid().slice(0, 8)}@example.com`,
  consent: true,
  ...extra,
})

const clean = () =>
  sql('truncate public.ops_events, public.error_groups, public.inquiries, public.notification_outbox, public.audit_log, public.rate_limit_buckets restart identity cascade')

before(clean)
beforeEach(async () => {
  clean()
  resetRequest()
  setLogSink(quietSink)
})

describe('record_error_event', () => {
  const call = (fp, extra = {}) =>
    db.rpc('record_error_event', { p_fingerprint: fp, p_source: 'action', p_event: 'x.failed', p_name: 'Error', p_message: 'boom', p_stack: null, p_route: '/[locale]/start', p_digest: null, p_request_id: null, p_data: {}, ...extra })
  const fp = 'a'.repeat(32)

  it('creates a group, then counts repeats into the same row with a window count', async () => {
    const first = (await call(fp)).data[0]
    assert.deepEqual([first.is_new, first.is_reopened, first.window_hits, first.total_hits], [true, false, 1, 1])
    for (let i = 0; i < 4; i += 1) await call(fp)
    const [row] = await groups()
    assert.equal(Number(row.event_count), 5)
    assert.equal(row.window_count, 5)
    assert.equal(row.status, 'open')
  })
  it('is atomic: 30 simultaneous occurrences are counted exactly', async () => {
    await Promise.all(Array.from({ length: 30 }, () => call(fp)))
    assert.equal(Number((await groups())[0].event_count), 30)
  })
  it('starts a new window an hour later, keeping the total', async () => {
    await call(fp)
    sql(`update public.error_groups set window_started_at = now() - interval '2 hours', window_count = 9 where fingerprint = '${fp}'`)
    const next = (await call(fp)).data[0]
    assert.equal(next.window_hits, 1)
    assert.equal(Number(next.total_hits), 2)
  })
  it('a resolved failure that comes back is reopened (a regression); an ignored one stays ignored', async () => {
    await call(fp)
    await call('b'.repeat(32))
    sql(`update public.error_groups set status = 'resolved', resolved_at = now() where fingerprint = '${fp}'`)
    sql(`update public.error_groups set status = 'ignored' where fingerprint = '${'b'.repeat(32)}'`)
    assert.equal((await call(fp)).data[0].is_reopened, true)
    assert.equal((await call('b'.repeat(32))).data[0].is_reopened, false)
    const byFp = Object.fromEntries((await groups()).map((g) => [g.fingerprint, g]))
    assert.equal(byFp[fp].status, 'open')
    assert.equal(byFp[fp].resolved_at, null)
    assert.equal(byFp['b'.repeat(32)].status, 'ignored')
  })
  it('keeps the last request id and digest it was given, and never blanks them', async () => {
    const id = uuid()
    await call(fp, { p_request_id: id, p_digest: '12345' })
    await call(fp)
    const [row] = await groups()
    assert.equal(row.last_request_id, id)
    assert.equal(row.digest, '12345')
  })
  it('caps distinct groups: past 500 new failures share one overflow row, and the cap is never purged by age', async () => {
    sql(`insert into public.error_groups (fingerprint, source, event, message) select md5(g::text), 'server', 'x.failed', 'm' from generate_series(1, 500) g`)
    const result = (await call('c'.repeat(32))).data[0]
    assert.equal(result.is_new, true)
    assert.equal((await groups()).length, 501)
    assert.ok((await groups()).some((g) => g.fingerprint === 'overflow'))
    await call('d'.repeat(32))
    assert.equal((await groups()).length, 501, 'a second new failure does not add a row')
    sql(`update public.error_groups set last_seen_at = now() - interval '200 days'`)
    await purgeOpsData(db)
    assert.deepEqual((await groups()).map((g) => g.fingerprint), ['overflow'])
  })
  it('refuses a bad fingerprint, source or event name instead of storing it', async () => {
    assert.ok((await call('short')).error)
    assert.ok((await call(fp, { p_source: 'nonsense' })).error)
    assert.ok((await call(fp, { p_event: 'Not Valid' })).error)
  })
  it('truncates over-long text instead of failing the request it describes', async () => {
    const res = await call(fp, { p_message: 'm'.repeat(5000), p_stack: 's'.repeat(9000), p_route: 'r'.repeat(900) })
    assert.ifError(res.error)
    const [row] = await groups()
    assert.deepEqual([row.message.length, row.stack.length, row.route.length], [500, 4000, 200])
  })
})

describe('record_ops_event', () => {
  const call = (level, name, subject = null, dedupe = 0) => db.rpc('record_ops_event', { p_level: level, p_name: name, p_request_id: null, p_subject_type: subject ? 'x' : null, p_subject_id: subject, p_data: {}, p_dedupe_seconds: dedupe })

  it('writes a row, and de-duplicates a burst by name and subject inside the window', async () => {
    assert.equal((await call('warn', 'rate_limit.unavailable', null, 60)).data, true)
    assert.equal((await call('warn', 'rate_limit.unavailable', null, 60)).data, false)
    assert.equal((await call('warn', 'rate_limit.unavailable', 'other', 60)).data, true, 'a different subject is its own event')
    assert.equal((await events('rate_limit.unavailable')).length, 2)
  })
  it('stops informational rows when the table takes more than 5,000 an hour, but never warnings or errors', async () => {
    sql(`insert into public.ops_events (level, name) select 'info', 'flood.event' from generate_series(1, 5001)`)
    assert.equal((await call('info', 'inquiry.submitted')).data, false)
    assert.equal((await call('error', 'notification.exhausted')).data, true)
    assert.equal((await call('warn', 'audit.write_failed')).data, true)
  })
  it('refuses an invalid name, level or an oversized payload', async () => {
    assert.ok((await call('info', 'Bad Name')).error)
    assert.ok((await call('debug', 'a.b')).error)
    const big = await db.rpc('record_ops_event', { p_level: 'info', p_name: 'a.b', p_request_id: null, p_subject_type: null, p_subject_id: null, p_data: { x: 'y'.repeat(9000) }, p_dedupe_seconds: 0 })
    assert.ok(big.error)
  })
  it('purge deletes what is older than the retention, and only that', async () => {
    await call('info', 'inquiry.submitted')
    sql(`insert into public.ops_events (level, name, occurred_at) values ('info', 'old.event', now() - interval '100 days')`)
    const purged = await purgeOpsData(db)
    assert.equal(purged.eventsDeleted, 1)
    assert.deepEqual((await db.from('ops_events').select('name')).data.map((r) => r.name), ['inquiry.submitted'])
  })
})

describe('who may touch the new objects', () => {
  it('the browser roles can neither call the functions nor read the tables', async () => {
    const client = anon()
    for (const [fn, args] of [
      ['record_ops_event', { p_level: 'info', p_name: 'a.b', p_request_id: null, p_subject_type: null, p_subject_id: null, p_data: {}, p_dedupe_seconds: 0 }],
      ['record_error_event', { p_fingerprint: 'a'.repeat(32), p_source: 'server', p_event: 'a.b', p_name: 'E', p_message: 'm', p_stack: null, p_route: null, p_digest: null, p_request_id: null, p_data: {} }],
      ['purge_ops_data', { p_events_days: 1, p_groups_days: 1 }],
    ]) assert.ok((await client.rpc(fn, args)).error, `${fn} must be refused to anon`)
    await db.rpc('record_ops_event', { p_level: 'info', p_name: 'a.b', p_request_id: null, p_subject_type: null, p_subject_id: null, p_data: {}, p_dedupe_seconds: 0 })
    for (const table of ['ops_events', 'error_groups']) {
      const res = await client.from(table).select('*')
      assert.ok(res.error || res.data.length === 0, `${table} must not be readable by anon`)
    }
    assert.equal((await client.from('ops_events').insert({ level: 'info', name: 'a.b' })).error !== null, true)
  })
})

describe('captureError and track (the application side)', () => {
  it('two occurrences with different ids are one group; the request id and route are stored; the digest is kept', async () => {
    const id = uuid()
    await runWithRequestId(id, async () => {
      await captureError(new Error(`row ${uuid()} missing after 12 ms`), { event: 'inquiry.persist_failed', source: 'action', route: '/en/start', digest: '999' })
      await captureError(new Error(`row ${uuid()} missing after 987 ms`), { event: 'inquiry.persist_failed', source: 'action', route: '/en/start' })
    })
    const rows = await groups()
    assert.equal(rows.length, 1)
    assert.equal(Number(rows[0].event_count), 2)
    assert.equal(rows[0].last_request_id, id)
    assert.equal(rows[0].digest, '999')
  })
  it('stores nothing private: an address in the message, a token in the route, private keys in the fields', async () => {
    const token = 'Zk3nQ8xLp2VbYw9RtUeA7hGdZk3nQ8xLp2VbYw9R'
    await captureError(new Error('Key (email)=(victim@example.com) already exists'), { event: 'inquiry.persist_failed', route: `/en/consultation/${token}`, fields: { email: 'victim@example.com', goal: 'a very private plan', kind: 'ok' } })
    await track('inquiry.submitted', { subject: { type: 'inquiry', id: uuid() }, data: { email: 'victim@example.com', name: 'Victim', locale: 'en' } })
    const all = JSON.stringify([await groups(), (await db.from('ops_events').select('*')).data])
    for (const secret of ['victim@example.com', token, 'private plan', 'Victim']) assert.ok(!all.includes(secret), `${secret} leaked into the database`)
    assert.ok(all.includes('[token]') && all.includes('[email]'))
  })
  it('never throws, even with no client, a broken value or a database that refuses', async () => {
    await captureError(new Error('x'), { event: 'a.b', supabase: null })
    await captureError(undefined, { event: 'not a valid name' })
    const broken = { rpc: async () => { throw new Error('db down') } }
    assert.equal(await track('a.b', { supabase: broken }), false)
    await captureError(new Error('x'), { event: 'a.b', supabase: broken })
    assert.equal((await groups()).length, 0, 'a database that refuses records nothing and throws nothing')
    // An object whose own toString throws is still filed (against the real database), not lost or thrown.
    await captureError({ toString() { throw new Error('nope') } }, { event: 'a.b' })
    assert.equal((await groups()).length, 1)
  })
  it('logs the line first, so the record exists when the database is what is broken', async () => {
    const lines = []
    setLogSink((level, line) => lines.push(JSON.parse(line)))
    const broken = { rpc: async () => ({ data: null, error: { message: 'connection refused' } }) }
    await captureError(new Error('the real failure'), { event: 'inquiry.persist_failed', supabase: broken })
    assert.equal(lines[0].event, 'inquiry.persist_failed')
    assert.equal(lines[0].err.message, 'the real failure')
    assert.equal(lines[1].event, 'observability.persist_failed', 'a failing store warns once; it does not report itself')
    assert.equal(lines.length, 2)
  })
})

describe('onRequestError', () => {
  it('files an unhandled error under its route PATTERN, with the digest and the request id, and no token anywhere', async () => {
    const id = uuid()
    const token = 'Zk3nQ8xLp2VbYw9RtUeA7hGdZk3nQ8xLp2VbYw9R'
    const err = Object.assign(new Error('render exploded'), { digest: '4242' })
    await captureRequestError(err, { path: `/en/consultation/${token}?x=1`, method: 'GET', headers: { 'x-request-id': id, cookie: 'session=secret' } }, { routePath: '/[locale]/consultation/[token]', routeType: 'render', routerKind: 'App Router' })
    const [row] = await groups()
    assert.equal(row.event, 'request.render_error')
    assert.equal(row.source, 'render')
    assert.equal(row.route, '/[locale]/consultation/[token]')
    assert.equal(row.digest, '4242')
    assert.equal(row.last_request_id, id)
    const stored = JSON.stringify(row)
    assert.ok(!stored.includes(token) && !stored.includes('secret'))
  })
  it('never throws into Next, and a forged request id header is ignored', async () => {
    await assert.doesNotReject(captureRequestError(null, { path: '/', method: 'GET', headers: {} }, {}))
    await captureRequestError(new Error('x'), { path: '/', method: 'GET', headers: { 'x-request-id': "1'; drop table x" } }, { routeType: 'action', routePath: '/a' })
    const forged = (await groups()).find((g) => g.event === 'request.action_error')
    assert.equal(forged.last_request_id, null)
    assert.equal(forged.source, 'action')
  })
})

describe('a real brief leaves correlated records', () => {
  it('the inquiry, its timeline, its e-mails, the event and the reference lookup all carry the request id — and no personal data is in the event', async () => {
    const id = uuid()
    resetRequest({ 'x-request-id': id, 'x-forwarded-for': '198.51.100.7' })
    const d = draft()
    const result = await submitInquiry(d, meta())
    assert.equal(result.ok, true)

    const inquiry = (await db.from('inquiries').select('*').eq('id', result.id).single()).data
    assert.equal(inquiry.request_id, id)
    assert.ok((await db.from('inquiry_events').select('request_id').eq('inquiry_id', result.id)).data.every((row) => row.request_id === id))
    const outbox = (await db.from('notification_outbox').select('kind, request_id').eq('inquiry_id', result.id)).data
    assert.equal(outbox.length, 2)
    assert.ok(outbox.every((row) => row.request_id === id))

    const [submitted] = await events('inquiry.submitted')
    assert.equal(submitted.request_id, id)
    assert.equal(submitted.subject_id, result.id)
    const stored = JSON.stringify(submitted)
    for (const secret of [d.email.toLowerCase(), 'Ada Observability', 'booking system']) assert.ok(!stored.toLowerCase().includes(secret.toLowerCase()), `${secret} in the event`)

    const found = await lookupReference(id)
    assert.equal(found.kind, 'found')
    assert.equal(found.inquiries.length, 1)
    assert.equal(found.notifications.length, 2)
    assert.ok(found.events.some((e) => e.name === 'inquiry.submitted'))
    assert.ok(found.timeline.length >= 1)
  })
  it('a repeated submission (idempotent replay) is not a second inquiry.submitted', async () => {
    const m = meta()
    const d = draft()
    resetRequest({ 'x-request-id': uuid() })
    await submitInquiry(d, m)
    resetRequest({ 'x-request-id': uuid() })
    const again = await submitInquiry(d, m)
    assert.equal(again.replay, true)
    assert.equal((await events('inquiry.submitted')).length, 1)
  })
  it('a database failure while saving the brief is no longer silent: an error group appears, with the request id', async () => {
    sql(`create or replace function public.boom() returns trigger language plpgsql as $$ begin raise exception 'simulated outage'; end $$`)
    sql('create trigger boom before insert on public.inquiries for each row execute function public.boom()')
    try {
      const id = uuid()
      resetRequest({ 'x-request-id': id })
      const result = await submitInquiry(draft(), meta())
      assert.deepEqual(result, { ok: false, code: 'error' }, 'what the visitor sees is unchanged')
      const [group] = await groups()
      assert.equal(group.event, 'inquiry.persist_failed')
      assert.equal(group.source, 'action')
      assert.equal(group.last_request_id, id)
      assert.match(group.message, /simulated outage/)
    } finally {
      sql('drop trigger boom on public.inquiries')
      sql('drop function public.boom()')
    }
  })
  it('rejected briefs (honeypot, too fast) are logged, not stored as events', async () => {
    const lines = []
    setLogSink((level, line) => lines.push(JSON.parse(line)))
    resetRequest()
    await submitInquiry(draft(), meta({ honeypot: 'gotcha' }))
    await submitInquiry(draft(), meta({ formRenderedAt: Date.now() }))
    assert.deepEqual(lines.filter((l) => l.event === 'inquiry.rejected').map((l) => l.reason), ['honeypot', 'too-fast'])
    assert.equal((await events('inquiry.submitted')).length, 0)
  })
})

describe('the audit trail and the limiter, observed', () => {
  it('an audit row carries the request id as its correlation id, and each entry is one log line without its payload', async () => {
    const id = uuid()
    const lines = []
    setLogSink((level, line) => lines.push(JSON.parse(line)))
    resetRequest({ 'x-request-id': id })
    await writeAuditLog({ actor: 'someone', action: 'test.action', entity: 'thing', before: { secret: 'before' }, after: { secret: 'after' } })
    const [row] = (await db.from('audit_log').select('*')).data
    assert.equal(row.correlation_id, id)
    const line = lines.find((l) => l.event === 'audit.recorded')
    assert.equal(line.action, 'test.action')
    assert.equal(line.requestId, id)
    assert.ok(!JSON.stringify(line).includes('secret'))
  })
  it('a lost audit entry becomes an audit.write_failed event, and an alert', async () => {
    sql(`create or replace function public.boom() returns trigger language plpgsql as $$ begin raise exception 'audit down'; end $$`)
    sql('create trigger boom before insert on public.audit_log for each row execute function public.boom()')
    try {
      await writeAuditLog({ actor: 'x', action: 'test.lost', entity: 'thing' })
      await writeAuditLog({ actor: 'x', action: 'test.lost2', entity: 'thing' })
    } finally {
      sql('drop trigger boom on public.audit_log')
      sql('drop function public.boom()')
    }
    assert.equal((await events('audit.write_failed')).length, 1, 'de-duplicated inside a minute')
    const { alerts } = await evaluateAlerts(db)
    assert.ok(alerts.some((a) => a.id === 'audit.write_failed' && a.severity === 'error'))
  })
  it('the limiter still fails OPEN — and now says so: an event, at most one a minute, and a warning', async () => {
    sql('alter function public.consume_rate_limit(text, int, int) rename to consume_rate_limit_off')
    try {
      resetRequest({ 'x-forwarded-for': '198.51.100.9' })
      for (let i = 0; i < 3; i += 1) assert.deepEqual(await checkRateLimit('inquiry.submit'), { ok: true })
    } finally {
      sql('alter function public.consume_rate_limit_off(text, int, int) rename to consume_rate_limit')
    }
    const rows = await events('rate_limit.unavailable')
    assert.equal(rows.length >= 1 && rows.length <= 2, true, `de-duplicated, got ${rows.length}`)
    const { alerts } = await evaluateAlerts(db)
    assert.ok(alerts.some((a) => a.id === 'rate_limit.unavailable' && a.severity === 'warning'))
  })
})

describe('every alert rule against real rows', () => {
  const ids = async () => (await evaluateAlerts(db, new Date(), { VERCEL_ENV: 'preview' })).alerts.map((a) => a.id)
  const newInquiry = async (createdAgoMs) => {
    const { data, error } = await db.from('inquiries').insert({ idempotency_key: uuid(), goal: 'g', name: 'n', email: 'a@example.com', preferred_locale: 'en', preferred_channel: 'email', consent: true, created_at: ago(createdAgoMs) }).select('id').single()
    assert.ifError(error)
    return data.id
  }
  const outboxRow = async (patch = {}) => {
    const { data, error } = await db.from('notification_outbox').insert({ kind: 'owner-alert', recipient_email: 'owner@example.com', locale: 'en', subject: 's', body_text: 'b', dedupe_key: `k-${uuid()}`, entity_type: 'test', entity_id: uuid(), ...patch }).select('id').single()
    assert.ifError(error)
    return data.id
  }

  it('a calm database fires nothing', async () => assert.deepEqual(await ids(), []))

  it('an inquiry with no message: only after the grace period, only if it has none, and it clears when they exist', async () => {
    const young = await newInquiry(60_000)
    assert.deepEqual(await ids(), [], 'inside the grace period it may still be being queued')
    sql(`update public.inquiries set created_at = now() - interval '30 minutes' where id = '${young}'`)
    assert.deepEqual(await ids(), ['notifications.uncovered'])
    await outboxRow({ inquiry_id: young, entity_type: null, entity_id: null })
    assert.deepEqual(await ids(), [])
  })
  it('three failed attempts within an hour (not older ones), and an exhausted message, both mean the channel is failing', async () => {
    const message = await outboxRow({ status: 'failed', next_attempt_at: new Date(Date.now() + HOUR).toISOString() })
    const attempt = (n, at) => ({ outbox_id: message, attempt_no: n, at, provider: 'resend', ok: false, retryable: true, error: 'x' })
    await db.from('notification_attempts').insert([attempt(1, ago(90 * 60_000)), attempt(2, ago(3 * HOUR)), attempt(3, ago(60_000))])
    assert.deepEqual(await ids(), [], 'one recent failure and two old ones is not "failing"')
    await db.from('notification_attempts').insert([attempt(4, ago(120_000)), attempt(5, ago(180_000))])
    assert.deepEqual(await ids(), ['notifications.failing'])
    sql('truncate public.notification_attempts, public.notification_outbox cascade')
    await outboxRow({ status: 'exhausted', last_attempt_at: ago(HOUR) })
    assert.deepEqual(await ids(), ['notifications.failing'])
    sql('truncate public.notification_outbox cascade')
    await outboxRow({ status: 'exhausted', last_attempt_at: ago(30 * HOUR) })
    assert.deepEqual(await ids(), [], 'an exhausted message from two days ago has aged out of the 24-hour window')
  })
  it('a message due more than 26 hours ago is stuck (a warning)', async () => {
    await outboxRow({ status: 'pending', next_attempt_at: ago(27 * HOUR) })
    const alerts = (await evaluateAlerts(db)).alerts
    assert.deepEqual(alerts.map((a) => [a.id, a.severity]), [['notifications.stuck', 'warning']])
  })
  it('error groups: a spike (10 in the current hour) is an error, a new group is a warning, client and CSP reports never alarm, resolved ones do not count', async () => {
    const add = (fp, patch = {}) => sql(`insert into public.error_groups (fingerprint, source, event, message, window_count, first_seen_at) values ('${fp}', '${patch.source ?? 'server'}', 'x.failed', 'm', ${patch.window ?? 1}, ${patch.first ?? 'now()'})`)
    add('1'.repeat(32), { window: 10 })
    assert.deepEqual(await ids(), ['errors.spike', 'errors.new'])
    sql('truncate public.error_groups')
    add('2'.repeat(32), { source: 'client', window: 50 })
    add('3'.repeat(32), { source: 'csp', window: 50 })
    assert.deepEqual(await ids(), [], 'anyone can post client/CSP reports; they must not be able to wake the owner')
    sql('truncate public.error_groups')
    add('4'.repeat(32), { window: 50 })
    sql(`update public.error_groups set status = 'resolved'`)
    assert.deepEqual(await ids(), [])
    sql('truncate public.error_groups')
    add('5'.repeat(32), { window: 50 })
    sql(`update public.error_groups set window_started_at = now() - interval '3 hours'`)
    assert.deepEqual(await ids(), ['errors.new'], 'a window that ended hours ago is not a spike')
  })
  it('heartbeats: a stale daily run is an error; a silent monitor a warning; never-recorded is neither', async () => {
    assert.deepEqual(await ids(), [])
    sql(`insert into public.ops_events (level, name, occurred_at) values ('info', 'cron.completed', now() - interval '40 hours'), ('info', 'monitor.checked', now() - interval '5 hours')`)
    assert.deepEqual(await ids(), ['cron.stale', 'monitor.silent'])
    await track('cron.completed', { supabase: db })
    await track('monitor.checked', { supabase: db })
    assert.deepEqual(await ids(), [])
  })
  it('sign-in pressure: two limit crossings in a day', async () => {
    sql(`insert into public.audit_log (actor, action, entity) values ('system', 'admin.sign_in_rate_limited', 'admin_session'), ('system', 'admin.sign_in_rate_limited', 'admin_session')`)
    assert.deepEqual(await ids(), ['auth.sign_in_pressure'])
  })
  it('configuration errors come from the environment and carry names only', async () => {
    const { alerts } = await evaluateAlerts(db, new Date(), { VERCEL_ENV: 'production' })
    const config = alerts.find((a) => a.id === 'config.invalid')
    assert.ok(config.detail.includes('CRON_SECRET'))
    assert.ok(!/[=:]\s*\S{8,}/.test(config.detail))
  })
})

describe('raising an alert', () => {
  const firing = () => [{ id: 'notifications.uncovered', severity: 'error', count: 2 }, { id: 'errors.new', severity: 'warning', count: 1 }]

  it('e-mails an error once a day, never a warning, and records the event', async () => {
    const now = new Date('2026-09-21T10:00:00Z')
    const first = await raiseAlerts(db, firing(), now)
    assert.deepEqual(first, { raised: ['notifications.uncovered'], alreadySent: [] })
    const again = await raiseAlerts(db, firing(), new Date('2026-09-21T23:00:00Z'))
    assert.deepEqual(again, { raised: [], alreadySent: ['notifications.uncovered'] })
    const nextDay = await raiseAlerts(db, firing(), new Date('2026-09-22T00:05:00Z'))
    assert.deepEqual(nextDay.raised, ['notifications.uncovered'], 'still firing tomorrow: tomorrow’s e-mail says so')

    const rows = (await db.from('notification_outbox').select('*').eq('kind', 'system-alert').order('created_at')).data
    assert.equal(rows.length, 2)
    assert.ok(rows[0].dedupe_key.startsWith('ops-alert:notifications.uncovered:'))
    assert.equal(alertDay(now), '2026-09-21')
    assert.equal((await events('alert.raised')).length, 2)
    assert.match(rows[0].subject, /^Artaveo alert — /)
    assert.ok(!rows[0].body_text.includes('@'), 'the alert carries counts and instructions, no addresses')
  })
  it('an alert e-mail that cannot be sent does not raise an alert about itself', async () => {
    const failing = { id: 'failing', send: async () => ({ ok: false, error: 'nope', retryable: false }) }
    await raiseAlerts(db, [{ id: 'cron.stale', severity: 'error', count: 1, detail: '50 h' }], new Date('2026-09-21T10:00:00Z'))
    await processOutboxBatch(db, { provider: failing, alerts: false })
    const kinds = (await db.from('notification_outbox').select('kind, status')).data
    assert.deepEqual(kinds.map((k) => k.kind), ['system-alert'], 'no second message')
  })
})

describe('the owner’s page and the health check', () => {
  it('the overview reports the funnel, the groups and the events from the database', async () => {
    resetRequest({ 'x-request-id': uuid() })
    await submitInquiry(draft(), meta())
    await track('content.published', { data: { via: 'manual' }, supabase: db })
    await captureError(new Error('visible failure'), { event: 'x.failed', source: 'server', supabase: db })
    const overview = await getObservabilityOverview()
    const row = (name) => overview.funnel.find((r) => r.name === name)
    assert.deepEqual([row('inquiry.submitted').last24h, row('content.published').last7d, row('consultation.requested').last30d], [1, 1, 0])
    assert.equal(overview.groups.length, 1)
    assert.equal(overview.openGroupCount, 1)
    assert.ok(overview.events.length >= 2)
    assert.equal(overview.database.ok, true)
  })
  it('a group can be resolved by the owner only, and it is audited; resolving then recurring reopens it', async () => {
    await captureError(new Error('flaky'), { event: 'x.failed', source: 'server', supabase: db })
    const [group] = await groups()

    resetRequest()
    await signIn(EDITOR)
    assert.deepEqual(await setErrorGroupStatus(group.fingerprint, 'resolved'), { ok: false, code: 'forbidden' })
    resetRequest()
    assert.deepEqual(await setErrorGroupStatus(group.fingerprint, 'resolved'), { ok: false, code: 'forbidden' }, 'signed out')

    resetRequest()
    await signIn(OWNER)
    assert.deepEqual(await setErrorGroupStatus('not-a-fingerprint', 'resolved'), { ok: false, code: 'invalid' })
    assert.deepEqual(await setErrorGroupStatus(group.fingerprint, 'deleted'), { ok: false, code: 'invalid' })
    assert.deepEqual(await setErrorGroupStatus('e'.repeat(32), 'resolved'), { ok: false, code: 'not-found' })
    assert.deepEqual(await setErrorGroupStatus(group.fingerprint, 'resolved'), { ok: true })
    assert.equal((await groups())[0].status, 'resolved')
    const audit = (await db.from('audit_log').select('action, entity_id').eq('action', 'observability.error_group_status')).data
    assert.equal(audit.length, 1)

    await captureError(new Error('flaky'), { event: 'x.failed', source: 'server', supabase: db })
    assert.equal((await groups())[0].status, 'open', 'a regression reopens itself')
  })
  it('the inquiry-path health check reads the database, the outbox and the limiter, and reports a broken outbox as not ok', async () => {
    const good = await checkInquiryPathUncached(db)
    assert.deepEqual([good.ok, good.degraded], [true, false])
    assert.deepEqual(Object.keys(good.checks).sort(), ['configured', 'database', 'limiter', 'outbox'])
    assert.equal((await checkInquiryPathUncached(null)).ok, false)

    sql('alter table public.notification_outbox rename to notification_outbox_off')
    try {
      const bad = await checkInquiryPathUncached(db)
      assert.equal(bad.ok, false)
      assert.equal(bad.checks.outbox.ok, false)
      assert.equal(bad.checks.database.ok, true)
    } finally {
      sql('alter table public.notification_outbox_off rename to notification_outbox')
    }
    sql('alter function public.consume_rate_limit(text, int, int) rename to consume_rate_limit_off')
    try {
      const degraded = await checkInquiryPathUncached(db)
      assert.deepEqual([degraded.ok, degraded.degraded], [true, true], 'the limiter fails open, so a submission still works')
    } finally {
      sql('alter function public.consume_rate_limit_off(text, int, int) rename to consume_rate_limit')
    }
  })
  it('a reference lookup accepts only a request id or a digest', async () => {
    assert.deepEqual(await lookupReference("x'; drop table inquiries; --"), { kind: 'invalid' })
    assert.deepEqual(await lookupReference('a'.repeat(200)), { kind: 'invalid' })
    const digest = (await lookupReference('4242')).kind
    assert.equal(digest, 'found')
  })
})
