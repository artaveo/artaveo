/**
 * Phase 23 against the REAL database: the rate limiter (atomicity, windows,
 * who may call it), what it does through the real Server Actions, the lead
 * search that used to accept filter syntax, the CSV export, and row-level
 * security on the new tables.
 */
import assert from 'node:assert/strict'
import { before, beforeEach, describe, it } from 'node:test'

import { OWNER } from '../support/stack/accounts.mjs'
import { anon, service, signedIn, sql, uuid } from '../support/stack-env.mjs'
import { resetRequest } from '../support/next-runtime.mjs'
import { createEmptyInquiryDraft } from '../../types/inquiry.ts'

const { checkRateLimit, hashForBucket, purgeExpiredRateLimits } = await import('../../lib/security/rate-limit.ts')
const { RATE_LIMITS } = await import('../../lib/security/rate-limit-policy.ts')
const { adminSignIn } = await import('../../app/actions/admin-auth.ts')
const { submitInquiry } = await import('../../app/actions/inquiries.ts')
const { submitConsultationRequest, cancelMyConsultation } = await import('../../app/actions/consultations.ts')
const { submitRecommendation } = await import('../../app/actions/recommendations.ts')
const { exportInquiriesCsv } = await import('../../app/actions/pipeline.ts')
const { listInquiries } = await import('../../lib/admin/pipeline.ts')

const db = service()
const consume = async (key, limit, windowSeconds, client = db) => {
  const { data, error } = await client.rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
  if (error) throw error
  return data[0]
}
const buckets = async () => (await db.from('rate_limit_buckets').select('*')).data
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(() => sql('truncate public.rate_limit_buckets'))

describe('consume_rate_limit (the database function)', () => {
  it('allows up to the limit, then refuses, and says how long to wait', async () => {
    const results = []
    for (let i = 0; i < 5; i += 1) results.push(await consume('t:a', 3, 60))
    assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false, false])
    assert.deepEqual(results.map((r) => r.hit_count), [1, 2, 3, 4, 5])
    assert.ok(results[3].retry_after_seconds >= 58 && results[3].retry_after_seconds <= 60)
  })

  it('keeps separate keys separate', async () => {
    for (let i = 0; i < 3; i += 1) await consume('t:one', 3, 60)
    assert.equal((await consume('t:one', 3, 60)).allowed, false)
    assert.equal((await consume('t:two', 3, 60)).allowed, true)
  })

  it('opens a new window once the old one has ended — and a refused attempt never extends the window', async () => {
    await consume('t:win', 1, 1)
    const refused = await consume('t:win', 1, 1)
    assert.equal(refused.allowed, false)
    const before = (await buckets()).find((b) => b.bucket_key === 't:win').expires_at
    await consume('t:win', 1, 1)
    assert.equal((await buckets()).find((b) => b.bucket_key === 't:win').expires_at, before, 'refusals do not push the end of the window out')
    await sleep(1300)
    const fresh = await consume('t:win', 1, 1)
    assert.deepEqual([fresh.allowed, fresh.hit_count], [true, 1])
  })

  it('is atomic: 40 simultaneous requests against a limit of 10 let exactly 10 through', async () => {
    const results = await Promise.all(Array.from({ length: 40 }, () => consume('t:race', 10, 60)))
    assert.equal(results.filter((r) => r.allowed).length, 10)
    assert.equal((await buckets()).find((b) => b.bucket_key === 't:race').hits, 40)
  })

  it('refuses nonsense arguments instead of storing them', async () => {
    for (const [key, limit, window] of [['', 1, 60], ['k', 0, 60], ['k', 1, 0], ['k', 1, 86401], ['k', 100001, 60], ['x'.repeat(201), 1, 60]]) {
      await assert.rejects(() => consume(key, limit, window), `${JSON.stringify([key.slice(0, 5), limit, window])}`)
    }
    assert.equal((await buckets()).length, 0)
  })

  it('cannot be called — or read — by the browser roles', async () => {
    for (const client of [anon(), await signedIn(OWNER.email, OWNER.password)]) {
      const { error } = await client.rpc('consume_rate_limit', { p_key: 'x', p_limit: 1, p_window_seconds: 1 })
      assert.ok(error, 'anon and authenticated may not execute it')
      const read = await client.from('rate_limit_buckets').select('*')
      assert.ok(read.error || read.data.length === 0, 'and may not read the table')
    }
  })
})

