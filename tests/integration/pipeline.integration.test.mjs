/**
 * The lead pipeline against the database (roadmap § 14): the stage graph
 * exhaustively, the real actions, and the events they leave behind.
 */
import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { OWNER } from '../support/stack/accounts.mjs'
import { service, sql, uuid } from '../support/stack-env.mjs'
import { resetRequest } from '../support/next-runtime.mjs'
import { ALLOWED_STAGE_TRANSITIONS, STAGE_ORDER } from '../../types/pipeline.ts'

const { adminSignIn } = await import('../../app/actions/admin-auth.ts')
const { transitionInquiryStage, updateInquiryPriority, updateInquiryTags, updateInquiryFollowUp, addInquiryNote, exportInquiriesCsv } =
  await import('../../app/actions/pipeline.ts')
const { computeSla, getInquiryEvents } = await import('../../lib/admin/pipeline.ts')

const db = service()
const newInquiry = async (extra = {}) => {
  const { data, error } = await db.from('inquiries').insert({
    idempotency_key: uuid(), goal: 'Pipeline probe goal', name: 'Pipeline Probe', email: `p-${uuid().slice(0, 6)}@example.com`,
    preferred_locale: 'en', preferred_channel: 'email', consent: true, ...extra,
  }).select('id').single()
  assert.ifError(error)
  return data.id
}
const stageOf = async (id) => (await db.from('inquiries').select('stage').eq('id', id).single()).data.stage

before(() => sql('truncate public.inquiries restart identity cascade'))

describe('the database trigger and the TypeScript graph agree on every one of the 72 possible stage changes', () => {
  it('a real change is allowed exactly when ALLOWED_STAGE_TRANSITIONS says so', async () => {
    const disagreements = []
    for (const from of STAGE_ORDER) {
      for (const to of STAGE_ORDER) {
        if (from === to) continue
        const id = await newInquiry({ stage: from }) // inserting at any stage is not a "transition"
        const { error } = await db.from('inquiries').update({ stage: to }).eq('id', id)
        const dbAllows = !error
        if (error && error.code !== '23514') disagreements.push(`${from} → ${to}: unexpected error ${error.code} ${error.message}`)
        if (dbAllows !== ALLOWED_STAGE_TRANSITIONS[from].includes(to)) disagreements.push(`${from} → ${to}: database ${dbAllows ? 'allows' : 'refuses'}, graph says otherwise`)
        assert.equal(await stageOf(id), dbAllows ? to : from, `${from} → ${to}: stage after the attempt`)
      }
    }
    assert.deepEqual(disagreements, [])
  })
  it('an update that does not touch the stage is never blocked by the trigger (a "same stage" write is a no-op, not a transition)', async () => {
    const id = await newInquiry({ stage: 'archived' })
    assert.ifError((await db.from('inquiries').update({ priority: 'high' }).eq('id', id)).error)
    assert.ifError((await db.from('inquiries').update({ stage: 'archived' }).eq('id', id)).error)
  })
  it('a stage outside the vocabulary is refused by the CHECK constraint', async () => {
    const id = await newInquiry()
    assert.equal((await db.from('inquiries').update({ stage: 'negotiating' }).eq('id', id)).error?.code, '23514')
    assert.equal((await db.from('inquiries').insert({ idempotency_key: uuid(), goal: 'g', name: 'n', email: 'e@x.co', preferred_locale: 'en', preferred_channel: 'email', stage: 'bogus' })).error?.code, '23514')
  })
})

describe('database vocabularies', () => {
  it('priority and event type are closed sets', async () => {
    const id = await newInquiry()
    assert.equal((await db.from('inquiries').update({ priority: 'urgent' }).eq('id', id)).error?.code, '23514')
    assert.equal((await db.from('inquiry_events').insert({ inquiry_id: id, type: 'deleted-everything', actor: 'x' })).error?.code, '23514')
  })
  it('an idempotency key can be used once (unique)', async () => {
    const key = uuid()
    await newInquiry({ idempotency_key: key })
    const second = await db.from('inquiries').insert({ idempotency_key: key, goal: 'g', name: 'n', email: 'e@x.co', preferred_locale: 'en', preferred_channel: 'email' })
    assert.equal(second.error?.code, '23505')
  })
  it('deleting an inquiry removes its events and e-mail copies (no orphaned personal data)', async () => {
    const id = await newInquiry()
    await db.from('inquiry_events').insert({ inquiry_id: id, type: 'created', actor: 'system' })
    await db.from('notification_outbox').insert({ inquiry_id: id, kind: 'owner-alert', recipient_email: 'x@example.com', locale: 'en', subject: 's', body_text: 'b', dedupe_key: `d-${uuid()}` })
    await db.from('inquiries').delete().eq('id', id)
    for (const table of ['inquiry_events', 'notification_outbox']) {
      assert.equal((await db.from(table).select('id', { count: 'exact', head: true }).eq('inquiry_id', id)).count, 0, table)
    }
  })
})

