#!/usr/bin/env node
/**
 * Phase 20 — verification against a REAL PostgreSQL + PostgREST + supabase-js
 * stack (a fake cannot prove a constraint, a trigger, a unique index or a
 * conditional update). Not part of `npm test`: it needs a database.
 *
 *   PGREST_URL=http://127.0.0.1:3111 SERVICE_JWT=<service_role jwt> \
 *     node --import ./scripts/register-ts-resolve.mjs scripts/verify-consultations-stack.mjs
 *
 * Setup used for the phase (see docs/phases/PHASE-20-README.md § Verification):
 * PostgreSQL 16 with migrations 0001–0019 applied over minimal Supabase shims
 * (roles anon/authenticated/service_role, `auth.users`, `storage.*`), PostgREST
 * 12.2 in front of it, `service_role` granted the public schema. The script
 * puts a tiny proxy in front of PostgREST because supabase-js talks to
 * `<url>/rest/v1` and a bare PostgREST serves at the root.
 *
 * It drives the actual service functions (`lib/consultation/service.ts`), the
 * actual enqueue functions and the actual outbox worker (with the console
 * provider), then reads the rows back and checks them.
 */
import assert from 'node:assert/strict'
import http from 'node:http'

const PGREST = process.env.PGREST_URL ?? 'http://127.0.0.1:3111'
const JWT = process.env.SERVICE_JWT
if (!JWT) throw new Error('SERVICE_JWT is required')

// supabase-js → <base>/rest/v1/<path>; PostgREST serves <path>.
const proxy = http.createServer((req, res) => {
  const target = new URL(req.url.replace(/^\/rest\/v1/, ''), PGREST)
  const upstream = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
    res.writeHead(r.statusCode, r.headers)
    r.pipe(res)
  })
  req.pipe(upstream)
})
await new Promise((resolve) => proxy.listen(3112, '127.0.0.1', resolve))

process.env.SUPABASE_URL = 'http://127.0.0.1:3112'
process.env.SUPABASE_SERVICE_ROLE_KEY = JWT

const { getSupabaseServerClient } = await import('../lib/supabase/server.ts')
const service = await import('../lib/consultation/service.ts')
const queries = await import('../lib/consultation/queries.ts')
const { dateOptions } = await import('../lib/consultation/time.ts')
const { getFirstResponseTimes, isOwnerAction } = await import('../lib/admin/pipeline.ts')
const { processOutboxBatch } = await import('../lib/notifications/outbox.ts')

const supabase = getSupabaseServerClient()
assert.ok(supabase, 'supabase client')
const deps = { supabase }

let passed = 0
const check = async (name, fn) => {
  try {
    await fn()
    passed += 1
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`NOT OK - ${name}\n`, err)
    process.exitCode = 1
  }
}

const uuid = () => globalThis.crypto.randomUUID()
const day = (offset) => dateOptions('Asia/Kabul', new Date(), 30)[offset]
const OLD = Date.now() - 60_000 // "the form was rendered a minute ago"
const meta = (extra = {}) => ({ honeypot: '', formRenderedAt: OLD, idempotencyKey: uuid(), sourceReferrer: null, ...extra })
const input = (extra = {}) => ({
  name: 'Verify Client',
  email: `verify-${uuid().slice(0, 8)}@example.com`,
  phone: '',
  goal: 'Talk about rebuilding our booking system',
  timezone: 'Asia/Kabul',
  windows: [
    { date: day(3), from: '14:00', to: '16:00' },
    { date: day(4), from: '10:00', to: '12:00' },
  ],
  consent: true,
  ...extra,
})
const ctx = (extra = {}) => ({ locale: 'en', ipHash: `ip-${uuid()}`, ...extra })

async function outboxFor(consultationId) {
  const { data } = await supabase.from('notification_outbox').select('*').eq('entity_id', consultationId).order('created_at')
  return data ?? []
}
const byKind = (rows, kind) => rows.filter((r) => r.kind === kind)

let A // the main consultation
let tokenA

