#!/usr/bin/env node
/**
 * Phase 19 — tests for the notification pipeline. Zero dependencies (Node's
 * built-in test runner with native TypeScript stripping):
 *
 *   npm run test:notifications
 *
 * What is covered: the retry policy, the provider's failure classification and
 * request shape, provider selection from the environment, every template, the
 * enqueue functions (dedupe keys, reply-to hygiene), and the outbox worker
 * against an in-memory stand-in for Supabase — success, transient and permanent
 * failure, retry ceiling, the alert on exhaustion (and that an alert can never
 * raise an alert), lease loss, two workers racing for the same rows, the
 * deadline, and the owner's manual retry.
 *
 * The in-memory client mirrors the behaviour of `claim_notification_outbox()`
 * (0017). The SQL function itself was exercised against a real PostgreSQL 16
 * instance — see docs/phases/PHASE-19-README.md — because a fake cannot prove
 * `FOR UPDATE SKIP LOCKED`. A general test setup (Vitest + CI) is Phase 21's job.
 */
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  BACKOFF_SCHEDULE_MS,
  backoffMsForAttempt,
  DEFAULT_MAX_ATTEMPTS,
  failureOutcome,
  MANUAL_RETRY_EXTRA_ATTEMPTS,
  maxAttemptsAfterManualRetry,
  nextAttemptAt,
} from '../lib/notifications/backoff.ts'
import {
  classifyHttpFailure,
  ConsoleEmailProvider,
  resolveEmailProvider,
  ResendEmailProvider,
} from '../lib/notifications/provider.ts'
import {
  buildClientConfirmationEmail,
  buildContentPublishedEmail,
  buildEvidenceSubmittedEmail,
  buildOwnerAlertEmail,
  buildRecommendationChangesEmail,
  buildRecommendationRequestEmail,
  buildSystemAlertEmail,
  singleLine,
} from '../lib/notifications/templates.ts'
import {
  enqueueContentPublished,
  enqueueEvidenceSubmitted,
  enqueueNotifications,
  enqueueRecommendationChanges,
  enqueueRecommendationRequest,
  enqueueSystemAlert,
  usableReplyTo,
} from '../lib/notifications/events.ts'
import { processOutboxBatch, REDACTED_MARKER, requeueNotification } from '../lib/notifications/outbox.ts'
import {
  redactRequestNotifications,
  shouldClearRecipient,
  sweepRecommendationRecipients,
} from '../lib/recommendation-privacy.ts'
import { NOTIFICATION_AUDIENCE, NOTIFICATION_KINDS } from '../types/notifications.ts'

// ── in-memory Supabase ────────────────────────────────────────────────────