describe('the owner actions', () => {
  let id
  before(async () => {
    resetRequest()
    const f = new FormData()
    f.set('email', OWNER.email)
    f.set('password', OWNER.password)
    assert.equal((await adminSignIn(f)).ok, true)
    id = await newInquiry()
  })

  it('walking a lead through the whole pipeline records each step as an event by the owner and in the audit log', async () => {
    sql('truncate public.audit_log')
    for (const next of ['reviewed', 'qualified', 'contacted', 'discovery', 'proposal', 'won', 'archived']) {
      assert.deepEqual(await transitionInquiryStage(id, next), { ok: true }, next)
      assert.equal(await stageOf(id), next)
    }
    const events = (await getInquiryEvents(id)).filter((e) => e.type === 'stage-changed')
    assert.equal(events.length, 7)
    assert.ok(events.every((e) => e.actor === OWNER.id))
    assert.deepEqual(events.at(-1).meta, { from: 'won', to: 'archived' })
    const audit = (await db.from('audit_log').select('action, before, after').eq('entity_id', id).order('at')).data
    assert.equal(audit.filter((a) => a.action === 'pipeline.stage_changed').length, 7)
    assert.deepEqual(audit.at(-1).after, { stage: 'archived' })
  })
  it('an invalid move is refused with a specific code and changes nothing', async () => {
    const lead = await newInquiry()
    assert.deepEqual(await transitionInquiryStage(lead, 'won'), { ok: false, code: 'invalid-transition' })
    assert.deepEqual(await transitionInquiryStage(lead, 'new'), { ok: false, code: 'invalid-transition' }, 'same stage is not a transition at the action level')
    assert.equal(await stageOf(lead), 'new')
    assert.equal((await getInquiryEvents(lead)).filter((e) => e.type === 'stage-changed').length, 0)
  })
  it('an unknown inquiry id is an error, not a crash', async () => {
    assert.deepEqual(await transitionInquiryStage(uuid(), 'reviewed'), { ok: false, code: 'error' })
  })
  it('priority, follow-up, tags and notes each persist and each leave one event', async () => {
    const lead = await newInquiry()
    assert.deepEqual(await updateInquiryPriority(lead, 'high'), { ok: true })
    assert.deepEqual(await updateInquiryFollowUp(lead, '2026-10-01T09:00:00.000Z'), { ok: true })
    assert.deepEqual(await updateInquiryTags(lead, ['vip', 'referral']), { ok: true })
    assert.deepEqual(await addInquiryNote(lead, '  Called back, wants a quote  '), { ok: true })
    const row = (await db.from('inquiries').select('priority, follow_up_at, tags').eq('id', lead).single()).data
    assert.equal(row.priority, 'high')
    assert.equal(new Date(row.follow_up_at).toISOString(), '2026-10-01T09:00:00.000Z')
    assert.deepEqual([...row.tags].sort(), ['referral', 'vip'])
    const types = (await getInquiryEvents(lead)).map((e) => e.type).sort()
    assert.deepEqual(types, ['follow-up-set', 'note-added', 'priority-changed', 'tags-changed'])
    assert.equal((await getInquiryEvents(lead)).find((e) => e.type === 'note-added').note, 'Called back, wants a quote', 'note trimmed')
  })
  it('a blank note is refused', async () => {
    assert.deepEqual(await addInquiryNote(await newInquiry(), '   '), { ok: false, code: 'error' })
  })
  it('the first owner action, and only that, starts the SLA clock', async () => {
    const lead = await newInquiry()
    assert.equal(computeSla(new Date().toISOString(), await getInquiryEvents(lead), 'UTC').firstResponseAt, null)
    await transitionInquiryStage(lead, 'reviewed')
    const sla = computeSla(new Date(Date.now() - 1000).toISOString(), await getInquiryEvents(lead), 'UTC')
    assert.ok(sla.firstResponseAt)
  })
})

describe('CSV export', () => {
  it('is real columns only, escapes commas, quotes and newlines, and respects the stage filter', async () => {
    const hostile = 'He said "hi", then\nleft'
    const id = await newInquiry({ goal: hostile, name: 'Csv, Probe', stage: 'qualified' })
    const all = await exportInquiriesCsv({})
    assert.equal(all.ok, true)
    const header = all.csv.split('\r\n')[0]
    assert.equal(header, 'id,created_at,name,email,phone,stage,priority,follow_up_at,tags,service_slug,package_id,engagement_model_id,source_channel,preferred_channel,goal')
    const line = all.csv.split('\r\n').find((l) => l.startsWith(id))
    assert.ok(line.includes('"Csv, Probe"'))
    assert.ok(line.endsWith('"He said ""hi"", then\nleft"') || all.csv.includes('"He said ""hi"", then\nleft"'))
    const filtered = await exportInquiriesCsv({ stage: 'qualified' })
    assert.ok(filtered.csv.includes(id))
    const other = await exportInquiriesCsv({ stage: 'proposal' })
    assert.ok(!other.csv.includes(id))
  })
})