await check('request: creates an inquiry AND a consultation, a private token, two outbox rows, both sent (console provider)', async () => {
  const m = meta()
  const result = await service.createConsultationRequest(deps, input({ phone: '+93700000000' }), m, ctx({ locale: 'fa' }))
  assert.equal(result.ok, true, JSON.stringify(result))
  tokenA = result.token
  assert.match(tokenA, /^[A-Za-z0-9_-]{32}$/)

  A = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(A.status, 'requested')
  assert.equal(A.locale, 'fa')
  assert.equal(A.timezone, 'Asia/Kabul')
  assert.equal(A.windows.length, 2)
  assert.equal(A.durationMinutes, 30)
  assert.equal(A.inquiry.stage, 'new')
  assert.equal(A.inquiry.preferredChannel, 'whatsapp') // a phone number was given
  assert.equal(A.inquiry.preferredLocale, 'fa')

  const { data: inq } = await supabase.from('inquiries').select('source_channel, goal, consent').eq('id', A.inquiryId).single()
  assert.equal(inq.source_channel, 'consultation')
  assert.equal(inq.consent, true)

  const rows = await outboxFor(A.id)
  assert.deepEqual(rows.map((r) => r.kind).sort(), ['consultation-received', 'consultation-requested'])
  assert.ok(rows.every((r) => r.status === 'sent' && r.inquiry_id === A.inquiryId && r.attachments === null))
  assert.ok(byKind(rows, 'consultation-received')[0].body_text.includes(`/fa/consultation/${tokenA}`))

  const { data: attempts } = await supabase.from('notification_attempts').select('provider, ok').in('outbox_id', rows.map((r) => r.id))
  assert.equal(attempts.length, 2)
  assert.ok(attempts.every((a) => a.provider === 'console' && a.ok))

  const { data: events } = await supabase.from('inquiry_events').select('type, actor').eq('inquiry_id', A.inquiryId).order('created_at')
  assert.deepEqual(events.map((e) => `${e.type}:${e.actor}`), ['created:system', 'consultation-requested:client'])
})

await check('request: replay with the same key returns the same link and queues nothing new', async () => {
  const m = meta()
  const body = input()
  const first = await service.createConsultationRequest(deps, body, m, ctx())
  const before = (await outboxFor((await queries.loadConsultationByToken(supabase, first.token)).id)).length
  const second = await service.createConsultationRequest(deps, body, m, ctx())
  assert.equal(second.ok, true)
  assert.equal(second.token, first.token)
  assert.equal(second.replay, true)
  const c = await queries.loadConsultationByToken(supabase, first.token)
  assert.equal((await outboxFor(c.id)).length, before)
  const { count } = await supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('inquiry_id', c.inquiryId)
  assert.equal(count, 1)
})

await check('request: two racing submits with one key create ONE consultation', async () => {
  const m = meta()
  const body = input()
  const [r1, r2] = await Promise.all([
    service.createConsultationRequest(deps, body, m, ctx()),
    service.createConsultationRequest(deps, body, m, ctx()),
  ])
  assert.equal(r1.ok && r2.ok, true, JSON.stringify([r1, r2]))
  assert.equal(r1.token, r2.token)
  const c = await queries.loadConsultationByToken(supabase, r1.token)
  const { count } = await supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('inquiry_id', c.inquiryId)
  assert.equal(count, 1)
  assert.equal(byKind(await outboxFor(c.id), 'consultation-requested').length, 1)
})

await check('request: honeypot, fast fill, bad input and bad windows are refused with codes, and write nothing', async () => {
  const before = (await supabase.from('inquiries').select('id', { count: 'exact', head: true })).count
  assert.deepEqual(await service.createConsultationRequest(deps, input(), meta({ honeypot: 'x' }), ctx()), { ok: false, code: 'rejected' })
  assert.deepEqual(await service.createConsultationRequest(deps, input(), meta({ formRenderedAt: Date.now() }), ctx()), { ok: false, code: 'rejected' })
  assert.equal((await service.createConsultationRequest(deps, input({ email: 'nope' }), meta(), ctx())).code, 'invalid')
  assert.equal((await service.createConsultationRequest(deps, input({ goal: 'short' }), meta(), ctx())).code, 'invalid')
  assert.equal((await service.createConsultationRequest(deps, input({ consent: false }), meta(), ctx())).code, 'invalid')
  assert.equal((await service.createConsultationRequest(deps, input({ timezone: 'Mars/Base' }), meta(), ctx())).code, 'invalid-timezone')
  assert.equal((await service.createConsultationRequest(deps, input({ windows: [] }), meta(), ctx())).code, 'window-count')
  assert.equal((await service.createConsultationRequest(deps, input({ windows: [{ date: '2020-01-01', from: '10:00', to: '11:00' }] }), meta(), ctx())).code, 'window-too-soon')
  assert.equal((await service.createConsultationRequest(deps, input(), meta({ idempotencyKey: 'not-a-uuid' }), ctx())).code, 'invalid')
  const after = (await supabase.from('inquiries').select('id', { count: 'exact', head: true })).count
  assert.equal(after, before)
})

