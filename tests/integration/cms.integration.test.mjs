/**
 * CMS mutations and uploads through the REAL server actions and selectors,
 * against the real database (roadmap § 15, Phase 17). Publishing is the
 * high-risk path: a page goes public only when both languages are complete,
 * and every publish revalidates the routes, writes an audit row and tells the owner.
 *
 * Storage is the stand-in from tests/support/stack/gateway.mjs: what is
 * verified is that the app sends, records and removes the right objects — not
 * Supabase Storage's own bucket limits or policies.
 */
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { EDITOR } from '../support/stack/accounts.mjs'
import { anon, service, sql, stackUrl, uuid } from '../support/stack-env.mjs'
import { clearRevalidated, resetRequest, revalidated } from '../support/next-runtime.mjs'
import { createEmptyInquiryDraft } from '../../types/inquiry.ts'
import { hashIp } from '../../lib/request-ip.ts'

const { adminSignIn } = await import('../../app/actions/admin-auth.ts')
const content = await import('../../app/actions/content.ts')
const media = await import('../../app/actions/media.ts')
const { uploadInquiryAttachment, removeInquiryAttachment } = await import('../../app/actions/inquiry-attachments.ts')
const { submitInquiry } = await import('../../app/actions/inquiries.ts')
const { queryProjectBySlug, queryAllProjects } = await import('../../lib/supabase/content-queries.ts')
const { hasPublishedArticles, getPublishedArticles } = await import('../../lib/insights.ts')
const { publishDueArticles } = await import('../../lib/insights-scheduler.ts')

const db = service()
const visitor = anon()
const login = async (account) => {
  resetRequest()
  const f = new FormData()
  f.set('email', account.email)
  f.set('password', account.password)
  assert.equal((await adminSignIn(f)).ok, true)
}
const tx = (en, fa = `${en}-fa`) => ({ en, fa })
const slug = () => `it-${uuid().slice(0, 8)}`
const project = (extra = {}) => ({
  slug: slug(), title: tx('Probe project'), category: tx('Web app'), summary: tx('A probe project for the suite'),
  highlights: [], status: undefined, coverImage: null, githubUrl: null, liveUrl: null, year: null, role: null,
  relatedServiceSlug: null, featured: false, technologyIds: [], ...extra,
})
const article = (extra = {}) => ({
  slug: slug(), title: tx('Probe article'), excerpt: tx('Excerpt'), body: tx('## Heading\n\nSome real text.'), category: null,
  status: 'draft', scheduledFor: null, projectIds: [], serviceIds: [], relatedArticleIds: [], ...extra,
})
const auditFor = async (entityId) => (await db.from('audit_log').select('action, actor').eq('entity_id', entityId).order('at')).data.map((r) => r.action)
const publicProject = async (s) => (await visitor.from('projects').select('slug').eq('slug', s)).data

// Runs are repeatable: rate limits are per hour and per address, so state from a
// previous run must not leak in, and this suite's rows must not stay in the database.
before(() => sql('truncate public.audit_log, public.notification_outbox, public.media_assets, public.inquiries cascade'))
after(() => sql(`delete from public.projects where slug like 'it-%'; delete from public.articles where slug like 'it-%'; truncate public.media_assets, public.inquiries cascade`))
beforeEach(() => clearRevalidated())

