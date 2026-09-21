/**
 * Phase 24 — the route handlers, called as the platform calls them (a `Request` in, a
 * `Response` out) against the real database: the daily run's heartbeat and alerts, the
 * external check, the health endpoints, and the two open reporting endpoints under
 * hostile input.
 */
import assert from 'node:assert/strict'
import { before, beforeEach, describe, it } from 'node:test'

import { quietSink, service, sql } from '../support/stack-env.mjs'
import { resetRequest } from '../support/next-runtime.mjs'

const { setLogSink } = await import('../../lib/observability/logger.ts')
const { RATE_LIMITS } = await import('../../lib/security/rate-limit-policy.ts')
const cron = await import('../../app/api/cron/notifications/route.ts')
const check = await import('../../app/api/ops/check/route.ts')
const liveness = await import('../../app/api/health/route.ts')
const inquiryHealth = await import('../../app/api/health/inquiry/route.ts')
const csp = await import('../../app/api/observe/csp/route.ts')
const clientError = await import('../../app/api/observe/client-error/route.ts')
const { resetHealthCache } = await import('../../lib/observability/health.ts')

const db = service()
const SECRET = 'a-test-cron-secret-of-sufficient-length'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const bearer = (secret = SECRET) => ({ authorization: `Bearer ${secret}` })
const get = (path, headers = {}) => new Request(`http://localhost${path}`, { headers })
const post = (path, body, headers = {}) => new Request(`http://localhost${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } })
const groups = async () => (await db.from('error_groups').select('*')).data ?? []
const events = async (name) => (await db.from('ops_events').select('*').eq('name', name)).data ?? []

before(() => {
  process.env.CRON_SECRET = SECRET
})
beforeEach(() => {
  sql('truncate public.ops_events, public.error_groups, public.inquiries, public.notification_outbox, public.audit_log, public.rate_limit_buckets restart identity cascade')
  resetRequest()
  resetHealthCache()
  setLogSink(quietSink)
})

describe('the daily run', () => {
  it('refuses without the secret, and says nothing is recorded', async () => {
    assert.equal((await cron.GET(get('/api/cron/notifications'))).status, 401)
    assert.equal((await cron.GET(get('/api/cron/notifications', bearer('wrong')))).status, 401)
    assert.equal((await events('cron.completed')).length, 0)
  })
  it('runs, records its heartbeat with the request id it also returns, purges and checks alerts', async () => {
    sql(`insert into public.ops_events (level, name, occurred_at) values ('info', 'old.event', now() - interval '100 days')`)
    const response = await cron.GET(get('/api/cron/notifications', bearer()))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.deepEqual(body.opsPurge, { eventsDeleted: 1, groupsDeleted: 0 })
    assert.ok(Array.isArray(body.alerts.firing))
    const requestId = response.headers.get('x-request-id')
    assert.match(requestId, UUID)
    const [heartbeat] = await events('cron.completed')
    assert.equal(heartbeat.request_id, requestId)
    assert.deepEqual(heartbeat.data.failedSteps, [])
  })
  it('a failing step is filed as an error and does not stop the heartbeat', async () => {
    sql('alter table public.rate_limit_buckets rename to rate_limit_buckets_off')
    try {
      const body = await (await cron.GET(get('/api/cron/notifications', bearer()))).json()
      assert.match(body.rateLimits.error, /rate limit purge failed/)
    } finally {
      sql('alter table public.rate_limit_buckets_off rename to rate_limit_buckets')
    }
    const [group] = await groups()
    assert.equal(group.event, 'cron.step_failed')
    assert.equal(group.source, 'cron')
    const [heartbeat] = await events('cron.completed')
    assert.deepEqual(heartbeat.data.failedSteps, ['rateLimits'])
  })
})

describe('the external check (/api/ops/check)', () => {
  it('is authenticated like the daily run', async () => {
    assert.equal((await check.GET(get('/api/ops/check'))).status, 401)
    assert.equal((await check.GET(get('/api/ops/check', bearer('nope')))).status, 401)
    delete process.env.CRON_SECRET
    try {
      const res = await check.GET(get('/api/ops/check', bearer()))
      assert.equal(res.status, 401)
      assert.equal((await res.json()).error, 'cron-secret-not-configured')
    } finally {
      process.env.CRON_SECRET = SECRET
    }
  })
  it('answers ok on a calm site, records that a NAMED monitor checked (once a minute), and ignores an anonymous caller', async () => {
    const res = await check.GET(get('/api/ops/check?probe=github', bearer()))
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.equal(body.status, 'ok')
    assert.equal(body.database.ok, true)
    assert.deepEqual(body.alerts, [])
    assert.match(res.headers.get('x-request-id'), UUID)
    assert.equal(res.headers.get('cache-control'), 'no-store')
    await check.GET(get('/api/ops/check?probe=github', bearer()))
    assert.equal((await events('monitor.checked')).length, 1)
    sql('truncate public.ops_events')
    await check.GET(get('/api/ops/check', bearer()))
    await check.GET(get("/api/ops/check?probe=x';drop", bearer()))
    assert.equal((await events('monitor.checked')).length, 0)
  })
  it('says failing when an error alert fires, e-mails it once, and says degraded when only warnings fire', async () => {
    sql(`insert into public.inquiries (idempotency_key, goal, name, email, preferred_locale, preferred_channel, consent, created_at) values (gen_random_uuid(), 'g', 'n', 'a@example.com', 'en', 'email', true, now() - interval '1 hour')`)
    const first = await (await check.GET(get('/api/ops/check?probe=github', bearer()))).json()
    assert.equal(first.status, 'failing')
    assert.deepEqual(first.alerts, [{ id: 'notifications.uncovered', severity: 'error', count: 1 }])
    assert.deepEqual(first.raised, ['notifications.uncovered'])
    const second = await (await check.GET(get('/api/ops/check?probe=github', bearer()))).json()
    assert.deepEqual(second.raised, [], 'the same problem is not e-mailed again today')
    assert.equal((await db.from('notification_outbox').select('id').eq('kind', 'system-alert')).data.length, 1)

    sql('truncate public.inquiries, public.notification_outbox cascade')
    sql(`insert into public.error_groups (fingerprint, source, event, message) values ('${'9'.repeat(32)}', 'server', 'x.failed', 'm')`)
    const warning = await (await check.GET(get('/api/ops/check', bearer()))).json()
    assert.equal(warning.status, 'degraded')
  })
  it('`raise=0` evaluates without e-mailing', async () => {
    sql(`insert into public.inquiries (idempotency_key, goal, name, email, preferred_locale, preferred_channel, consent, created_at) values (gen_random_uuid(), 'g', 'n', 'a@example.com', 'en', 'email', true, now() - interval '1 hour')`)
    const body = await (await check.GET(get('/api/ops/check?raise=0', bearer()))).json()
    assert.equal(body.status, 'failing')
    assert.deepEqual(body.raised, [])
    assert.equal((await db.from('notification_outbox').select('id')).data.length, 0)
  })
  it('never reports all-clear when it cannot look: a broken table is `failing`, not `ok`', async () => {
    sql('alter table public.inquiries rename to inquiries_off')
    try {
      const res = await check.GET(get('/api/ops/check', bearer()))
      assert.equal(res.status, 503)
      assert.equal((await res.json()).status, 'failing')
    } finally {
      sql('alter table public.inquiries_off rename to inquiries')
    }
  })
})

describe('the health endpoints', () => {
  it('liveness answers without touching the database', async () => {
    sql('alter table public.inquiries rename to inquiries_off')
    try {
      const res = await liveness.GET()
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { ok: true })
      assert.equal(liveness.HEAD().status, 200)
    } finally {
      sql('alter table public.inquiries_off rename to inquiries')
    }
  })
  it('the inquiry check is 200 when a brief would be saved, 503 when it would not, and reveals no detail either way', async () => {
    const ok = await inquiryHealth.GET()
    assert.equal(ok.status, 200)
    const body = await ok.json()
    assert.deepEqual(Object.keys(body).sort(), ['checks', 'degraded', 'ok'])
    assert.equal(body.ok, true)
    assert.match(ok.headers.get('x-request-id'), UUID)
    assert.equal((await inquiryHealth.HEAD()).status, 200)

    resetHealthCache()
    sql('alter table public.notification_outbox rename to notification_outbox_off')
    try {
      const down = await inquiryHealth.GET()
      assert.equal(down.status, 503)
      assert.doesNotMatch(JSON.stringify(await down.json()), /relation|does not exist|notification_outbox|message|error/i)
    } finally {
      sql('alter table public.notification_outbox_off rename to notification_outbox')
    }
  })
  it('answers are reused for a moment, so hammering the URL costs one round of checks', async () => {
    await inquiryHealth.GET()
    sql('alter table public.notification_outbox rename to notification_outbox_off')
    try {
      assert.equal((await inquiryHealth.GET()).status, 200, 'served from the 15-second cache')
    } finally {
      sql('alter table public.notification_outbox_off rename to notification_outbox')
    }
  })
})

describe('POST /api/observe/csp', () => {
  const report = { 'csp-report': { 'document-uri': 'https://artaveo.test/en/work?x=1', 'effective-directive': 'img-src', 'blocked-uri': 'https://cdn.example.com/a.png?k=secret', disposition: 'enforce' } }

  it('files a violation as a CSP group under the page path, never alarming, and answers 204', async () => {
    const res = await csp.POST(post('/api/observe/csp', report, { 'content-type': 'application/csp-report' }))
    assert.equal(res.status, 204)
    const [group] = await groups()
    assert.equal(group.event, 'csp.violation')
    assert.equal(group.source, 'csp')
    assert.equal(group.message, 'img-src blocked https://cdn.example.com on /en/work')
    assert.equal(group.route, '/en/work')
    assert.ok(!JSON.stringify(group).includes('secret'))
  })
  it('answers 204 to everything hostile and stores nothing: oversized, not JSON, wrong shape, extension noise, GET', async () => {
    const before = (await groups()).length
    for (const body of ['x'.repeat(20_000), '{"csp-report":', 'null', '[]', '"x"', JSON.stringify({ 'csp-report': { 'blocked-uri': 'chrome-extension://abc', 'effective-directive': 'script-src', 'document-uri': 'https://a.test/' } })]) {
      const res = await csp.POST(post('/api/observe/csp', body))
      assert.equal(res.status, 204)
    }
    assert.equal((await groups()).length, before)
    const res = await csp.GET()
    assert.deepEqual([res.status, res.headers.get('allow')], [405, 'POST'])
  })
  it('a body that lies about its size is still capped on the bytes actually read', async () => {
    const request = new Request('http://localhost/api/observe/csp', { method: 'POST', body: JSON.stringify({ pad: 'x'.repeat(50_000) }), headers: { 'content-length': '10' } })
    assert.equal((await csp.POST(request)).status, 204)
    assert.equal((await groups()).length, 0)
  })
  it('is rate-limited: past the per-address limit nothing more is stored, and the answer does not change', async () => {
    const limit = RATE_LIMITS['observe.csp'].ip.limit
    resetRequest({ 'x-forwarded-for': '198.51.100.77' })
    for (let i = 0; i < limit + 5; i += 1) {
      // Distinct WORDS, not numbers: the grouping deliberately treats digits as noise.
      const varied = { 'csp-report': { ...report['csp-report'], 'blocked-uri': `https://host${String.fromCharCode(97 + i)}${String.fromCharCode(97 + ((i * 7) % 26))}.example.com/x` } }
      assert.equal((await csp.POST(post('/api/observe/csp', varied))).status, 204)
    }
    const recorded = (await groups()).reduce((sum, g) => sum + Number(g.event_count), 0)
    assert.equal(recorded, limit, 'exactly the allowed number were recorded')
  })
})