await check('request: the per-IP and per-e-mail limits (same as the Brief Builder) apply', async () => {
  const c = ctx()
  for (let i = 0; i < 5; i += 1) assert.equal((await service.createConsultationRequest(deps, input(), meta(), c)).ok, true)
  assert.deepEqual(await service.createConsultationRequest(deps, input(), meta(), c), { ok: false, code: 'rejected' })
  const email = `same-${uuid().slice(0, 8)}@example.com`
  for (let i = 0; i < 3; i += 1) assert.equal((await service.createConsultationRequest(deps, input({ email }), meta(), ctx())).ok, true)
  assert.deepEqual(await service.createConsultationRequest(deps, input({ email }), meta(), ctx()), { ok: false, code: 'rejected' })
})

await check('reschedule while requested: windows replaced, status stays requested, owner notified once per change', async () => {
  const before = await queries.loadConsultationByToken(supabase, tokenA)
  const result = await service.requestConsultationReschedule(deps, tokenA, 'Asia/Tehran', [{ date: day(5), from: '09:00', to: '10:00' }])
  assert.deepEqual(result, { ok: true })
  const after = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(after.status, 'requested')
  assert.equal(after.rescheduleRequests, 1)
  assert.equal(after.timezone, 'Asia/Tehran')
  assert.equal(after.windows.length, 1)
  assert.notEqual(after.windows[0].start, before.windows[0].start)
  const notices = byKind(await outboxFor(A.id), 'consultation-client-update')
  assert.equal(notices.length, 1)
  assert.equal(notices[0].dedupe_key, `consultation:${A.id}:client-update:rescheduled:1`)
  assert.equal(notices[0].recipient_email, 'artaveo.dev@gmail.com')
  assert.equal(notices[0].reply_to, A.inquiry.email)
})

await check('owner confirms: state, sequence, event, audit row, and an invitation that carries UID + SEQUENCE:0', async () => {
  const current = await queries.loadConsultationByToken(supabase, tokenA)
  const start = current.windows[0].start
  const result = await service.confirmConsultation(deps, { consultationId: A.id, actor: 'owner-1', start: new Date(start), meetingDetails: 'WhatsApp voice call' })
  assert.deepEqual(result, { ok: true })

  const c = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(c.status, 'confirmed')
  assert.equal(new Date(c.confirmedStart).getTime(), new Date(start).getTime())
  assert.equal(new Date(c.confirmedEnd).getTime() - new Date(c.confirmedStart).getTime(), 30 * 60_000)
  assert.equal(c.meetingDetails, 'WhatsApp voice call')
  assert.equal(c.sequence, 1)
  assert.ok(c.confirmedAt)

  const mail = byKind(await outboxFor(A.id), 'consultation-confirmed')
  assert.equal(mail.length, 1)
  assert.equal(mail[0].status, 'sent')
  assert.equal(mail[0].locale, 'fa')
  assert.equal(mail[0].dedupe_key, `consultation:${A.id}:confirmed:0`)
  const ics = mail[0].attachments[0].content.replace(/\r\n /g, '')
  assert.ok(ics.includes(`UID:${A.id}@consultations.artaveo`) && ics.includes('SEQUENCE:0') && ics.includes('METHOD:REQUEST'))
  assert.ok(ics.includes(`DTSTART:${new Date(start).toISOString().replace(/[-:]|\.000/g, '')}`))

  const { data: events } = await supabase.from('inquiry_events').select('type, actor').eq('inquiry_id', A.inquiryId).eq('type', 'consultation-confirmed')
  assert.deepEqual(events, [{ type: 'consultation-confirmed', actor: 'owner-1' }])
  const { data: audit } = await supabase.from('audit_log').select('action, entity_id').eq('entity_id', A.id)
  assert.ok(audit.some((row) => row.action === 'consultation.confirmed'))
})

await check('the client\'s page data: meeting details visible while a call stands, nothing from the inquiry ever', async () => {
  const state = await queries.resolveConsultationToken(tokenA)
  assert.equal(state.state, 'ok')
  assert.equal(state.consultation.meetingDetails, 'WhatsApp voice call')
  const keys = Object.keys(state.consultation).sort()
  assert.deepEqual(keys, ['cancelledBy', 'closedAt', 'confirmedEnd', 'confirmedStart', 'durationMinutes', 'locale', 'meetingDetails', 'rescheduleRequests', 'status', 'timezone', 'windows'])
  assert.deepEqual(await queries.resolveConsultationToken('x'.repeat(32)), { state: 'not-found' })
  assert.deepEqual(await queries.resolveConsultationToken('short'), { state: 'not-found' })
})