describe('projects: create → complete → publish → unpublish', () => {
  it('a new project is private, and the public selector cannot see it', async () => {
    await login(EDITOR)
    const input = project()
    const created = await content.createProject(input)
    assert.equal(created.ok, true)
    assert.equal((await db.from('projects').select('published').eq('id', created.id).single()).data.published, false)
    assert.deepEqual(await publicProject(input.slug), [])
    assert.equal(await queryProjectBySlug(input.slug), undefined)
    assert.deepEqual(await auditFor(created.id), ['content.project_created'])
  })

  it('publish is refused while either language is incomplete, and nothing changes', async () => {
    await login(EDITOR)
    const input = project({ summary: { en: 'English only', fa: '' } })
    const { id } = await content.createProject(input)
    assert.deepEqual(await content.publishProject(id), { ok: false, code: 'not-complete' })
    assert.equal((await db.from('projects').select('published').eq('id', id).single()).data.published, false)
    assert.deepEqual(await publicProject(input.slug), [])
    assert.ok(!(await auditFor(id)).includes('content.project_published'))
  })

  it('once complete: publish → public in both selectors, routes revalidated in both locales, audited, owner told', async () => {
    await login(EDITOR)
    const input = project({ summary: { en: 'English only', fa: '' } })
    const { id } = await content.createProject(input)
    assert.deepEqual(await content.updateProject(id, { ...input, summary: tx('A complete summary') }), { ok: true })
    clearRevalidated()
    assert.deepEqual(await content.publishProject(id), { ok: true })

    assert.equal((await publicProject(input.slug)).length, 1)
    const viaSelector = await queryProjectBySlug(input.slug)
    assert.equal(viaSelector.slug, input.slug)
    assert.equal(viaSelector.title.fa, 'Probe project-fa')
    assert.ok((await queryAllProjects()).some((p) => p.slug === input.slug))

    const paths = revalidated().map((r) => r.path)
    for (const expected of [`/en/work/${input.slug}`, `/fa/work/${input.slug}`, '/en/work', '/fa/work', '/en', '/fa']) {
      assert.ok(paths.includes(expected), `not revalidated: ${expected}`)
    }
    assert.ok((await auditFor(id)).includes('content.project_published'))
    const notice = (await db.from('notification_outbox').select('kind, subject, body_text').eq('entity_id', id)).data
    assert.equal(notice.length, 1)
    assert.equal(notice[0].kind, 'content-published')
    assert.ok(notice[0].body_text.includes(EDITOR.email), 'the notice names who pressed Publish')
  })

  it('unpublish hides it again and revalidates', async () => {
    await login(EDITOR)
    const input = project()
    const { id } = await content.createProject(input)
    await content.publishProject(id)
    clearRevalidated()
    assert.deepEqual(await content.unpublishProject(id), { ok: true })
    assert.deepEqual(await publicProject(input.slug), [])
    assert.ok(revalidated().some((r) => r.path === `/en/work/${input.slug}`))
  })

  it('a duplicate slug and an unsafe slug are refused', async () => {
    await login(EDITOR)
    const input = project()
    assert.equal((await content.createProject(input)).ok, true)
    assert.deepEqual(await content.createProject(input), { ok: false, code: 'duplicate-slug' })
    for (const bad of ['Bad Slug', 'UPPER', '../etc', 'a/b', '-lead', 'trail-', 'a--b', '', 'x'.repeat(97)]) {
      assert.deepEqual(await content.createProject(project({ slug: bad })), { ok: false, code: 'error' }, JSON.stringify(bad))
    }
  })

  it('case-study sections are replaced as a whole and reach the public selector', async () => {
    await login(EDITOR)
    const input = project()
    const { id } = await content.createProject(input)
    const sections = (extra = {}) => ({
      context: tx('Context text'), problemAndGoals: null, constraints: [tx('Constraint one'), tx('Constraint two')], architecture: null,
      keyDecisions: [{ context: tx('c'), decision: tx('d'), tradeoff: tx('t') }], engineeringHighlight: null, dataIntegrityAndSecurity: null,
      responsiveAndRtl: null, quality: null, currentStatusAndNext: null, lessonsLearned: null, ...extra,
    })
    assert.deepEqual(await content.updateProjectSections(id, sections()), { ok: true })
    await content.publishProject(id)
    let live = await queryProjectBySlug(input.slug)
    assert.equal(live.constraints.length, 2)
    assert.equal(live.keyDecisions.length, 1)
    // second save with fewer sections: nothing left over from the first
    assert.deepEqual(await content.updateProjectSections(id, sections({ constraints: [tx('Only one')], keyDecisions: [] })), { ok: true })
    live = await queryProjectBySlug(input.slug)
    assert.deepEqual([live.constraints.length, (live.keyDecisions ?? []).length], [1, 0], 'nothing left over from the first save')
    assert.equal((await db.from('project_sections').select('id', { count: 'exact', head: true }).eq('project_id', id)).count, 2)
  })

  it('an anonymous caller can neither create nor publish, and leaves no trace', async () => {
    resetRequest()
    const input = project()
    assert.deepEqual(await content.createProject(input), { ok: false, code: 'forbidden' })
    assert.equal((await db.from('projects').select('id').eq('slug', input.slug)).data.length, 0)
    await login(EDITOR)
    const { id } = await content.createProject(project())
    resetRequest()
    assert.deepEqual(await content.publishProject(id), { ok: false, code: 'forbidden' })
    assert.equal((await db.from('projects').select('published').eq('id', id).single()).data.published, false)
  })
})