describe('POST /api/observe/client-error', () => {
  it('files a browser error with a scrubbed path and message, source client, and answers 204', async () => {
    const token = 'Zk3nQ8xLp2VbYw9RtUeA7hGdZk3nQ8xLp2VbYw9R'
    const res = await clientError.POST(post('/api/observe/client-error', { message: 'Cannot read x of undefined for ada@example.com', name: 'TypeError', path: `/en/recommend/${token}`, kind: 'window', digest: '777' }))
    assert.equal(res.status, 204)
    const [group] = await groups()
    assert.equal(group.event, 'client.error')
    assert.equal(group.source, 'client')
    assert.equal(group.route, '/en/recommend/[token]')
    assert.equal(group.digest, '777')
    const stored = JSON.stringify(group)
    assert.ok(!stored.includes(token) && !stored.includes('ada@example.com'))
  })
  it('answers 204 to junk and stores nothing; rejects GET; is limited per address', async () => {
    for (const body of ['', 'not json', '{}', '{"message":""}', '[1]', 'x'.repeat(20_000)]) assert.equal((await clientError.POST(post('/api/observe/client-error', body))).status, 204)
    assert.equal((await groups()).length, 0)
    assert.equal((await clientError.GET()).status, 405)
    const limit = RATE_LIMITS['observe.client-error'].ip.limit
    resetRequest({ 'x-forwarded-for': '198.51.100.88' })
    for (let i = 0; i < limit + 3; i += 1) await clientError.POST(post('/api/observe/client-error', { message: `distinct failure number ${i} of a kind`, name: 'Error', path: '/en' }))
    assert.equal((await groups()).length <= limit, true)
  })
  it('can never raise an alert, however many distinct or repeated reports arrive', async () => {
    resetRequest({ 'x-forwarded-for': '198.51.100.99' })
    for (let i = 0; i < 12; i += 1) await clientError.POST(post('/api/observe/client-error', { message: 'same error again and again', name: 'Error', path: '/en' }))
    const body = await (await check.GET(get('/api/ops/check?raise=0', bearer()))).json()
    assert.deepEqual(body.alerts, [])
  })
})