await check('reschedule after confirmation: → rescheduled, the confirmed time still stands; limit of 3 enforced', async () => {
  const before = await queries.loadConsultationByToken(supabase, tokenA)
  assert.deepEqual(await service.requestConsultationReschedule(deps, tokenA, 'Asia/Kabul', [{ date: day(6), from: '10:00', to: '12:00' }]), { ok: true })
  const c = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(c.status, 'rescheduled')
  assert.equal(c.confirmedStart, before.confirmedStart)
  assert.equal(c.rescheduleRequests, 2)
  const notice = byKind(await outboxFor(A.id), 'consultation-client-update').find((r) => r.dedupe_key.endsWith(':rescheduled:2'))
  assert.ok(notice.body_text.includes('still stands, and stays in their calendar'))

  assert.deepEqual(await service.requestConsultationReschedule(deps, tokenA, 'Asia/Kabul', [{ date: day(7), from: '10:00', to: '12:00' }]), { ok: true }) // 3rd
  assert.deepEqual(await service.requestConsultationReschedule(deps, tokenA, 'Asia/Kabul', [{ date: day(8), from: '10:00', to: '12:00' }]), { ok: false, code: 'limit-reached' })
  assert.equal((await service.requestConsultationReschedule(deps, tokenA, 'Nowhere/Land', [])).code === 'limit-reached', true, 'the limit is checked before anything else about the new times')
})

await check('owner moves the call: rescheduled → confirmed, SEQUENCE 1, same UID, the old time named in the message', async () => {
  const current = await queries.loadConsultationByToken(supabase, tokenA)
  const newStart = new Date(current.windows[0].start)
  const previousStart = current.confirmedStart
  assert.deepEqual(await service.confirmConsultation(deps, { consultationId: A.id, actor: 'owner-1', start: newStart, meetingDetails: 'Google Meet: https://meet.example.test/x' }), { ok: true })
  const c = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(c.status, 'confirmed')
  assert.equal(c.sequence, 2)
  const mails = byKind(await outboxFor(A.id), 'consultation-confirmed')
  assert.equal(mails.length, 2)
  const second = mails.find((m) => m.dedupe_key.endsWith(':1'))
  assert.ok(second.subject.includes('تغییر کرد'))
  assert.ok(second.body_text.includes('زمان قبلی'))
  const ics = second.attachments[0].content.replace(/\r\n /g, '')
  assert.ok(ics.includes(`UID:${A.id}@consultations.artaveo`) && ics.includes('SEQUENCE:1'))
  assert.notEqual(previousStart, c.confirmedStart)
})

await check('two owners confirming at once: exactly one wins, the other gets `conflict` — never a silent overwrite', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  const start1 = new Date(c.windows[0].start)
  const start2 = new Date(c.windows[1].start)
  const results = await Promise.all([
    service.confirmConsultation(deps, { consultationId: c.id, actor: 'a', start: start1, meetingDetails: 'one' }),
    service.confirmConsultation(deps, { consultationId: c.id, actor: 'b', start: start2, meetingDetails: 'two' }),
  ])
  const oks = results.filter((r) => r.ok).length
  assert.equal(oks, 1, JSON.stringify(results))
  assert.ok(results.some((r) => !r.ok && r.code === 'conflict'), JSON.stringify(results))
  const after = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.equal(after.sequence, 1)
  assert.equal(byKind(await outboxFor(c.id), 'consultation-confirmed').length, 1)
})

await check('owner input rules: past time, empty details, terminal states', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.equal((await service.confirmConsultation(deps, { consultationId: c.id, actor: 'a', start: new Date(Date.now() - 1000), meetingDetails: 'x' })).code, 'in-the-past')
  assert.equal((await service.confirmConsultation(deps, { consultationId: c.id, actor: 'a', start: new Date(c.windows[0].start), meetingDetails: '   ' })).code, 'invalid')
  assert.equal((await service.confirmConsultation(deps, { consultationId: uuid(), actor: 'a', start: new Date(c.windows[0].start), meetingDetails: 'x' })).code, 'not-found')
  assert.equal((await service.completeConsultation(deps, { consultationId: c.id, actor: 'a' })).code, 'invalid-transition') // requested → completed is not on the graph
})