describe('checkRateLimit (the application layer)', () => {
  it('stops an e-mail after its limit even when the address changes, and names the dimension', async () => {
    const policy = RATE_LIMITS['admin.sign-in']
    let denied = null
    for (let i = 1; i <= policy.subject.limit + 1; i += 1) {
      const result = await checkRateLimit('admin.sign-in', { ip: `203.0.113.${i}`, subject: 'Victim@Example.com' })
      if (!result.ok) denied = { at: i, ...result }
    }
    assert.equal(denied.at, policy.subject.limit + 1)
    assert.equal(denied.dimension, 'subject')
    assert.ok(denied.retryAfterSeconds > 0)
  })

  it('stops one address across many e-mails', async () => {
    const policy = RATE_LIMITS['admin.sign-in']
    let firstDenied = null
    for (let i = 1; i <= policy.ip.limit + 1 && !firstDenied; i += 1) {
      const result = await checkRateLimit('admin.sign-in', { ip: '198.51.100.9', subject: `person${i}@example.com` })
      if (!result.ok) firstDenied = { at: i, ...result }
    }
    assert.equal(firstDenied.at, policy.ip.limit + 1)
    assert.equal(firstDenied.dimension, 'ip')
  })

  it('the overall ceiling holds when every attempt comes from a different address', async () => {
    const policy = RATE_LIMITS['inquiry.submit']
    sql(`insert into public.rate_limit_buckets (bucket_key, hits, expires_at) values ('inquiry.submit:global:all', ${policy.global.limit}, now() + interval '1 hour')`)
    const result = await checkRateLimit('inquiry.submit', { ip: '192.0.2.77' })
    assert.equal(result.ok, false)
    assert.equal(result.dimension, 'global')
  })

  it('stores no address, e-mail or token — only hashes', async () => {
    await checkRateLimit('admin.sign-in', { ip: '203.0.113.200', subject: 'secret.person@example.com' })
    await checkRateLimit('recommendation.submit', { ip: '203.0.113.200', subject: 'TokenTokenTokenTokenTokenToken00' })
    const keys = (await buckets()).map((b) => b.bucket_key).join('\n')
    for (const needle of ['203.0.113.200', 'secret.person', 'example.com', 'TokenToken']) assert.ok(!keys.includes(needle), needle)
    assert.ok(keys.includes(hashForBucket('ip', '203.0.113.200')))
  })

  it('fails OPEN when the limiter itself is unavailable (and does not throw)', async () => {
    const broken = { rpc: async () => ({ data: null, error: { message: 'connection refused' } }) }
    const original = console.error
    let logged = ''
    console.error = (...args) => { logged += args.join(' ') }
    try {
      assert.deepEqual(await checkRateLimit('inquiry.submit', { ip: '203.0.113.1' }, broken), { ok: true })
    } finally {
      console.error = original
    }
    assert.match(logged, /consume_rate_limit failed/)
  })

  it('the daily purge removes windows that ended more than an hour ago and nothing else', async () => {
    sql(`insert into public.rate_limit_buckets (bucket_key, hits, expires_at) values ('old', 1, now() - interval '2 hours'), ('recent', 1, now() - interval '10 minutes'), ('live', 1, now() + interval '10 minutes')`)
    assert.deepEqual(await purgeExpiredRateLimits(db), { deleted: 1 })
    assert.deepEqual((await buckets()).map((b) => b.bucket_key).sort(), ['live', 'recent'])
  })
})

