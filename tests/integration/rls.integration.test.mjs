/**
 * Row Level Security, against the real database through the real PostgREST —
 * exactly what a visitor's browser could do with the public `anon` key
 * (roadmap § 12, § 22 "no policy = service only").
 *
 * The migrations grant anon/authenticated ALL privileges on every table (as
 * Supabase does), so RLS is the only thing standing between a visitor and the
 * leads table. This suite proves it holds.
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { EDITOR, OWNER } from '../support/stack/accounts.mjs'
import { anon, service, signedIn, sql, uuid } from '../support/stack-env.mjs'

const admin = service()
const visitor = anon()

const tables = sql(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1`).split('\n')

/** Tables a visitor may read (with a policy limiting WHICH rows). Adding a table here is a deliberate decision. */
const PUBLIC_READ = {
  articles: 'published articles are publicly readable',
  engagement_models: 'published engagement models are publicly readable',
  faqs: 'faqs are publicly readable',
  navigation_items: 'navigation items are publicly readable',
  project_media: 'media of published projects are publicly readable',
  project_sections: 'sections of published projects are publicly readable',
  project_technologies: 'technology links of published projects are publicly readable',
  projects: 'published projects are publicly readable',
  recommendations: 'approved recommendations are publicly readable',
  service_addons: 'add-ons of published services are publicly readable',
  service_packages: 'packages of published services are publicly readable',
  service_process_steps: 'process steps of published services are publicly readable',
  service_technologies: 'technology links of published services are publicly readable',
  services: 'published services are publicly readable',
  site_settings: 'site settings are publicly readable',
  technologies: 'technologies are publicly readable',
}
const PRIVATE = tables.filter((t) => !(t in PUBLIC_READ))

const ids = {}
before(async () => {
  // one inquiry with its children, so the private tables actually hold rows to (fail to) leak
  const inquiry = await admin.from('inquiries').insert({
    idempotency_key: uuid(), goal: 'RLS probe goal text', name: 'RLS Probe', email: 'rls-probe@example.com',
    preferred_locale: 'en', preferred_channel: 'email', consent: true,
  }).select('id').single()
  assert.ifError(inquiry.error)
  ids.inquiry = inquiry.data.id
  await admin.from('inquiry_events').insert({ inquiry_id: ids.inquiry, type: 'created', actor: 'system' })
  await admin.from('notification_outbox').insert({
    inquiry_id: ids.inquiry, kind: 'owner-alert', recipient_email: 'x@example.com', locale: 'en', subject: 's', body_text: 'b', dedupe_key: `rls-${uuid()}`,
  })
  await admin.from('audit_log').insert({ actor: 'rls-probe', action: 'test.rls', entity: 'probe' })
})
after(() => sql('truncate public.inquiries, public.audit_log restart identity cascade'))