await check('client cancels a CONFIRMED call: cancelled, closed_at, CANCEL invitation with the next SEQUENCE, owner notice', async () => {
  const c0 = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(c0.status, 'confirmed')
  const result = await service.cancelConsultationAsClient(deps, tokenA, 'Something came up')
  assert.deepEqual(result, { ok: true })
  const c = await queries.loadConsultationByToken(supabase, tokenA)
  assert.equal(c.status, 'cancelled')
  assert.equal(c.cancelledBy, 'client')
  assert.equal(c.cancelReason, 'Something came up')
  assert.ok(c.closedAt)
  assert.equal(c.sequence, c0.sequence + 1)

  const rows = await outboxFor(A.id)
  const cancelled = byKind(rows, 'consultation-cancelled')
  assert.equal(cancelled.length, 1)
  const ics = cancelled[0].attachments[0].content.replace(/\r\n /g, '')
  assert.ok(ics.includes('METHOD:CANCEL') && ics.includes('STATUS:CANCELLED') && ics.includes(`SEQUENCE:${c0.sequence}`))
  const owner = byKind(rows, 'consultation-client-update').find((r) => r.dedupe_key.endsWith(':cancelled'))
  assert.ok(owner.body_text.includes('Something came up'))

  // The client's page: the meeting details are no longer shared.
  const state = await queries.resolveConsultationToken(tokenA)
  assert.equal(state.consultation.meetingDetails, null)
  assert.equal(state.consultation.confirmedStart, null)
})

await check('terminal: no further client or owner action is possible; a NEW request for the same person is', async () => {
  assert.equal((await service.cancelConsultationAsClient(deps, tokenA, '')).code, 'not-allowed')
  assert.equal((await service.requestConsultationReschedule(deps, tokenA, 'Asia/Kabul', [{ date: day(9), from: '10:00', to: '12:00' }])).code, 'not-allowed')
  assert.equal((await service.cancelConsultationAsOwner(deps, { consultationId: A.id, actor: 'a', reason: '' })).code, 'invalid-transition')
  assert.equal((await service.confirmConsultation(deps, { consultationId: A.id, actor: 'a', start: new Date(Date.now() + 86400000), meetingDetails: 'x' })).code, 'invalid-transition')
})

await check('client cancels a call that was never confirmed: nothing to remove from a calendar, so no message to the client', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.deepEqual(await service.cancelConsultationAsClient(deps, fresh.token, ''), { ok: true })
  const rows = await outboxFor(c.id)
  assert.equal(byKind(rows, 'consultation-cancelled').length, 0)
  assert.equal(byKind(rows, 'consultation-client-update').length, 1)
  const after = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.equal(after.sequence, 0, 'no calendar entry existed, so the sequence is untouched')
})

await check('owner cancels: the client is always told; a confirmed time also gets the calendar cancellation', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx({ locale: 'en' }))
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.deepEqual(await service.cancelConsultationAsOwner(deps, { consultationId: c.id, actor: 'owner-1', reason: 'Out of office' }), { ok: true })
  const cancelled = byKind(await outboxFor(c.id), 'consultation-cancelled')
  assert.equal(cancelled.length, 1)
  assert.equal(cancelled[0].attachments, null)
  assert.ok(cancelled[0].body_text.includes('Out of office'))

  const fresh2 = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c2 = await queries.loadConsultationByToken(supabase, fresh2.token)
  await service.confirmConsultation(deps, { consultationId: c2.id, actor: 'o', start: new Date(c2.windows[0].start), meetingDetails: 'x' })
  await service.cancelConsultationAsOwner(deps, { consultationId: c2.id, actor: 'o', reason: '' })
  const cancelled2 = byKind(await outboxFor(c2.id), 'consultation-cancelled')
  assert.match(cancelled2[0].attachments[0].contentType, /method=CANCEL/)
})

await check('completed: only after the confirmed time; then the link lingers 14 days and expires', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  const start = new Date(c.windows[0].start)
  await service.confirmConsultation(deps, { consultationId: c.id, actor: 'o', start, meetingDetails: 'x' })
  assert.equal((await service.completeConsultation(deps, { consultationId: c.id, actor: 'o' })).code, 'not-finished')

  const later = { supabase, now: () => new Date(start.getTime() + 31 * 60_000) }
  assert.deepEqual(await service.completeConsultation(later, { consultationId: c.id, actor: 'o' }), { ok: true })
  const done = await queries.loadConsultationByToken(supabase, fresh.token)
  assert.equal(done.status, 'completed')
  assert.ok(done.closedAt)
  const closed = new Date(done.closedAt).getTime()
  assert.equal((await queries.resolveConsultationToken(fresh.token, new Date(closed + 13 * 86_400_000))).state, 'ok')
  assert.equal((await queries.resolveConsultationToken(fresh.token, new Date(closed + 15 * 86_400_000))).state, 'expired')

  const expiredLater = { supabase, now: () => new Date(closed + 15 * 86_400_000) }
  assert.deepEqual(await service.cancelConsultationAsClient(expiredLater, fresh.token, ''), { ok: false, code: 'expired' })
})