let idCounter = 0
const newId = () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}`

function makeDb({ now = () => new Date() } = {}) {
  const tables = { notification_outbox: [], notification_attempts: [], recommendation_requests: [] }
  const calls = { upserts: [], rpc: [] }

  function outboxRow(overrides = {}) {
    return {
      id: newId(),
      created_at: now().toISOString(),
      inquiry_id: null,
      entity_type: 'inquiry',
      entity_id: 'x',
      dedupe_key: null,
      kind: 'owner-alert',
      recipient_email: 'owner@example.com',
      reply_to: null,
      locale: 'en',
      subject: 'Subject',
      body_text: 'Body',
      status: 'pending',
      attempts: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      last_error: null,
      last_provider: null,
      last_attempt_at: null,
      next_attempt_at: new Date(now().getTime() - 1000).toISOString(),
      locked_until: null,
      sent_at: null,
      ...overrides,
    }
  }

  function builder(table) {
    const state = { op: 'select', patch: null, filters: [], single: false, rows: null, opts: null }
    const api = {
      select() {
        return api
      },
      upsert(rows, opts) {
        state.op = 'upsert'
        state.rows = rows
        state.opts = opts
        return api
      },
      insert(rows) {
        state.op = 'insert'
        state.rows = Array.isArray(rows) ? rows : [rows]
        return api
      },
      update(patch) {
        state.op = 'update'
        state.patch = patch
        return api
      },
      delete() {
        state.op = 'delete'
        return api
      },
      limit() {
        return api
      },
      neq(col, val) {
        state.filters.push((r) => r[col] !== val)
        return api
      },
      not(col, op, val) {
        assert.equal(op, 'is')
        assert.equal(val, null)
        state.filters.push((r) => r[col] !== null && r[col] !== undefined)
        return api
      },
      eq(col, val) {
        state.filters.push((r) => r[col] === val)
        return api
      },
      in(col, vals) {
        state.filters.push((r) => vals.includes(r[col]))
        return api
      },
      maybeSingle() {
        state.single = true
        return api
      },
      then(resolve, reject) {
        return Promise.resolve(run()).then(resolve, reject)
      },
    }

    function run() {
      const rows = tables[table]
      if (state.op === 'upsert') {
        calls.upserts.push({ table, rows: state.rows, opts: state.opts })
        const created = []
        for (const input of state.rows) {
          const key = state.opts?.onConflict
          if (key && input[key] != null && rows.some((r) => r[key] === input[key])) continue
          const row = outboxRow({ ...input, status: 'pending' })
          rows.push(row)
          created.push({ id: row.id, kind: row.kind })
        }
        return { data: created, error: null }
      }
      if (state.op === 'insert') {
        for (const input of state.rows) {
          if (
            table === 'notification_attempts' &&
            rows.some((r) => r.outbox_id === input.outbox_id && r.attempt_no === input.attempt_no)
          ) {
            return { data: null, error: { code: '23505', message: 'duplicate attempt' } }
          }
          rows.push({ id: newId(), ...input })
        }
        return { data: null, error: null }
      }
      const matched = rows.filter((r) => state.filters.every((f) => f(r)))
      if (state.op === 'update') {
        for (const r of matched) Object.assign(r, state.patch)
        return { data: matched.map((r) => ({ id: r.id })), error: null }
      }
      if (state.op === 'delete') {
        for (const r of matched) rows.splice(rows.indexOf(r), 1)
        return { data: matched.map((r) => ({ id: r.id })), error: null }
      }
      const data = matched.map((r) => ({ ...r }))
      return state.single ? { data: data[0] ?? null, error: null } : { data, error: null }
    }
    return api
  }

  const client = {
    from: (table) => builder(table),
    // Mirrors public.claim_notification_outbox (0017): atomic because JS is
    // single-threaded between awaits — the same guarantee the SQL gets from
    // FOR UPDATE SKIP LOCKED.
    async rpc(name, args) {
      assert.equal(name, 'claim_notification_outbox')
      calls.rpc.push(args)
      const t = now().getTime()
      const due = tables.notification_outbox
        .filter(
          (r) =>
            ((r.status === 'pending' || r.status === 'failed') && new Date(r.next_attempt_at).getTime() <= t) ||
            (r.status === 'sending' && r.locked_until && new Date(r.locked_until).getTime() <= t),
        )
        .filter((r) => !args.p_ids || args.p_ids.includes(r.id))
        .sort((a, b) => new Date(a.next_attempt_at) - new Date(b.next_attempt_at))
        .slice(0, Math.max(args.p_limit, 1))
      for (const r of due) {
        r.status = 'sending'
        r.locked_until = new Date(t + Math.max(args.p_lease_seconds, 10) * 1000).toISOString()
      }
      return { data: due.map((r) => ({ ...r })), error: null }
    },
  }

  return { client, tables, calls, outboxRow }
}

const okProvider = (log = []) => ({
  id: 'resend',
  async send(message, options) {
    log.push({ message, options })
    return { ok: true, providerMessageId: `msg-${log.length}` }
  },
})

const failingProvider = (result, log = []) => ({
  id: 'resend',
  async send(message) {
    log.push(message)
    return result
  },
})

const noAudit = () => {
  const entries = []
  return { entries, audit: async (e) => void entries.push(e) }
}

const draft = (overrides = {}) => ({
  goal: 'A booking system',
  featureTags: [],
  featureOtherNote: '',
  links: [],
  attachmentMediaIds: [],
  name: 'Sara Ahmadi',
  email: 'Sara@Example.com',
  phone: '',
  preferredLocale: 'fa',
  preferredChannel: 'email',
  consent: true,
  ...overrides,
})

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

// ── retry policy ──────────────────────────────────────────────────────────

test('backoff: 1 min, 5 min, 30 min, 2 h, then clamped at 2 h', () => {
  assert.deepEqual([...BACKOFF_SCHEDULE_MS], [60_000, 300_000, 1_800_000, 7_200_000])
  assert.equal(backoffMsForAttempt(1), 60_000)
  assert.equal(backoffMsForAttempt(3), 1_800_000)
  assert.equal(backoffMsForAttempt(4), 7_200_000)
  assert.equal(backoffMsForAttempt(9), 7_200_000)
  assert.equal(backoffMsForAttempt(0), 60_000, 'a nonsense attempt number never goes negative')
  const now = new Date('2026-09-19T10:00:00.000Z')
  assert.equal(nextAttemptAt(2, now), '2026-09-19T10:05:00.000Z')
})

test('failure outcome: permanent failures and the ceiling exhaust; anything else retries', () => {
  assert.equal(failureOutcome({ attempt: 1, maxAttempts: 5, retryable: false }), 'exhausted')
  assert.equal(failureOutcome({ attempt: 4, maxAttempts: 5, retryable: true }), 'retry')
  assert.equal(failureOutcome({ attempt: 5, maxAttempts: 5, retryable: true }), 'exhausted')
})

test('manual retry raises the ceiling and never lowers it', () => {
  assert.equal(MANUAL_RETRY_EXTRA_ATTEMPTS, 3)
  assert.equal(maxAttemptsAfterManualRetry(5, 5), 8)
  assert.equal(maxAttemptsAfterManualRetry(1, 10), 10)
})

// ── provider ──────────────────────────────────────────────────────────────

test('http classification: transient vs permanent', () => {
  for (const status of [408, 425, 429, 500, 502, 503]) assert.equal(classifyHttpFailure(status, ''), true, String(status))
  for (const status of [400, 401, 403, 404, 422]) assert.equal(classifyHttpFailure(status, ''), false, String(status))
  assert.equal(classifyHttpFailure(409, '{"name":"concurrent_idempotent_requests"}'), true)
  assert.equal(classifyHttpFailure(409, '{"name":"invalid_idempotent_request"}'), false)
})

test('provider selection: console by default, resend only when fully configured, misconfiguration is reported', () => {
  const none = resolveEmailProvider({})
  assert.equal(none.provider.id, 'console')
  assert.deepEqual(none.info, { id: 'console', deliversRealEmail: false, requested: 'console', misconfigured: false })

  const half = resolveEmailProvider({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k' })
  assert.equal(half.provider.id, 'console')
  assert.equal(half.info.misconfigured, true)
  assert.equal(half.info.deliversRealEmail, false)

  const full = resolveEmailProvider({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k', EMAIL_FROM_ADDRESS: 'a@b.dev' })
  assert.equal(full.provider.id, 'resend')
  assert.equal(full.info.deliversRealEmail, true)

  assert.equal(resolveEmailProvider({ EMAIL_PROVIDER: 'sendgrid' }).info.misconfigured, true)
  assert.equal(resolveEmailProvider({ RESEND_API_KEY: 'k' }).provider.id, 'console', 'a key alone never activates sending')
})

test('console provider reports ok but is never a real delivery', async () => {
  const provider = new ConsoleEmailProvider()
  const original = console.log
  console.log = () => {}
  try {
    assert.deepEqual(await provider.send({ to: 'a@b.c', subject: 's', text: 't' }), { ok: true })
  } finally {
    console.log = original
  }
})

test('resend: request carries reply_to and a stable Idempotency-Key; success returns the provider id', async () => {
  let seen
  globalThis.fetch = async (url, init) => {
    seen = { url, init }
    return new Response(JSON.stringify({ id: 'abc-123' }), { status: 200 })
  }
  const provider = new ResendEmailProvider('re_key', 'Artaveo <hello@artaveo.dev>')
  const result = await provider.send(
    { to: 'x@y.z', subject: 'Hi', text: 'Body', replyTo: 'owner@artaveo.dev', idempotencyKey: 'outbox-1' },
    { timeoutMs: 1000 },
  )
  assert.deepEqual(result, { ok: true, providerMessageId: 'abc-123' })
  assert.equal(seen.url, 'https://api.resend.com/emails')
  assert.equal(seen.init.headers.Authorization, 'Bearer re_key')
  assert.equal(seen.init.headers['Idempotency-Key'], 'outbox-1')
  const body = JSON.parse(seen.init.body)
  assert.equal(body.from, 'Artaveo <hello@artaveo.dev>')
  assert.equal(body.reply_to, 'owner@artaveo.dev')
  assert.equal(body.text, 'Body')
})

test('resend: no reply_to and no idempotency header when none is given', async () => {
  let seen
  globalThis.fetch = async (_url, init) => {
    seen = init
    return new Response('{}', { status: 200 })
  }
  await new ResendEmailProvider('k', 'f@d.dev').send({ to: 'x@y.z', subject: 's', text: 't' })
  assert.equal('Idempotency-Key' in seen.headers, false)
  assert.equal('reply_to' in JSON.parse(seen.body), false)
})

test('resend: 429 and 5xx are retryable, 422 is permanent, a network failure is retryable', async () => {
  const provider = new ResendEmailProvider('k', 'f@d.dev')
  const message = { to: 'x@y.z', subject: 's', text: 't' }

  globalThis.fetch = async () => new Response('slow down', { status: 429 })
  assert.deepEqual(await provider.send(message), { ok: false, error: 'resend responded 429: slow down', retryable: true })

  globalThis.fetch = async () => new Response('boom', { status: 503 })
  assert.equal((await provider.send(message)).retryable, true)

  globalThis.fetch = async () => new Response('domain is not verified', { status: 403 })
  const permanent = await provider.send(message)
  assert.equal(permanent.ok, false)
  assert.equal(permanent.retryable, false)
  assert.match(permanent.error, /403/)

  globalThis.fetch = async () => {
    throw new Error('fetch failed')
  }
  assert.deepEqual(await provider.send(message), { ok: false, error: 'fetch failed', retryable: true })
})

// ── templates ─────────────────────────────────────────────────────────────

test('singleLine collapses whitespace and newlines and caps length', () => {
  assert.equal(singleLine('  Sara\r\nAhmadi \n\n x '), 'Sara Ahmadi x')
  assert.equal(singleLine('a'.repeat(200), 10).length, 10)
  assert.ok(singleLine('a'.repeat(200), 10).endsWith('…'))
})

test('owner alert: a newline in the name cannot reach the subject; links to the lead; says replies go to the client', () => {
  const mail = buildOwnerAlertEmail(draft({ name: 'Sara\nBcc: x@evil.test' }), 'inq-1', [], [], 'https://site.test/en/admin/leads/inq-1')
  assert.equal(mail.subject.includes('\n'), false)
  assert.match(mail.subject, /^New inquiry — Sara Bcc: x@evil\.test$/)
  assert.match(mail.text, /Inquiry ID: inq-1/)
  assert.match(mail.text, /https:\/\/site\.test\/en\/admin\/leads\/inq-1/)
  assert.match(mail.text, /replies straight to the client/)
})

test('client confirmation: English and Persian, D-08 wording, reply invitation', () => {
  const en = buildClientConfirmationEmail(draft({ preferredLocale: 'en' }), 'en', [], [])
  assert.match(en.subject, /received/)
  assert.match(en.text, /a reply within a few hours, same day/)
  assert.match(en.text, /just reply to this email/)

  const fa = buildClientConfirmationEmail(draft(), 'fa', [], [])
  assert.match(fa.subject, /آرتاویو/)
  assert.match(fa.text, /پاسخ‌گویی در همان روز، طی چند ساعت/)
  assert.match(fa.text, /به همین ایمیل پاسخ دهید/)
})

test('evidence-submitted: first submission vs resubmission; no statement text, only who and where to review', () => {
  const first = buildEvidenceSubmittedEmail({
    personName: 'Reza',
    relationship: 'Client on the portal project',
    company: 'Acme',
    submittedLocale: 'fa',
    resubmission: false,
    reviewUrl: 'https://site.test/en/admin/content/recommendations',
  })
  assert.match(first.subject, /New recommendation to review — Reza/)
  assert.match(first.text, /nothing is public until you approve it/)
  assert.match(first.text, /Company: Acme/)
  assert.match(first.text, /Written in: Persian/)
  assert.match(first.text, /admin\/content\/recommendations/)

  const again = buildEvidenceSubmittedEmail({
    personName: 'Reza',
    relationship: 'Client',
    company: null,
    submittedLocale: 'en',
    resubmission: true,
    reviewUrl: 'https://site.test/x',
  })
  assert.match(again.subject, /Recommendation updated — Reza/)
  assert.equal(again.text.includes('Company:'), false)
  assert.match(again.text, /Written in: English/)
})

test('content-published: scheduled and manual read differently, and both carry title and live URL', () => {
  const scheduled = buildContentPublishedEmail({
    entity: 'article',
    title: 'How seat holds stay consistent',
    url: 'https://site.test/en/insights/seat-holds',
    how: { via: 'scheduled', scheduledFor: '2026-09-25T00:00:00.000Z' },
  })
  assert.match(scheduled.subject, /Published — How seat holds stay consistent/)
  assert.match(scheduled.text, /A scheduled article went live\./)
  assert.match(scheduled.text, /Scheduled for: 2026-09-25/)
  assert.match(scheduled.text, /daily run/)
  assert.match(scheduled.text, /https:\/\/site\.test\/en\/insights\/seat-holds/)

  const manual = buildContentPublishedEmail({
    entity: 'project',
    title: 'Transportation System',
    url: 'https://site.test/en/work/transportation-system',
    how: { via: 'manual', by: 'editor@artaveo.dev' },
  })
  assert.match(manual.text, /A case study was published\./)
  assert.match(manual.text, /Published in the admin by: editor@artaveo\.dev/)
  assert.equal(manual.text.includes('daily run'), false)
  assert.equal(buildContentPublishedEmail({ entity: 'service', title: 'x', url: 'u', how: { via: 'manual', by: 'a' } }).text.startsWith('A service page was published.'), true)
})

test('recommendation request e-mail: en and fa, personal link, optional expiry, honest consent wording', () => {
  const en = buildRecommendationRequestEmail({ locale: 'en', url: 'https://site.test/en/recommend/tok', expiresAt: '2026-10-19T12:00:00.000Z' })
  assert.match(en.subject, /short recommendation/)
  assert.match(en.text, /https:\/\/site\.test\/en\/recommend\/tok/)
  assert.match(en.text, /valid until 2026-10-19/)
  assert.match(en.text, /explicit consent/)
  assert.match(en.text, /I review the text myself/)
  assert.equal(en.text.includes('undefined'), false)

  const noExpiry = buildRecommendationRequestEmail({ locale: 'en', url: 'u', expiresAt: null })
  assert.equal(noExpiry.text.includes('valid until'), false)

  const fa = buildRecommendationRequestEmail({ locale: 'fa', url: 'https://site.test/fa/recommend/tok', expiresAt: '2026-10-19T12:00:00.000Z' })
  assert.match(fa.subject, /آرتاویو/)
  assert.match(fa.text, /رضایت صریح/)
  assert.match(fa.text, /تا 2026-10-19 معتبر است/)
  assert.match(fa.text, /https:\/\/site\.test\/fa\/recommend\/tok/)
})

test('recommendation change e-mail: the owner\'s note goes in verbatim, in the chosen language', () => {
  const note = 'Please mention which project we worked on.\nAnd shorten the second paragraph.'
  const en = buildRecommendationChangesEmail({ locale: 'en', url: 'https://site.test/en/recommend/tok', note: `  ${note}  ` })
  assert.ok(en.text.includes(note))
  assert.match(en.text, /same link/)
  assert.match(en.subject, /small change/)
  const fa = buildRecommendationChangesEmail({ locale: 'fa', url: 'https://site.test/fa/recommend/tok', note: 'لطفاً نام پروژه را بنویسید.' })
  assert.ok(fa.text.includes('لطفاً نام پروژه را بنویسید.'))
  assert.match(fa.text, /همان پیوند/)
})

test('system alert: says permanent vs limit, names the kind, links the message, carries no recipient address', () => {
  const permanent = buildSystemAlertEmail({
    failedKind: 'client-confirmation',
    attempts: 1,
    permanent: true,
    lastError: 'resend responded 403: domain is not verified',
    adminUrl: 'https://site.test/en/admin/notifications/n1',
  })
  assert.match(permanent.subject, /client confirmation/)
  assert.match(permanent.text, /retrying cannot fix/)
  assert.match(permanent.text, /notifications\/n1/)
  assert.match(permanent.text, /Nothing was lost/)
  assert.equal(permanent.text.includes('@'), false, 'no e-mail address in an alert')

  const limit = buildSystemAlertEmail({
    failedKind: 'owner-alert',
    attempts: 5,
    permanent: false,
    lastError: 'timeout',
    adminUrl: 'https://site.test/n',
  })
  assert.match(limit.text, /retry limit was reached/)
})

test('every kind has an audience: the visitor and the consultation client, two for a recommender, the rest for the owner', () => {
  assert.deepEqual(
    NOTIFICATION_KINDS.filter((kind) => NOTIFICATION_AUDIENCE[kind] === 'client'),
    ['client-confirmation', 'consultation-received', 'consultation-confirmed', 'consultation-cancelled'],
  )
  assert.deepEqual(
    NOTIFICATION_KINDS.filter((kind) => NOTIFICATION_AUDIENCE[kind] === 'recommender'),
    ['recommendation-request', 'recommendation-changes'],
  )
  assert.equal(Object.keys(NOTIFICATION_AUDIENCE).length, NOTIFICATION_KINDS.length)
})

// ── events / enqueue ──────────────────────────────────────────────────────

test('usableReplyTo keeps a real address and drops anything a provider would reject', () => {
  assert.equal(usableReplyTo(' a@b.co '), 'a@b.co')
  for (const bad of ['', null, undefined, 'no-at-sign', 'a@b', 'a b@c.de', 'Name <a@b.co>']) {
    assert.equal(usableReplyTo(bad), null, String(bad))
  }
})

test('enqueue: dedupe key + ON CONFLICT DO NOTHING; the same event twice creates one row', async () => {
  const db = makeDb()
  const spec = {
    kind: 'owner-alert',
    recipientEmail: 'Owner@Example.com',
    locale: 'en',
    subject: 's',
    bodyText: 'b',
    replyTo: 'client@example.com',
    dedupeKey: 'inquiry:1:owner-alert',
    entityType: 'inquiry',
    entityId: '1',
    inquiryId: '1',
  }
  const first = await enqueueNotifications(db.client, [spec])
  const second = await enqueueNotifications(db.client, [spec])
  assert.equal(first.length, 1)
  assert.equal(second.length, 0, 'a duplicate event yields nothing new to send')
  assert.equal(db.tables.notification_outbox.length, 1)
  const row = db.tables.notification_outbox[0]
  assert.equal(row.recipient_email, 'owner@example.com')
  assert.equal(row.reply_to, 'client@example.com')
  assert.deepEqual(db.calls.upserts[0].opts, { onConflict: 'dedupe_key', ignoreDuplicates: true })
  assert.equal(await enqueueNotifications(db.client, []).then((r) => r.length), 0)
})

test('enqueue: a bad reply-to is dropped rather than sent', async () => {
  const db = makeDb()
  await enqueueNotifications(db.client, [
    { kind: 'owner-alert', recipientEmail: 'o@e.co', locale: 'en', subject: 's', bodyText: 'b', replyTo: 'nope', dedupeKey: 'k', entityType: 'x', entityId: '1' },
  ])
  assert.equal(db.tables.notification_outbox[0].reply_to, null)
})

test('event keys: a resubmission is its own notification; each publish is its own notice; an alert is per exhaustion', async () => {
  const db = makeDb()
  const base = { recommendationId: 'r1', personName: 'A', relationship: 'r', company: null, submittedLocale: 'en', resubmission: false }
  await enqueueEvidenceSubmitted(db.client, { ...base, submittedAt: '2026-09-19T10:00:00.000Z' })
  await enqueueEvidenceSubmitted(db.client, { ...base, submittedAt: '2026-09-19T10:00:00.000Z' })
  await enqueueEvidenceSubmitted(db.client, { ...base, resubmission: true, submittedAt: '2026-09-20T10:00:00.000Z' })

  const pub = { entity: 'article', id: 'a1', slug: 's', titleEn: 'T' }
  await enqueueContentPublished(db.client, { ...pub, how: { via: 'scheduled', scheduledFor: '2026-09-25T00:00:00.000Z' } })
  await enqueueContentPublished(db.client, { ...pub, how: { via: 'scheduled', scheduledFor: '2026-09-25T00:00:00.000Z' } })
  await enqueueContentPublished(db.client, { ...pub, how: { via: 'scheduled', scheduledFor: '2026-10-25T00:00:00.000Z' } })
  await enqueueContentPublished(db.client, { ...pub, how: { via: 'manual', by: 'a@b.co', at: '2026-09-26T09:00:00.000Z' } })
  await enqueueContentPublished(db.client, { ...pub, how: { via: 'manual', by: 'a@b.co', at: '2026-09-26T09:00:00.000Z' } })

  const alert = { failedOutboxId: 'n1', failedKind: 'owner-alert', permanent: false, lastError: 'e' }
  await enqueueSystemAlert(db.client, { ...alert, attempts: 5 })
  await enqueueSystemAlert(db.client, { ...alert, attempts: 5 })
  await enqueueSystemAlert(db.client, { ...alert, attempts: 8 })

  const counts = {}
  for (const row of db.tables.notification_outbox) counts[row.kind] = (counts[row.kind] ?? 0) + 1
  assert.deepEqual(counts, { 'evidence-submitted': 2, 'content-published': 3, 'system-alert': 2 })
  assert.ok(db.tables.notification_outbox.every((row) => row.recipient_email === 'artaveo.dev@gmail.com'))
  const manual = db.tables.notification_outbox.find((r) => r.dedupe_key.includes(':manual:'))
  assert.match(manual.body_text, /Published in the admin by: a@b\.co/)
  assert.match(manual.body_text, /\/en\/insights\/s$/m)
})

test('recommender events: link to the recommender\'s own locale, reply-to the owner, one link e-mail per request, one message per change ask', async () => {
  const db = makeDb()
  const request = { requestId: 'req1', token: 'tok123', recipientEmail: 'Reza@Example.com', locale: 'fa', expiresAt: null }
  const a = await enqueueRecommendationRequest(db.client, request)
  const b = await enqueueRecommendationRequest(db.client, request)
  assert.equal(a.length, 1)
  assert.equal(b.length, 0, 'the same request never queues its link e-mail twice')
  const link = db.tables.notification_outbox[0]
  assert.equal(link.kind, 'recommendation-request')
  assert.equal(link.recipient_email, 'reza@example.com')
  assert.equal(link.locale, 'fa')
  assert.equal(link.reply_to, 'artaveo.dev@gmail.com')
  assert.equal(link.entity_type, 'recommendation_request')
  assert.equal(link.entity_id, 'req1')
  assert.match(link.body_text, /\/fa\/recommend\/tok123/)

  const ask = { requestId: 'req1', token: 'tok123', recipientEmail: 'reza@example.com', locale: 'en', note: 'Please add the project name.' }
  await enqueueRecommendationChanges(db.client, { ...ask, moderatedAt: '2026-09-20T10:00:00.000Z' })
  await enqueueRecommendationChanges(db.client, { ...ask, moderatedAt: '2026-09-20T10:00:00.000Z' })
  await enqueueRecommendationChanges(db.client, { ...ask, moderatedAt: '2026-09-22T10:00:00.000Z' })
  const changes = db.tables.notification_outbox.filter((r) => r.kind === 'recommendation-changes')
  assert.equal(changes.length, 2)
  assert.match(changes[0].body_text, /Please add the project name\./)
  assert.match(changes[0].body_text, /\/en\/recommend\/tok123/)
})

// ── recommender address privacy (D-14) ────────────────────────────────────

const NOW = new Date('2026-09-19T12:00:00.000Z')
const reqRow = (o = {}) => ({
  id: 'r',
  recipient_email: 'a@b.co',
  recipient_locale: 'en',
  revoked_at: null,
  expires_at: null,
  used_at: null,
  recommendation_id: null,
  recommendations: null,
  ...o,
})

test('privacy: an address is cleared exactly when the request is finished', () => {
  const cases = [
    ['open, no expiry', reqRow(), false],
    ['open, expires later', reqRow({ expires_at: '2026-10-01T00:00:00.000Z' }), false],
    ['expired unused', reqRow({ expires_at: '2026-09-01T00:00:00.000Z' }), true],
    ['revoked', reqRow({ revoked_at: '2026-09-10T00:00:00.000Z' }), true],
    ['used, waiting for moderation', reqRow({ used_at: '2026-09-10T00:00:00.000Z', recommendation_id: 'x', recommendations: { status: 'pending' } }), false],
    ['used, changes requested (address still needed)', reqRow({ used_at: '2026-09-10T00:00:00.000Z', recommendation_id: 'x', recommendations: { status: 'changes-requested' } }), false],
    ['used but past expiry, still moderating', reqRow({ expires_at: '2026-09-01T00:00:00.000Z', used_at: '2026-08-30T00:00:00.000Z', recommendation_id: 'x', recommendations: { status: 'pending' } }), false],
    ['approved', reqRow({ used_at: 'u', recommendation_id: 'x', recommendations: { status: 'approved' } }), true],
    ['rejected (join returned as an array)', reqRow({ used_at: 'u', recommendation_id: 'x', recommendations: [{ status: 'rejected' }] }), true],
    ['its recommendation was deleted', reqRow({ used_at: 'u', recommendation_id: null }), true],
    ['nothing stored', reqRow({ recipient_email: null, revoked_at: 'x' }), false],
  ]
  for (const [label, row, expected] of cases) assert.equal(shouldClearRecipient(row, NOW), expected, label)
})

const outboxFor = (db, requestId, overrides) =>
  db.outboxRow({
    kind: 'recommendation-request',
    entity_type: 'recommendation_request',
    entity_id: requestId,
    recipient_email: 'reza@example.com',
    reply_to: 'artaveo.dev@gmail.com',
    subject: 'Could you write a short recommendation? — Artaveo',
    body_text: 'link with token',
    ...overrides,
  })

test('privacy: finishing a request deletes what has not gone out and redacts what has', async () => {
  const db = makeDb()
  const sent = outboxFor(db, 'r1', { status: 'sent' })
  const exhausted = outboxFor(db, 'r1', { status: 'exhausted', kind: 'recommendation-changes' })
  const pending = outboxFor(db, 'r1', { status: 'pending' })
  const failed = outboxFor(db, 'r1', { status: 'failed' })
  const sending = outboxFor(db, 'r1', { status: 'sending' })
  const other = outboxFor(db, 'r2', { status: 'sent' })
  const ownerMail = db.outboxRow({ status: 'sent', entity_type: 'inquiry', entity_id: 'r1', recipient_email: 'artaveo.dev@gmail.com' })
  db.tables.notification_outbox.push(sent, exhausted, pending, failed, sending, other, ownerMail)

  const touched = await redactRequestNotifications(db.client, 'r1')
  assert.equal(touched, 4)
  const byId = (id) => db.tables.notification_outbox.find((r) => r.id === id)
  for (const row of [sent, exhausted]) {
    assert.equal(byId(row.id).recipient_email, REDACTED_MARKER)
    assert.equal(byId(row.id).body_text, REDACTED_MARKER)
    assert.equal(byId(row.id).reply_to, null)
    assert.equal(byId(row.id).status, row.status, 'history is kept, only the personal data goes')
  }
  assert.equal(byId(pending.id), undefined, 'a link that never went out is never sent')
  assert.equal(byId(failed.id), undefined)
  assert.equal(byId(sending.id).recipient_email, 'reza@example.com', 'in flight: left for the next sweep')
  assert.equal(byId(other.id).recipient_email, 'reza@example.com', 'another request is untouched')
  assert.equal(byId(ownerMail.id).recipient_email, 'artaveo.dev@gmail.com', 'other kinds are untouched')

  assert.equal(await redactRequestNotifications(db.client, 'r1'), 0, 'idempotent')
})

test('privacy: the daily sweep clears finished requests, keeps live ones, and catches late-finishing messages', async () => {
  const db = makeDb()
  const requests = db.tables.recommendation_requests
  requests.push(
    { ...reqRow({ revoked_at: '2026-09-10T00:00:00.000Z' }), id: 'revoked' },
    { ...reqRow({ expires_at: '2026-09-01T00:00:00.000Z' }), id: 'expired' },
    { ...reqRow({ used_at: 'u', recommendation_id: 'x', recommendations: { status: 'approved' } }), id: 'approved' },
    { ...reqRow({ used_at: 'u', recommendation_id: null }), id: 'orphan' },
    { ...reqRow({ expires_at: '2027-01-01T00:00:00.000Z' }), id: 'live' },
    { ...reqRow({ used_at: 'u', recommendation_id: 'x', recommendations: { status: 'changes-requested' } }), id: 'moderating' },
    { ...reqRow({ recipient_email: null }), id: 'noaddress' },
  )
  const rows = ['revoked', 'expired', 'approved', 'orphan', 'live', 'moderating'].map((id) => outboxFor(db, id, { status: 'sent' }))
  const pendingForExpired = outboxFor(db, 'expired', { status: 'pending' })
  // A message that only reached a final state after its request was already cleared:
  const late = outboxFor(db, 'noaddress', { status: 'exhausted' })
  db.tables.notification_outbox.push(...rows, pendingForExpired, late)

  const result = await sweepRecommendationRecipients(db.client, NOW)
  assert.equal(result.cleared, 4)
  const held = (id) => requests.find((r) => r.id === id).recipient_email
  for (const id of ['revoked', 'expired', 'approved', 'orphan']) assert.equal(held(id), null, id)
  for (const id of ['live', 'moderating']) assert.equal(held(id), 'a@b.co', id)
  assert.equal(requests.find((r) => r.id === 'revoked').recipient_locale, null)

  const redacted = (id) => db.tables.notification_outbox.filter((r) => r.entity_id === id && r.recipient_email === REDACTED_MARKER).length
  for (const id of ['revoked', 'expired', 'approved', 'orphan', 'noaddress']) assert.ok(redacted(id) >= 1, id)
  for (const id of ['live', 'moderating']) assert.equal(redacted(id), 0, id)
  assert.equal(db.tables.notification_outbox.includes(pendingForExpired), false)
  assert.ok(result.redacted >= 5)

  const again = await sweepRecommendationRecipients(db.client, NOW)
  assert.deepEqual(again, { cleared: 0, redacted: 0 }, 'a second run finds nothing left to do')
})

test('a redacted message can never be retried', async () => {
  const db = makeDb()
  const row = outboxFor(db, 'r1', { status: 'exhausted', recipient_email: REDACTED_MARKER, body_text: REDACTED_MARKER })
  db.tables.notification_outbox.push(row)
  assert.equal(await requeueNotification(db.client, row.id), 'not-retryable')
})

// ── outbox worker ─────────────────────────────────────────────────────────

test('worker: a due row is claimed, sent once with a stable idempotency key, marked sent, and logged', async () => {
  const db = makeDb()
  const row = db.outboxRow({ reply_to: 'client@example.com' })
  db.tables.notification_outbox.push(row)
  const log = []
  const result = await processOutboxBatch(db.client, { provider: okProvider(log) })

  assert.deepEqual(result, { attempted: 1, sent: 1, failed: 0, exhausted: 0 })
  assert.equal(log.length, 1)
  assert.equal(log[0].message.idempotencyKey, `outbox-${row.id}`)
  assert.equal(log[0].message.replyTo, 'client@example.com')
  assert.equal(log[0].options.timeoutMs, 8000)
  const stored = db.tables.notification_outbox[0]
  assert.equal(stored.status, 'sent')
  assert.equal(stored.attempts, 1)
  assert.equal(stored.locked_until, null)
  assert.equal(stored.last_provider, 'resend')
  assert.ok(stored.sent_at)
  assert.equal(db.tables.notification_attempts.length, 1)
  assert.deepEqual(
    { n: db.tables.notification_attempts[0].attempt_no, ok: db.tables.notification_attempts[0].ok, id: db.tables.notification_attempts[0].provider_message_id },
    { n: 1, ok: true, id: 'msg-1' },
  )

  const again = await processOutboxBatch(db.client, { provider: okProvider(log) })
  assert.equal(again.attempted, 0, 'a sent row is never sent again')
  assert.equal(log.length, 1)
})

test('worker: a transient failure is retried later with backoff, not immediately, and no alert is raised', async () => {
  const fixed = new Date('2026-09-19T10:00:00.000Z')
  const db = makeDb({ now: () => fixed })
  db.tables.notification_outbox.push(db.outboxRow())
  const { entries, audit } = noAudit()

  const result = await processOutboxBatch(db.client, {
    provider: failingProvider({ ok: false, error: 'resend responded 503: down', retryable: true }),
    audit,
    now: () => fixed,
  })
  assert.deepEqual(result, { attempted: 1, sent: 0, failed: 1, exhausted: 0 })
  const stored = db.tables.notification_outbox[0]
  assert.equal(stored.status, 'failed')
  assert.equal(stored.attempts, 1)
  assert.equal(stored.next_attempt_at, '2026-09-19T10:01:00.000Z')
  assert.equal(stored.locked_until, null)
  assert.match(stored.last_error, /503/)
  assert.equal(db.tables.notification_outbox.length, 1, 'no alert yet')
  assert.equal(entries.length, 0)
  assert.equal(db.tables.notification_attempts[0].retryable, true)

  const early = await processOutboxBatch(db.client, { provider: okProvider() })
  assert.equal(early.attempted, 0, 'still inside the backoff window')
})

test('worker: a permanent failure exhausts at once, alerts the owner exactly once, and the alert is delivered', async () => {
  const db = makeDb()
  const original = db.outboxRow({ kind: 'client-confirmation', recipient_email: 'client@example.com' })
  db.tables.notification_outbox.push(original)
  const { entries, audit } = noAudit()
  const sends = []
  const provider = {
    id: 'resend',
    async send(message) {
      sends.push(message)
      // The client's copy is refused for good; the owner's alert goes through.
      return message.to === 'client@example.com'
        ? { ok: false, error: 'resend responded 403: domain is not verified', retryable: false }
        : { ok: true, providerMessageId: 'alert-1' }
    },
  }
  const log = console.error
  console.error = () => {}
  let result
  try {
    result = await processOutboxBatch(db.client, { provider, audit })
  } finally {
    console.error = log
  }

  assert.equal(result.exhausted, 1)
  assert.equal(db.tables.notification_outbox.find((r) => r.id === original.id).status, 'exhausted')
  assert.equal(db.tables.notification_outbox.find((r) => r.id === original.id).attempts, 1)
  const alerts = db.tables.notification_outbox.filter((r) => r.kind === 'system-alert')
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].status, 'sent', 'the alert was sent straight away')
  assert.equal(alerts[0].recipient_email, 'artaveo.dev@gmail.com')
  assert.match(alerts[0].subject, /client confirmation/)
  assert.equal(alerts[0].body_text.includes('client@example.com'), false)
  assert.match(alerts[0].body_text, new RegExp(`notifications/${original.id}`))
  assert.equal(sends.length, 2)
  assert.deepEqual(entries.map((e) => e.action), ['notification.exhausted'])
  assert.equal(entries[0].entityId, original.id)
  assert.equal(entries[0].after.permanent, true)
})

test('worker: the retry ceiling exhausts a retryable failure on the last allowed attempt', async () => {
  const db = makeDb()
  db.tables.notification_outbox.push(db.outboxRow({ attempts: 4, max_attempts: 5, status: 'failed' }))
  const { audit } = noAudit()
  const log = console.error
  console.error = () => {}
  try {
    const result = await processOutboxBatch(db.client, {
      provider: failingProvider({ ok: false, error: 'timeout', retryable: true }),
      audit,
    })
    assert.equal(result.exhausted, 1)
  } finally {
    console.error = log
  }
  assert.equal(db.tables.notification_outbox[0].status, 'exhausted')
  assert.equal(db.tables.notification_outbox[0].attempts, 5)
  assert.equal(db.tables.notification_outbox.filter((r) => r.kind === 'system-alert').length, 1)
})

test('worker: an alert that itself fails permanently never raises another alert', async () => {
  const db = makeDb()
  db.tables.notification_outbox.push(db.outboxRow({ kind: 'owner-alert' }))
  const { entries, audit } = noAudit()
  const log = console.error
  console.error = () => {}
  try {
    await processOutboxBatch(db.client, {
      provider: failingProvider({ ok: false, error: 'resend responded 401: bad key', retryable: false }),
      audit,
    })
  } finally {
    console.error = log
  }
  const kinds = db.tables.notification_outbox.map((r) => `${r.kind}:${r.status}`).sort()
  assert.deepEqual(kinds, ['owner-alert:exhausted', 'system-alert:exhausted'])
  assert.equal(entries.length, 2, 'both exhaustions are audited, but only one alert exists')
})

test('worker: a provider that throws is treated as a retryable failure, not a crash', async () => {
  const db = makeDb()
  db.tables.notification_outbox.push(db.outboxRow())
  const result = await processOutboxBatch(db.client, {
    provider: {
      id: 'resend',
      async send() {
        throw new Error('kaboom')
      },
    },
  })
  assert.equal(result.failed, 1)
  assert.equal(db.tables.notification_outbox[0].status, 'failed')
  assert.equal(db.tables.notification_outbox[0].last_error, 'kaboom')
})

test('worker: if the lease was lost during the send, the stale worker changes nothing and alerts nothing', async () => {
  const db = makeDb()
  const row = db.outboxRow()
  db.tables.notification_outbox.push(row)
  const { entries, audit } = noAudit()
  const provider = {
    id: 'resend',
    async send() {
      // Another worker reclaimed the row while this send was in flight.
      db.tables.notification_outbox[0].locked_until = '2099-01-01T00:00:00.000Z'
      return { ok: false, error: 'boom', retryable: false }
    },
  }
  const log = console.error
  console.error = () => {}
  let result
  try {
    result = await processOutboxBatch(db.client, { provider, audit })
  } finally {
    console.error = log
  }
  assert.deepEqual(result, { attempted: 1, sent: 0, failed: 0, exhausted: 0 })
  assert.equal(db.tables.notification_outbox[0].status, 'sending', 'left exactly as the new owner has it')
  assert.equal(db.tables.notification_attempts.length, 0)
  assert.equal(entries.length, 0)
  assert.equal(db.tables.notification_outbox.length, 1)
})

test('worker: two sweeps racing for the same rows send each message exactly once', async () => {
  const db = makeDb()
  for (let i = 0; i < 8; i++) db.tables.notification_outbox.push(db.outboxRow({ subject: `m${i}` }))
  const log = []
  const provider = {
    id: 'resend',
    async send(message) {
      await new Promise((resolve) => setTimeout(resolve, 5))
      log.push(message.subject)
      return { ok: true }
    },
  }
  const [a, b] = await Promise.all([
    processOutboxBatch(db.client, { provider, limit: 20, chunkSize: 3 }),
    processOutboxBatch(db.client, { provider, limit: 20, chunkSize: 3 }),
  ])
  assert.equal(a.sent + b.sent, 8)
  assert.equal(log.length, 8)
  assert.equal(new Set(log).size, 8, 'no message went out twice')
  assert.ok(db.tables.notification_outbox.every((r) => r.status === 'sent' && r.attempts === 1))
})

test('worker: a crashed worker\'s expired lease is reclaimed and the row still goes out', async () => {
  const db = makeDb()
  db.tables.notification_outbox.push(
    db.outboxRow({ status: 'sending', locked_until: new Date(Date.now() - 5000).toISOString() }),
  )
  const result = await processOutboxBatch(db.client, { provider: okProvider() })
  assert.equal(result.sent, 1)
})

test('worker: limit, deadline and ids are respected', async () => {
  const db = makeDb()
  for (let i = 0; i < 6; i++) db.tables.notification_outbox.push(db.outboxRow())
  const log = []

  const limited = await processOutboxBatch(db.client, { provider: okProvider(log), limit: 2, chunkSize: 5 })
  assert.equal(limited.attempted, 2)

  const expired = await processOutboxBatch(db.client, { provider: okProvider(log), deadlineMs: 0 })
  assert.equal(expired.attempted, 0, 'a spent deadline claims nothing, so nothing is stranded in "sending"')
  assert.equal(db.tables.notification_outbox.filter((r) => r.status === 'sending').length, 0)

  const target = db.tables.notification_outbox.find((r) => r.status === 'pending')
  const one = await processOutboxBatch(db.client, { provider: okProvider(log), ids: [target.id] })
  assert.equal(one.attempted, 1)
  assert.equal(db.tables.notification_outbox.filter((r) => r.status === 'sent').length, 3)
})

test('worker: a claim failure (migration missing) is logged and returns zeros — it never throws', async () => {
  const client = { rpc: async () => ({ data: null, error: { message: 'function does not exist' } }) }
  const log = console.error
  console.error = () => {}
  try {
    assert.deepEqual(await processOutboxBatch(client, { provider: okProvider() }), { attempted: 0, sent: 0, failed: 0, exhausted: 0 })
  } finally {
    console.error = log
  }
})

test('requeue: only failed/exhausted rows; attempts kept; ceiling raised; due immediately', async () => {
  const db = makeDb()
  const exhausted = db.outboxRow({ status: 'exhausted', attempts: 5, max_attempts: 5, next_attempt_at: '2026-09-01T00:00:00.000Z' })
  const failed = db.outboxRow({ status: 'failed', attempts: 2, max_attempts: 5, next_attempt_at: '2099-01-01T00:00:00.000Z' })
  const sent = db.outboxRow({ status: 'sent', attempts: 1 })
  const sending = db.outboxRow({ status: 'sending', attempts: 0 })
  db.tables.notification_outbox.push(exhausted, failed, sent, sending)
  const now = new Date('2026-09-19T12:00:00.000Z')

  assert.equal(await requeueNotification(db.client, exhausted.id, now), 'requeued')
  const stored = db.tables.notification_outbox.find((r) => r.id === exhausted.id)
  assert.equal(stored.status, 'pending')
  assert.equal(stored.attempts, 5, 'history is never rewritten')
  assert.equal(stored.max_attempts, 8)
  assert.equal(stored.next_attempt_at, '2026-09-19T12:00:00.000Z')

  assert.equal(await requeueNotification(db.client, failed.id, now), 'requeued')
  assert.equal(db.tables.notification_outbox.find((r) => r.id === failed.id).next_attempt_at, '2026-09-19T12:00:00.000Z')
  assert.equal(await requeueNotification(db.client, sent.id, now), 'not-retryable')
  assert.equal(await requeueNotification(db.client, sending.id, now), 'not-retryable')
  assert.equal(await requeueNotification(db.client, 'missing', now), 'not-found')
})

test('requeue then process: the retry of an exhausted message goes through and continues the attempt numbering', async () => {
  const db = makeDb()
  const row = db.outboxRow({ status: 'exhausted', attempts: 5, max_attempts: 5 })
  db.tables.notification_outbox.push(row)
  await requeueNotification(db.client, row.id, new Date(Date.now() - 1000))
  const result = await processOutboxBatch(db.client, { provider: okProvider(), ids: [row.id] })
  assert.equal(result.sent, 1)
  assert.equal(db.tables.notification_outbox[0].attempts, 6)
  assert.equal(db.tables.notification_attempts[0].attempt_no, 6)
})