describe('articles: the publish gates', () => {
  it('a draft is not public; an incomplete article, or one with an unresolved [PLACEHOLDER], cannot be published', async () => {
    await login(EDITOR)
    const half = await content.createArticle(article({ excerpt: { en: 'English only', fa: '' } }))
    assert.deepEqual(await content.publishArticle(half.id), { ok: false, code: 'not-complete' })
    const placeholder = await content.createArticle(article({ body: tx('## H\n\nThe client is [CLIENT_NAME] and it took [N_WEEKS] weeks.') }))
    assert.deepEqual(await content.publishArticle(placeholder.id), { ok: false, code: 'has-placeholder' })
    for (const id of [half.id, placeholder.id]) {
      assert.equal((await db.from('articles').select('status').eq('id', id).single()).data.status, 'draft')
    }
  })

  it('ordinary brackets are not placeholders: Markdown links and lowercase or numeric brackets publish fine', async () => {
    await login(EDITOR)
    const made = await content.createArticle(article({ body: tx('## H\n\nSee [the docs](https://example.com) and [1] and [note] for details.') }))
    assert.deepEqual(await content.publishArticle(made.id), { ok: true })
  })

  it('an article that links a media file which does not exist cannot be published', async () => {
    await login(EDITOR)
    const ghost = uuid()
    const made = await content.createArticle(article({ body: tx(`## H\n\n![diagram](media:${ghost})`) }))
    assert.deepEqual(await content.publishArticle(made.id), { ok: false, code: 'missing-image' })
    assert.equal((await db.from('articles').select('status').eq('id', made.id).single()).data.status, 'draft')
  })

  it('publish → public with a date; archive hides it; the journal appears only while something is published', async () => {
    await login(EDITOR)
    const input = article()
    const { id } = await content.createArticle(input)
    assert.deepEqual(await content.publishArticle(id), { ok: true })
    const row = (await db.from('articles').select('status, published_at').eq('id', id).single()).data
    assert.equal(row.status, 'published')
    assert.ok(row.published_at)
    assert.ok((await getPublishedArticles()).some((a) => a.slug === input.slug))
    assert.equal(await hasPublishedArticles(), true)
    assert.deepEqual(await content.archiveArticle(id), { ok: true })
    assert.deepEqual((await visitor.from('articles').select('slug').eq('slug', input.slug)).data, [])
  })

  it('REGRESSION (Phase 17): saving a published article through the form does not silently unpublish it', async () => {
    await login(EDITOR)
    const input = article()
    const { id } = await content.createArticle(input)
    await content.publishArticle(id)
    assert.deepEqual(await content.updateArticle(id, { ...input, title: tx('Typo fixed'), status: 'draft' }), { ok: true })
    const row = (await db.from('articles').select('status, title').eq('id', id).single()).data
    assert.equal(row.status, 'published')
    assert.equal(row.title.en, 'Typo fixed')
  })

  it('scheduling: a past date is refused; a due scheduled article goes live in the sweep and a future one does not', async () => {
    await login(EDITOR)
    assert.deepEqual(await content.createArticle(article({ status: 'scheduled', scheduledFor: '2020-01-01' })), { ok: false, code: 'invalid-schedule' })
    assert.deepEqual(await content.createArticle(article({ status: 'scheduled', scheduledFor: null })), { ok: false, code: 'invalid-schedule' })

    const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10)
    const due = await content.createArticle(article({ status: 'scheduled', scheduledFor: tomorrow }))
    const later = await content.createArticle(article({ status: 'scheduled', scheduledFor: tomorrow }))
    assert.equal(due.ok && later.ok, true)
    await db.from('articles').update({ published_at: new Date(Date.now() - 3600 * 1000).toISOString() }).eq('id', due.id)

    const swept = await publishDueArticles(db)
    assert.equal(swept.published, 1)
    assert.equal((await db.from('articles').select('status').eq('id', due.id).single()).data.status, 'published')
    assert.equal((await db.from('articles').select('status').eq('id', later.id).single()).data.status, 'scheduled')
    assert.equal((await publishDueArticles(db)).published, 0, 'a second sweep finds nothing: idempotent')
  })
})