await check('SLA: a consultation request and the client\'s own actions are not the owner responding', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  await service.requestConsultationReschedule(deps, fresh.token, 'Asia/Kabul', [{ date: day(5), from: '09:00', to: '10:00' }])
  assert.deepEqual(await getFirstResponseTimes([c.inquiryId]), {}, 'nothing from the owner yet')
  const c2 = await queries.loadConsultationByToken(supabase, fresh.token)
  await service.confirmConsultation(deps, { consultationId: c.id, actor: 'owner-1', start: new Date(c2.windows[0].start), meetingDetails: 'x' })
  const times = await getFirstResponseTimes([c.inquiryId])
  assert.ok(times[c.inquiryId], 'the owner\'s confirmation is the first response')
  assert.equal(isOwnerAction({ type: 'consultation-requested', actor: 'client' }), false)
  assert.equal(isOwnerAction({ type: 'created', actor: 'system' }), false)
  assert.equal(isOwnerAction({ type: 'note-added', actor: 'some-user-id' }), true)
})

await check('admin reads: list with filter and paging, awaiting count, per-inquiry list', async () => {
  const all = await queries.listConsultations({ page: 1, pageSize: 5 })
  assert.ok(all.total >= 10)
  assert.equal(all.consultations.length, 5)
  assert.ok(all.consultations[0].inquiry.name)
  const cancelled = await queries.listConsultations({ status: 'cancelled', page: 1 })
  assert.ok(cancelled.consultations.length >= 3 && cancelled.consultations.every((x) => x.status === 'cancelled'))
  const awaiting = await queries.countConsultationsAwaitingOwner()
  const { count } = await supabase.from('consultations').select('id', { count: 'exact', head: true }).in('status', ['requested', 'rescheduled'])
  assert.equal(awaiting, count)
  const per = await queries.listConsultationsForInquiry(A.inquiryId)
  assert.equal(per.length, 1)
  assert.equal((await queries.getAdminConsultation(A.id)).token, tokenA)
  assert.equal(queries.parseConsultationStatus('confirmed'), 'confirmed')
  assert.equal(queries.parseConsultationStatus('nope'), undefined)
})

await check('the database itself refuses what the code would never do (trigger, checks, unique index)', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  let r = await supabase.from('consultations').update({ status: 'completed', closed_at: new Date().toISOString() }).eq('id', c.id)
  assert.equal(r.error?.code, '23514') // requested → completed
  r = await supabase.from('consultations').update({ status: 'confirmed' }).eq('id', c.id)
  assert.equal(r.error?.code, '23514') // confirmed needs a time and details
  r = await supabase.from('consultations').insert({ inquiry_id: c.inquiryId, requested_windows: [], timezone: 'UTC', token: 'dup'.repeat(11) })
  assert.equal(r.error?.code, '23505') // one live consultation per inquiry
  r = await supabase.from('consultations').update({ requested_windows: [{}, {}, {}, {}] }).eq('id', c.id)
  assert.equal(r.error?.code, '23514')
})

await check('deleting an inquiry removes its consultation and every stored e-mail copy (the privacy policy\'s deletion promise)', async () => {
  const fresh = await service.createConsultationRequest(deps, input(), meta(), ctx())
  const c = await queries.loadConsultationByToken(supabase, fresh.token)
  await service.confirmConsultation(deps, { consultationId: c.id, actor: 'o', start: new Date(c.windows[0].start), meetingDetails: 'x' })
  assert.ok((await outboxFor(c.id)).length >= 3)
  const del = await supabase.from('inquiries').delete().eq('id', c.inquiryId)
  assert.equal(del.error, null)
  assert.equal((await outboxFor(c.id)).length, 0)
  assert.equal((await queries.loadConsultationByToken(supabase, fresh.token)), null)
})

await check('the outbox sweep still works with attachments in the queue', async () => {
  const result = await processOutboxBatch(supabase, { limit: 50 })
  assert.equal(result.exhausted, 0)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ''}`)
proxy.close()