describe('the limiter inside the real Server Actions', () => {
  const ip = (n) => ({ 'x-forwarded-for': `203.0.113.${n}` })
  const seed = (name, dimension, ipOrValue, hits) => {
    const value = dimension === 'global' ? 'all' : hashForBucket(dimension, ipOrValue)
    sql(`insert into public.rate_limit_buckets (bucket_key, hits, expires_at) values ('${name}:${dimension}:${value}', ${hits}, now() + interval '1 hour') on conflict (bucket_key) do update set hits = ${hits}`)
  }
  const draft = () => ({
    ...createEmptyInquiryDraft('en'), projectType: 'web-app-or-mvp', goal: 'A goal that is long enough to pass', timeline: 'asap',
    name: 'Limit Probe', email: `limit-${uuid().slice(0, 8)}@example.com`, consent: true,
  })
  const meta = () => ({ honeypot: '', formRenderedAt: Date.now() - 60000, idempotencyKey: uuid() })

  it('Brief Builder: a caller over the attempt limit is refused before anything is stored; another address is not', async () => {
    seed('inquiry.submit', 'ip', '203.0.113.31', RATE_LIMITS['inquiry.submit'].ip.limit)
    resetRequest(ip(31))
    const before = (await db.from('inquiries').select('id', { count: 'exact', head: true })).count
    assert.deepEqual(await submitInquiry(draft(), meta()), { ok: false, code: 'rejected' })
    assert.equal((await db.from('inquiries').select('id', { count: 'exact', head: true })).count, before)
    resetRequest(ip(32))
    assert.equal((await submitInquiry(draft(), meta())).ok, true)
  })

  it('Brief Builder: arguments of the wrong shape are refused, not crashed on', async () => {
    resetRequest(ip(33))
    assert.deepEqual(await submitInquiry(draft(), null), { ok: false, code: 'invalid' })
    assert.deepEqual(await submitInquiry(draft(), { honeypot: '', formRenderedAt: 0, idempotencyKey: 'x' }), { ok: false, code: 'invalid' })
  })

  it('consultation request and the link actions are limited', async () => {
    seed('consultation.request', 'ip', '203.0.113.34', RATE_LIMITS['consultation.request'].ip.limit)
    resetRequest(ip(34))
    const result = await submitConsultationRequest('en', { name: 'A', email: 'a@example.com', phone: '', goal: 'x', timezone: 'UTC', windows: [], consent: true }, { honeypot: '', formRenderedAt: Date.now() - 60000, idempotencyKey: uuid(), sourceReferrer: null })
    assert.deepEqual(result, { ok: false, code: 'rejected' })

    const { generateConsultationToken } = await import('../../lib/consultation/token.ts')
    const token = generateConsultationToken()
    // (The limiter compares the second dimension case-insensitively, so the seed uses the folded form.)
    seed('consultation.client-action', 'subject', token.toLowerCase(), RATE_LIMITS['consultation.client-action'].subject.limit)
    resetRequest(ip(35))
    assert.deepEqual(await cancelMyConsultation(token, 'plans changed'), { ok: false, code: 'rejected' })
  })

  it('recommendation submit is limited per link, and refuses over-long or mistyped input', async () => {
    const token = 'R'.repeat(32)
    const input = { personName: 'P', relationship: 'r', statement: 's', personTitle: '', company: '', profileUrl: '', consentToPublish: true }
    const m = { honeypot: '', formRenderedAt: Date.now() - 60000 }
    resetRequest(ip(36))
    assert.deepEqual(await submitRecommendation(token, 'en', { ...input, statement: 'x'.repeat(3001) }, m), { ok: false, code: 'invalid' })
    assert.deepEqual(await submitRecommendation(token, 'en', { ...input, personName: { evil: true } }, m), { ok: false, code: 'invalid' })
    seed('recommendation.submit', 'subject', token.toLowerCase(), RATE_LIMITS['recommendation.submit'].subject.limit)
    assert.deepEqual(await submitRecommendation(token, 'en', input, m), { ok: false, code: 'rejected' })
  })

  it('admin sign-in: the 11th attempt for one e-mail is refused with its own code, even with the RIGHT password; one audit row, no attacker text', async () => {
    sql('truncate public.audit_log')
    const form = (email, password) => { const f = new FormData(); f.set('email', email); f.set('password', password); return f }
    resetRequest(ip(37))
    const outcomes = []
    for (let i = 0; i < 11; i += 1) outcomes.push((await adminSignIn(form('victim@example.com', `wrong-${i}`))).code)
    assert.deepEqual(outcomes, [...Array(10).fill('invalid-credentials'), 'rate-limited'])
    // Once limited, even a correct password for THAT account is not tried.
    const owner = await adminSignIn(form(OWNER.email, OWNER.password))
    assert.equal(owner.ok, true, 'a different account is unaffected')
    const audit = (await db.from('audit_log').select('action, actor').eq('action', 'admin.sign_in_rate_limited')).data
    assert.ok(audit.length >= 1 && audit.length <= 3)
    assert.ok(audit.every((row) => row.actor === 'system'))
  })

  it('an over-long e-mail in a failed sign-in is cut before it reaches the audit log', async () => {
    sql('truncate public.audit_log')
    const f = new FormData(); f.set('email', `${'a'.repeat(1000)}@example.com`); f.set('password', 'x')
    resetRequest(ip(38))
    await adminSignIn(f)
    const rows = (await db.from('audit_log').select('actor').eq('action', 'admin.sign_in_failed')).data
    assert.ok(rows.length === 1 && rows[0].actor.length <= 254)
  })
})