describe('structure', () => {
  it('RLS is enabled on every table in the public schema', () => {
    const off = sql(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
    assert.equal(off, '', `RLS off on: ${off}`)
  })
  it('the set of tables with a public read policy is exactly the reviewed list', () => {
    const rows = sql(`select c.relname || '|' || p.polname || '|' || p.polcmd::text from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' order by 1`).split('\n')
    const found = Object.fromEntries(rows.map((r) => r.split('|')).map(([table, name]) => [table, name]))
    assert.deepEqual(found, PUBLIC_READ)
  })
  it('every public policy is SELECT-only, and only for anon/authenticated', () => {
    assert.equal(sql(`select count(*) from pg_policy p join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = p.polrelid) where n.nspname = 'public' and (p.polcmd <> 'r' or p.polroles <> array[(select oid from pg_roles where rolname = 'anon'), (select oid from pg_roles where rolname = 'authenticated')]::oid[] and p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated'), (select oid from pg_roles where rolname = 'anon')]::oid[])`), '0')
  })
  it('private tables are the ones that hold leads, credentials-adjacent and operational data', () => {
    for (const must of ['inquiries', 'inquiry_events', 'inquiry_attachments', 'consultations', 'notification_outbox', 'notification_attempts', 'admin_users', 'audit_log', 'recommendation_requests', 'media_assets', 'redirects']) {
      assert.ok(PRIVATE.includes(must), `${must} must be private`)
    }
  })
})

describe('a visitor cannot READ private tables', () => {
  for (const table of ['inquiries', 'inquiry_events', 'notification_outbox', 'audit_log', 'admin_users', 'consultations', 'recommendation_requests', 'media_assets']) {
    it(table, async () => {
      const seen = await visitor.from(table).select('*')
      assert.deepEqual(seen.data ?? [], [], `${table} leaked rows to anon`)
    })
  }
  it('the service role, by contrast, sees the seeded rows (the probe is real)', async () => {
    assert.ok((await admin.from('inquiries').select('id').eq('id', ids.inquiry)).data.length === 1)
    assert.ok((await admin.from('admin_users').select('id')).data.length >= 2)
  })
  it('the lead\'s e-mail cannot be found by filtering either', async () => {
    const seen = await visitor.from('inquiries').select('email').eq('email', 'rls-probe@example.com')
    assert.deepEqual(seen.data ?? [], [])
    const count = await visitor.from('inquiries').select('id', { count: 'exact', head: true })
    assert.equal(count.count ?? 0, 0)
  })
})

describe('a visitor cannot WRITE anywhere', () => {
  for (const table of tables) {
    it(`insert into ${table} is refused by RLS`, async () => {
      const result = await visitor.from(table).insert({})
      assert.ok(result.error, `${table}: anon insert was not refused`)
      assert.equal(result.error.code, '42501', `${table}: refused, but not by RLS (${result.error.code}: ${result.error.message})`)
    })
  }
  it('update and delete on a private row change nothing', async () => {
    const before = (await admin.from('inquiries').select('name, stage').eq('id', ids.inquiry).single()).data
    const upd = await visitor.from('inquiries').update({ name: 'HACKED' }).eq('id', ids.inquiry).select()
    const del = await visitor.from('inquiries').delete().eq('id', ids.inquiry).select()
    assert.deepEqual([upd.data ?? [], del.data ?? []], [[], []])
    assert.deepEqual((await admin.from('inquiries').select('name, stage').eq('id', ids.inquiry).single()).data, before)
  })
  it('update and delete on PUBLIC content change nothing either', async () => {
    const upd = await visitor.from('projects').update({ published: false }).eq('slug', 'transportation-system').select()
    const del = await visitor.from('services').delete().neq('slug', '').select()
    assert.deepEqual([upd.data ?? [], del.data ?? []], [[], []])
    assert.equal((await admin.from('projects').select('published').eq('slug', 'transportation-system').single()).data.published, true)
    assert.ok((await admin.from('services').select('id')).data.length > 0)
  })
})

describe('a SIGNED-IN admin using the public key is still just a visitor to the database', () => {
  // The app authorises admins in server code and then uses the service role;
  // the database itself must not treat "authenticated" as trusted.
  for (const account of [OWNER, EDITOR]) {
    it(`${account.role}: cannot read leads, outbox, audit log or admin list directly`, async () => {
      const client = await signedIn(account.email, account.password)
      for (const table of ['inquiries', 'notification_outbox', 'audit_log', 'admin_users', 'inquiry_events']) {
        assert.deepEqual((await client.from(table).select('*')).data ?? [], [], `${account.role} read ${table}`)
      }
      const write = await client.from('inquiries').insert({})
      assert.equal(write.error?.code, '42501')
    })
  }
})

describe('public content: only what is published', () => {
  const restore = []
  after(async () => {
    for (const fn of restore.reverse()) await fn()
  })
  const flip = async (table, match, patch, back) => {
    const { error } = await admin.from(table).update(patch).match(match)
    assert.ifError(error)
    restore.push(async () => void (await admin.from(table).update(back).match(match)))
  }

  it('an unpublished project disappears — with its sections and technology links', async () => {
    const { data: project } = await admin.from('projects').select('id').eq('slug', 'pazhuhesh-portal').single()
    assert.ok((await visitor.from('project_sections').select('id').eq('project_id', project.id)).data.length > 0, 'precondition: visible while published')
    await flip('projects', { slug: 'pazhuhesh-portal' }, { published: false }, { published: true })
    assert.deepEqual((await visitor.from('projects').select('slug').eq('slug', 'pazhuhesh-portal')).data, [])
    assert.deepEqual((await visitor.from('project_sections').select('id').eq('project_id', project.id)).data, [])
    assert.deepEqual((await visitor.from('project_technologies').select('project_id').eq('project_id', project.id)).data, [])
    // …and the other, still-published project is unaffected
    assert.equal((await visitor.from('projects').select('slug').eq('slug', 'transportation-system')).data.length, 1)
  })

  it('an unpublished service disappears — with its packages, add-ons, steps and FAQs', async () => {
    const { data: svc } = await admin.from('services').select('id, slug').eq('slug', 'admin-dashboards').single()
    const child = async (table) => (await visitor.from(table).select('*').eq('service_id', svc.id)).data ?? []
    for (const table of ['service_packages', 'service_addons', 'service_process_steps', 'faqs']) {
      assert.ok((await child(table)).length > 0, `precondition: ${table} visible while the service is published`)
    }
    await flip('services', { id: svc.id }, { published: false }, { published: true })
    assert.deepEqual((await visitor.from('services').select('id').eq('id', svc.id)).data, [])
    for (const table of ['service_packages', 'service_addons', 'service_process_steps', 'service_technologies']) {
      assert.deepEqual(await child(table), [], `${table} of an unpublished service is public`)
    }
    assert.deepEqual(await child('faqs'), [], 'per-service FAQs of an unpublished service are public')
  })

  it('an article is public only while its status is "published" (draft, review, scheduled, archived are not)', async () => {
    for (const status of ['draft', 'review', 'scheduled', 'archived']) {
      await flip('articles', { slug: 'e2e-fixture-article' }, { status }, { status: 'published' })
      assert.deepEqual((await visitor.from('articles').select('slug').eq('slug', 'e2e-fixture-article')).data, [], status)
      await admin.from('articles').update({ status: 'published' }).eq('slug', 'e2e-fixture-article')
    }
    assert.equal((await visitor.from('articles').select('slug').eq('slug', 'e2e-fixture-article')).data.length, 1)
  })

  it('a recommendation is public only once approved', async () => {
    const created = await admin.from('recommendations').insert({ person_name: 'RLS Probe', relationship: 'client', statement: { en: 'x', fa: 'ی' }, status: 'pending' }).select('id').single()
    assert.ifError(created.error)
    restore.push(async () => void (await admin.from('recommendations').delete().eq('id', created.data.id)))
    for (const status of ['pending', 'changes-requested', 'rejected']) {
      await admin.from('recommendations').update({ status }).eq('id', created.data.id)
      assert.deepEqual((await visitor.from('recommendations').select('id').eq('id', created.data.id)).data, [], status)
    }
    await admin.from('recommendations').update({ status: 'approved' }).eq('id', created.data.id)
    assert.equal((await visitor.from('recommendations').select('id').eq('id', created.data.id)).data.length, 1)
  })

  it('the recommender\'s private link record is never public, even for an approved recommendation', async () => {
    assert.deepEqual((await visitor.from('recommendation_requests').select('*')).data ?? [], [])
  })
})

describe('functions', () => {
  it('claim_notification_outbox is callable by the server only', async () => {
    const args = { p_ids: null, p_limit: 1, p_lease_seconds: 30 }
    const ok = await admin.rpc('claim_notification_outbox', args)
    assert.ifError(ok.error)
    for (const [who, client] of [['anon', visitor], ['authenticated', await signedIn(OWNER.email, OWNER.password)]]) {
      const denied = await client.rpc('claim_notification_outbox', args)
      assert.ok(denied.error, `${who} may call claim_notification_outbox`)
      assert.equal(denied.error.code, '42501', `${who}: ${denied.error.code} ${denied.error.message}`)
    }
  })
})