describe('uploads', () => {
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  const upload = (over = {}) => {
    const f = new FormData()
    f.set('file', over.file ?? new File([PNG], over.name ?? 'Diagram One.PNG', { type: over.type ?? 'image/png' }))
    if (over.altEn !== null) f.set('altEn', over.altEn ?? 'A diagram')
    if (over.altFa !== null) f.set('altFa', over.altFa ?? 'یک نمودار')
    if (over.focalX !== undefined) f.set('focalX', String(over.focalX))
    if (over.focalY !== undefined) f.set('focalY', String(over.focalY))
    return f
  }
  const stored = async () => (await (await fetch(`${stackUrl}/_test/storage`)).json()).objects
  const mediaCount = async () => (await db.from('media_assets').select('id', { count: 'exact', head: true })).count

  it('admin upload: stored under a safe generated name, recorded with bilingual alt and a clamped focal point, audited', async () => {
    await login(EDITOR)
    const result = await media.uploadMedia(upload({ focalX: 7, focalY: -3 }))
    assert.equal(result.ok, true)
    const row = (await db.from('media_assets').select('*').eq('id', result.id).single()).data
    assert.deepEqual(row.alt, { en: 'A diagram', fa: 'یک نمودار' })
    assert.deepEqual([row.focal_x, row.focal_y], [1, 0])
    assert.equal(row.type, 'image/png')
    assert.equal(row.size_bytes, PNG.length)
    assert.match(row.url, /\/media\/[a-z0-9]+-[a-z0-9]+-diagram-one\.png$/)
    const objects = await stored()
    assert.ok(objects.some((o) => result.url.endsWith(o.key.replace('media/', '')) && o.bytes === PNG.length))
    assert.ok((await auditFor(result.id)).includes('content.media_uploaded'))
    const served = await fetch(result.url)
    assert.equal(served.status, 200)
    assert.equal(Buffer.compare(Buffer.from(await served.arrayBuffer()), PNG), 0)
  })

  it('refusals store nothing and write no row: alt text missing, wrong type, too large, wrong caller', async () => {
    await login(EDITOR)
    const before = [await mediaCount(), (await stored()).length]
    assert.deepEqual(await media.uploadMedia(upload({ altFa: '' })), { ok: false, code: 'missing-alt' })
    assert.deepEqual(await media.uploadMedia(upload({ altEn: null })), { ok: false, code: 'missing-alt' })
    assert.deepEqual(await media.uploadMedia(upload({ type: 'text/html', name: 'x.png', file: new File(['<script>alert(1)</script>'], 'x.png', { type: 'text/html' }) })), { ok: false, code: 'invalid-type' })
    assert.deepEqual(await media.uploadMedia(upload({ file: new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }) })), { ok: false, code: 'invalid-type' })
    assert.deepEqual(await media.uploadMedia(upload({ file: new File([Buffer.alloc(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }) })), { ok: false, code: 'too-large' })
    resetRequest()
    assert.deepEqual(await media.uploadMedia(upload()), { ok: false, code: 'forbidden' })
    assert.deepEqual([await mediaCount(), (await stored()).length], before)
  })

  it('exactly 5 MiB is accepted (the limit is inclusive)', async () => {
    await login(EDITOR)
    const result = await media.uploadMedia(upload({ file: new File([Buffer.alloc(5 * 1024 * 1024)], 'edge.png', { type: 'image/png' }) }))
    assert.equal(result.ok, true)
  })

  it('deleting a library file removes the row and the stored object', async () => {
    await login(EDITOR)
    const { id, url } = await media.uploadMedia(upload({ name: 'to-delete.png' }))
    assert.deepEqual(await media.deleteMedia(id), { ok: true })
    assert.equal((await db.from('media_assets').select('id').eq('id', id)).data.length, 0)
    assert.equal((await fetch(url)).status, 404)
  })

  describe('public Brief Builder attachments', () => {
    const attach = (over) => uploadInquiryAttachment(upload({ altEn: null, altFa: null, ...over }))
    const ipHeaders = (n) => ({ 'x-forwarded-for': `198.51.100.${n}` })

    it('needs no login, records only the IP hash, and rejects the same bad types and sizes', async () => {
      resetRequest(ipHeaders(1))
      const ok = await attach({})
      assert.equal(ok.ok, true)
      const row = (await db.from('media_assets').select('uploaded_by_ip_hash, alt').eq('id', ok.mediaId).single()).data
      assert.equal(row.uploaded_by_ip_hash, hashIp('198.51.100.1'), 'same hash as the inquiry rate limit uses — the two code paths must not drift')
      assert.equal(row.alt, null)
      assert.deepEqual(await attach({ file: new File(['x'], 'a.exe', { type: 'application/x-msdownload' }) }), { ok: false, code: 'invalid-type' })
      assert.deepEqual(await attach({ file: new File([Buffer.alloc(5 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' }) }), { ok: false, code: 'too-large' })
    })

    it('is capped at 15 files per address per hour; another address is unaffected', async () => {
      resetRequest(ipHeaders(2))
      const outcomes = []
      for (let i = 0; i < 16; i += 1) outcomes.push((await attach({ name: `f${i}.png` })).ok)
      assert.deepEqual(outcomes, [...Array(15).fill(true), false])
      resetRequest(ipHeaders(3))
      assert.equal((await attach({})).ok, true)
    })

    it('an uploader can remove only its own, still-unlinked file', async () => {
      resetRequest(ipHeaders(4))
      const mine = await attach({ name: 'mine.png' })
      resetRequest(ipHeaders(5))
      assert.deepEqual(await removeInquiryAttachment(mine.mediaId), { ok: false }, 'someone else cannot delete it')
      resetRequest(ipHeaders(4))
      assert.deepEqual(await removeInquiryAttachment(mine.mediaId), { ok: true })
      assert.equal((await db.from('media_assets').select('id').eq('id', mine.mediaId)).data.length, 0)
    })

    it('once linked to an inquiry a file can no longer be removed by the visitor; the inquiry links at most 3', async () => {
      resetRequest(ipHeaders(6))
      const uploaded = []
      for (let i = 0; i < 4; i += 1) uploaded.push((await attach({ name: `a${i}.png` })).mediaId)
      const draft = {
        ...createEmptyInquiryDraft('en'), projectType: 'web-app-or-mvp', goal: 'Attachment probe goal text', timeline: 'asap',
        name: 'Attach Probe', email: `att-${uuid().slice(0, 6)}@example.com`, consent: true, attachmentMediaIds: uploaded,
      }
      const result = await submitInquiry(draft, { honeypot: '', formRenderedAt: Date.now() - 60000, idempotencyKey: uuid() })
      assert.equal(result.ok, true)
      const links = (await db.from('inquiry_attachments').select('media_id').eq('inquiry_id', result.id)).data
      assert.equal(links.length, 3, 'never trust the client: capped server-side')
      assert.deepEqual(await removeInquiryAttachment(links[0].media_id), { ok: false })
    })
  })
})

describe('bilingual integrity in the database itself', () => {
  it('a row missing either language is refused by a CHECK constraint, whatever the app does', async () => {
    const { error } = await db.from('projects').insert({ slug: slug(), title: { en: 'only english' }, category: tx('c'), summary: tx('s') })
    assert.equal(error?.code, '23514')
  })
  it('the public content read never returns a half-language row: every published project has en and fa', async () => {
    for (const row of (await visitor.from('projects').select('title, summary, category')).data) {
      for (const field of ['title', 'summary', 'category']) assert.ok(row[field].en && row[field].fa, field)
    }
  })
})