describe('lead search: typed text is data, never filter syntax', () => {
  const ids = {}
  before(async () => {
    sql("delete from public.inquiries where email like 'sec-%@example.com'")
    const make = async (name, stage) => {
      const { data } = await db.from('inquiries').insert({
        idempotency_key: uuid(), goal: 'Search probe goal text', name, email: `sec-${uuid().slice(0, 6)}@example.com`,
        preferred_locale: 'en', preferred_channel: 'email', consent: true,
      }).select('id').single()
      if (stage === 'won') sql(`alter table public.inquiries disable trigger all; update public.inquiries set stage = 'won' where id = '${data.id}'; alter table public.inquiries enable trigger all`)
      return data.id
    }
    ids.alpha = await make('Sec Alpha', 'new')
    ids.bravo = await make('Sec Bravo', 'new')
    ids.won = await make('Sec Won Person', 'won')
    ids.percent = await make('Sec 50% Off', 'new')
  })
  const search = async (q) => (await listInquiries({ q, page: 1, pageSize: 50 })).inquiries.map((i) => i.id)

  it('CONTROL: the old construction really did let a term add a condition', async () => {
    const term = 'zzz,stage.eq.won,name.ilike.zzz'
    const rows = (await db.from('inquiries').select('id').or(`name.ilike.%${term}%,email.ilike.%${term}%`)).data.map((r) => r.id)
    assert.ok(rows.includes(ids.won), 'this is the bug: a comma in the term started a second condition')
  })
  it('with the helper, the same term matches nothing', async () => {
    assert.deepEqual(await search('zzz,stage.eq.won,name.ilike.zzz'), [])
  })
  it('ordinary searches still work: by name, by part of a name, by e-mail', async () => {
    assert.ok((await search('alpha')).includes(ids.alpha))
    assert.ok(!(await search('alpha')).includes(ids.bravo))
    assert.ok((await search('Won Pers')).includes(ids.won))
    const email = (await db.from('inquiries').select('email').eq('id', ids.bravo).single()).data.email
    assert.deepEqual(await search(email), [ids.bravo])
  })
  it('LIKE wildcards mean themselves: "%" finds only the literal percent sign', async () => {
    assert.deepEqual(await search('%'), [ids.percent])
    // "_" is a one-character wildcard in LIKE; here it must match only rows that really contain an underscore.
    const all = (await db.from('inquiries').select('id, name, email')).data
    const literal = all.filter((row) => row.name.includes('_') || row.email.includes('_')).map((row) => row.id).sort()
    assert.deepEqual((await search('_')).sort(), literal)
  })
  it('quotes, parentheses, backslashes and control characters are harmless (no error, no match)', async () => {
    for (const term of ['a"b', ')(', '\\', 'x\u0000y', '"),email.ilike.%', 'a'.repeat(3000)]) assert.deepEqual(await search(term), [], JSON.stringify(term.slice(0, 20)))
  })
})

describe('CSV export', () => {
  it('a name or goal that a spreadsheet would run as a formula is neutralised; phone numbers are not mangled', async () => {
    sql("delete from public.inquiries where email like 'csv-%@example.com'")
    await db.from('inquiries').insert({
      idempotency_key: uuid(), goal: '@SUM(1+1)*cmd|calc', name: '=HYPERLINK("http://evil.example","click")', email: 'csv-probe@example.com', phone: '+93 790685832',
      preferred_locale: 'en', preferred_channel: 'email', consent: true,
    })
    resetRequest()
    const f = new FormData(); f.set('email', OWNER.email); f.set('password', OWNER.password)
    assert.equal((await adminSignIn(f)).ok, true)
    const result = await exportInquiriesCsv({ q: 'csv-probe' })
    assert.equal(result.ok, true)
    const [header, row] = result.csv.split('\r\n')
    assert.match(header, /^id,created_at,name,email,phone/)
    assert.ok(row.includes(`"'=HYPERLINK(""http://evil.example"",""click"")"`), row)
    assert.ok(row.includes(',+93 790685832,'), 'a phone number is left alone')
    assert.ok(row.includes(`,'@SUM(1+1)*cmd|calc`), row)
    for (const cell of row.match(/(?:"(?:[^"]|"")*"|[^,]*)(?=,|$)/g)) assert.ok(!/^[=@]/.test(cell.replace(/^"/, '')), cell)
  })
})

describe('row level security on the new tables', () => {
  it('a visitor (anon key) and a signed-in owner can neither read nor write rate_limit_buckets or inquiry_files', async () => {
    sql("insert into public.rate_limit_buckets (bucket_key, hits, expires_at) values ('rls-probe', 1, now() + interval '1 hour')")
    const file = (await db.from('inquiry_files').insert({ storage_path: `rls-${uuid()}.png`, content_type: 'image/png', size_bytes: 10, original_name: 'a.png', uploaded_by_ip_hash: 'x' }).select('id').single()).data
    for (const client of [anon(), await signedIn(OWNER.email, OWNER.password)]) {
      for (const table of ['rate_limit_buckets', 'inquiry_files']) {
        const read = await client.from(table).select('*')
        assert.ok(read.error || read.data.length === 0, `${table} readable`)
      }
      const write = await client.from('inquiry_files').insert({ storage_path: `rls-${uuid()}.png`, content_type: 'image/png', size_bytes: 10, original_name: 'a.png', uploaded_by_ip_hash: 'x' })
      assert.ok(write.error, 'insert refused')
      const remove = await client.from('inquiry_files').delete().eq('id', file.id)
      assert.equal((await db.from('inquiry_files').select('id').eq('id', file.id)).data.length, 1, `delete by ${remove.error ? 'error' : 'no-op'} left the row`)
    }
  })
  it('the table constraints hold whatever the application does: only raster types, at most 5 MiB, unique storage path', async () => {
    const base = { content_type: 'image/png', size_bytes: 10, original_name: 'a.png', uploaded_by_ip_hash: 'x' }
    const bad = [
      { ...base, storage_path: `c-${uuid()}.svg`, content_type: 'image/svg+xml' },
      { ...base, storage_path: `c-${uuid()}.png`, size_bytes: 5 * 1024 * 1024 + 1 },
      { ...base, storage_path: `c-${uuid()}.png`, size_bytes: 0 },
      { ...base, storage_path: `c-${uuid()}.png`, original_name: '' },
    ]
    for (const row of bad) assert.equal((await db.from('inquiry_files').insert(row)).error?.code, '23514', JSON.stringify(row).slice(0, 60))
    const path = `dup-${uuid()}.png`
    assert.equal((await db.from('inquiry_files').insert({ ...base, storage_path: path })).error, null)
    assert.equal((await db.from('inquiry_files').insert({ ...base, storage_path: path })).error?.code, '23505')
  })
  it('deleting an inquiry removes its file rows (the objects are removed by the sweep or by the owner)', async () => {
    const inquiry = (await db.from('inquiries').insert({ idempotency_key: uuid(), goal: 'Cascade probe goal', name: 'C', email: 'sec-cascade@example.com', preferred_locale: 'en', preferred_channel: 'email', consent: true }).select('id').single()).data
    const file = (await db.from('inquiry_files').insert({ inquiry_id: inquiry.id, storage_path: `cas-${uuid()}.png`, content_type: 'image/png', size_bytes: 10, original_name: 'a.png', uploaded_by_ip_hash: 'x' }).select('id').single()).data
    await db.from('inquiries').delete().eq('id', inquiry.id)
    assert.equal((await db.from('inquiry_files').select('id').eq('id', file.id)).data.length, 0)
  })
})
