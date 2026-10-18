/**
 * Phase 27 — products, sale options, after-sales services, content blocks, product
 * requests and the shell settings, through the REAL server actions and selectors
 * against the real database (roadmap § 11A). What has to hold:
 *
 * - without code, the owner turns a project into a product, adds / edits / reorders /
 *   hides sale options and their prices, adds after-sales services, builds the page
 *   from blocks, sets the colour and cover;
 * - nothing reaches the site half-translated or invented: hiding is the default,
 *   showing needs both languages, a price is only what the owner typed;
 * - a product request can only name what the site really offers, and keeps what
 *   it named even after the owner changes the price;
 * - an anonymous caller changes nothing.
 *
 * Needs the test stack:  npm run test:stack:up
 */
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { EDITOR } from '../support/stack/accounts.mjs'
import { anon, service, sql, uuid } from '../support/stack-env.mjs'
import { clearRevalidated, resetRequest, revalidated } from '../support/next-runtime.mjs'
import { createEmptyInquiryDraft } from '../../types/inquiry.ts'

const { adminSignIn } = await import('../../app/actions/admin-auth.ts')
const content = await import('../../app/actions/content.ts')
const products = await import('../../app/actions/products.ts')
const settings = await import('../../app/actions/settings.ts')
const media = await import('../../app/actions/media.ts')
const { submitInquiry, submitProductRequest } = await import('../../app/actions/inquiries.ts')
const { queryProjectBySlug, queryProducts } = await import('../../lib/db/content-queries.ts')
const { getShellData } = await import('../../lib/shell-settings-server.ts')

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
const projectInput = (extra = {}) => ({
  slug: slug(), title: tx('Product probe'), category: tx('Web system'), summary: tx('A product probe for the suite'),
  highlights: [], coverMediaId: null, liveUrl: null, year: null, relatedServiceSlug: null, featured: false, technologyIds: [],
  showInPortfolio: true, isProduct: false, brandColor: null, accentColor: null, industry: null, platforms: [], outcomeLine: null, features: [tx('Sell tickets online')],
  ...extra,
})
const optionInput = (extra = {}) => ({
  kind: 'licence-yearly', title: tx('Yearly licence'), summary: null, price: {}, billingPeriod: 'year',
  maintenance: 'not-offered', maintenancePrice: null, maintenancePeriod: null, included: [], highlighted: false, cta: 'purchase-request',
  ...extra,
})
const OLD = () => Date.now() - 60_000
const meta = (extra = {}) => ({ honeypot: '', formRenderedAt: OLD(), idempotencyKey: uuid(), ...extra })
const request = (productSlug, extra = {}) => ({
  kind: 'product-purchase', productSlug, productServiceIds: [], message: '', name: 'Product Client',
  email: `product-${uuid().slice(0, 8)}@example.com`, phone: '', preferredLocale: 'en', preferredChannel: 'email', consent: true,
  ...extra,
})
const auditActions = async (entityId) => (await db.from('audit_log').select('action').eq('entity_id', entityId)).data.map((r) => r.action)

/** A published product with one published option and one published after-sales service. */
async function publishedProduct() {
  await login(EDITOR)
  const input = projectInput({ isProduct: true })
  const { id } = await content.createProject(input)
  assert.deepEqual(await content.publishProject(id), { ok: true })
  const option = await products.createSaleOption(id, optionInput({ price: { afn: 15000, usd: 200 } }))
  assert.equal(option.ok, true)
  assert.deepEqual(await products.publishSaleOption(option.id, id), { ok: true })
  const svc = await products.createProductService(id, { title: tx('Training'), description: null, price: { usd: 50 }, period: 'once' })
  assert.equal(svc.ok, true)
  assert.deepEqual(await products.publishProductService(svc.id, id), { ok: true })
  return { id, slug: input.slug, optionId: option.id, serviceId: svc.id }
}

before(() => sql('truncate public.audit_log, public.notification_outbox, public.inquiries cascade'))
after(() => sql(`delete from public.projects where slug like 'it-%'; truncate public.inquiries cascade`))
beforeEach(() => clearRevalidated())

describe('27.2 blocks: add, edit, show, reorder, delete', () => {
  it('a new block is hidden; it can be shown only when complete in both languages; then the page shows it', async () => {
    await login(EDITOR)
    const input = projectInput()
    const { id } = await content.createProject(input)
    await content.publishProject(id)

    const created = await products.createProjectBlock(id, { type: 'intro', title: null, body: { text: { en: 'English only', fa: '' } } })
    assert.equal(created.ok, true)
    assert.deepEqual((await queryProjectBySlug(input.slug)).blocks, [], 'a new block starts hidden')
    assert.deepEqual(await products.publishProjectBlock(created.id, id), { ok: false, code: 'not-complete' })

    assert.deepEqual(await products.updateProjectBlock(created.id, id, { type: 'intro', title: tx('About'), body: { text: tx('Both languages now') } }), { ok: true })
    clearRevalidated()
    assert.deepEqual(await products.publishProjectBlock(created.id, id), { ok: true })
    const live = await queryProjectBySlug(input.slug)
    assert.deepEqual(live.blocks.map((b) => [b.type, b.text.en, b.title.en]), [['intro', 'Both languages now', 'About']])
    assert.ok(revalidated().some((r) => r.path === `/fa/work/${input.slug}`))
    assert.ok((await auditActions(created.id)).includes('content.project_block_published'))
  })

  it('editing a shown block so it is no longer complete hides it again, instead of showing half a translation', async () => {
    await login(EDITOR)
    const input = projectInput()
    const { id } = await content.createProject(input)
    await content.publishProject(id)
    const { id: blockId } = await products.createProjectBlock(id, { type: 'result', title: null, body: { text: tx('Done') } })
    await products.publishProjectBlock(blockId, id)
    await products.updateProjectBlock(blockId, id, { type: 'result', title: null, body: { text: { en: 'Changed', fa: '' } } })
    assert.equal((await db.from('project_blocks').select('published').eq('id', blockId).single()).data.published, false)
    assert.deepEqual((await queryProjectBySlug(input.slug)).blocks, [])
  })

  it('reorder takes exactly this project\'s blocks; a foreign or missing id is refused', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput())
    const a = await products.createProjectBlock(id, { type: 'intro', title: null, body: { text: tx('A') } })
    const b = await products.createProjectBlock(id, { type: 'result', title: null, body: { text: tx('B') } })
    const other = await content.createProject(projectInput())
    const foreign = await products.createProjectBlock(other.id, { type: 'intro', title: null, body: { text: tx('X') } })

    assert.deepEqual(await products.reorderProjectBlocks(id, [b.id, a.id]), { ok: true })
    const order = (await db.from('project_blocks').select('id').eq('project_id', id).order('sort_order')).data.map((r) => r.id)
    assert.deepEqual(order, [b.id, a.id])
    assert.deepEqual(await products.reorderProjectBlocks(id, [b.id]), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.reorderProjectBlocks(id, [b.id, foreign.id]), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.deleteProjectBlock(foreign.id, id), { ok: false, code: 'not-found' }, 'a block of another project cannot be deleted through this one')
    assert.deepEqual(await products.deleteProjectBlock(a.id, id), { ok: true })
  })

  it('a body that does not fit its type is refused: an unknown type, a gallery image that is not a library id, a video that is not YouTube/Vimeo', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput())
    assert.deepEqual(await products.createProjectBlock(id, { type: 'architecture', title: null, body: {} }), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.createProjectBlock(id, { type: 'gallery', title: null, body: { images: [{ mediaId: 'x' }] } }), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.createProjectBlock(id, { type: 'gallery', title: null, body: { images: [{ mediaId: uuid() }] } }), { ok: false, code: 'invalid' }, 'an id that is not in the library')
    assert.deepEqual(await products.createProjectBlock(id, { type: 'video', title: null, body: { url: 'https://evil.example/video.mp4' } }), { ok: false, code: 'invalid' })
    const video = await products.createProjectBlock(id, { type: 'video', title: null, body: { url: 'https://youtu.be/dQw4w9WgXcQ', caption: tx('Tour') } })
    assert.equal(video.ok, true)
    assert.deepEqual((await db.from('project_blocks').select('body').eq('id', video.id).single()).data.body, { provider: 'youtube', videoId: 'dQw4w9WgXcQ', caption: tx('Tour') })
  })
})

describe('27.3 a product, its ways to get it and its after-sales services', () => {
  it('one switch makes a project a product; its published options and services appear; switching off hides them and keeps them', async () => {
    await login(EDITOR)
    const input = projectInput()
    const { id } = await content.createProject(input)
    await content.publishProject(id)
    const option = await products.createSaleOption(id, optionInput({ price: { afn: 15000 } }))
    await products.publishSaleOption(option.id, id)
    assert.deepEqual((await queryProjectBySlug(input.slug)).saleOptions, [], 'not a product yet')

    assert.deepEqual(await products.setProjectIsProduct(id, true), { ok: true })
    let live = await queryProjectBySlug(input.slug)
    assert.equal(live.isProduct, true)
    assert.deepEqual(live.saleOptions.map((o) => [o.kind, o.price.afn, o.billingPeriod]), [['licence-yearly', 15000, 'year']])
    assert.ok((await queryProducts()).some((p) => p.slug === input.slug))

    assert.deepEqual(await products.setProjectIsProduct(id, false), { ok: true })
    live = await queryProjectBySlug(input.slug)
    assert.deepEqual(live.saleOptions, [])
    assert.equal((await db.from('product_sale_options').select('id').eq('project_id', id)).data.length, 1, 'kept, only hidden')
  })

  it('prices: Afghani and dollars as typed, rounded to cents; a negative or absurd amount is refused; no amount = no price', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput({ isProduct: true }))
    const option = await products.createSaleOption(id, optionInput())
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ price: { afn: 1234.567, usd: 20 } })), { ok: true })
    const row = (await db.from('product_sale_options').select('price_afn, price_usd').eq('id', option.id).single()).data
    assert.deepEqual([Number(row.price_afn), Number(row.price_usd)], [1234.57, 20])
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ price: { afn: -5 } })), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ price: { usd: 1e13 } })), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ price: {} })), { ok: true })
    const cleared = (await db.from('product_sale_options').select('price_afn, price_usd').eq('id', option.id).single()).data
    assert.deepEqual([cleared.price_afn, cleared.price_usd], [null, null])
    const audit = (await db.from('audit_log').select('action, before').eq('entity_id', option.id).eq('action', 'content.product_sale_option_updated')).data
    assert.ok(audit.length >= 2 && audit.some((a) => a.before?.price?.afn === 1234.57), 'the price history is in the audit log')
  })

  it('maintenance: a price only for optional maintenance, and then with its period', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput({ isProduct: true }))
    const option = await products.createSaleOption(id, optionInput())
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ maintenance: 'optional', maintenancePrice: { usd: 100 }, maintenancePeriod: null })), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ maintenance: 'optional', maintenancePrice: { usd: 100 }, maintenancePeriod: 'year' })), { ok: true })
    // switching maintenance to "included" clears the maintenance price instead of keeping a stale one
    assert.deepEqual(await products.updateSaleOption(option.id, id, optionInput({ maintenance: 'included', maintenancePrice: { usd: 100 }, maintenancePeriod: 'year' })), { ok: true })
    const row = (await db.from('product_sale_options').select('maintenance, maintenance_price_usd, maintenance_period').eq('id', option.id).single()).data
    assert.deepEqual(row, { maintenance: 'included', maintenance_price_usd: null, maintenance_period: null })
  })

  it('at most one highlighted option: highlighting another clears the first', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput({ isProduct: true }))
    const a = await products.createSaleOption(id, optionInput({ highlighted: true }))
    const b = await products.createSaleOption(id, optionInput({ kind: 'source-code', billingPeriod: 'once', title: tx('Source code') }))
    assert.deepEqual(await products.updateSaleOption(b.id, id, optionInput({ kind: 'source-code', billingPeriod: 'once', title: tx('Source code'), highlighted: true })), { ok: true })
    const rows = (await db.from('product_sale_options').select('id, highlighted').eq('project_id', id)).data
    assert.deepEqual(Object.fromEntries(rows.map((r) => [r.id, r.highlighted])), { [a.id]: false, [b.id]: true })
  })

  it('options and services are hidden until shown, need both languages to be shown, and reorder like blocks', async () => {
    await login(EDITOR)
    const { id } = await content.createProject(projectInput({ isProduct: true }))
    const half = await products.createSaleOption(id, optionInput({ title: { en: 'English only', fa: '' } }))
    assert.deepEqual(await products.publishSaleOption(half.id, id), { ok: false, code: 'not-complete' })
    const svc = await products.createProductService(id, { title: { en: 'Hosting', fa: '' }, description: null, price: {}, period: 'year' })
    assert.deepEqual(await products.publishProductService(svc.id, id), { ok: false, code: 'not-complete' })
    const second = await products.createProductService(id, { title: tx('Training'), description: null, price: {}, period: 'once' })
    assert.deepEqual(await products.reorderProductServices(id, [second.id, svc.id]), { ok: true })
    assert.deepEqual(await products.updateSaleOption(half.id, id, optionInput({ kind: 'not-a-kind' })), { ok: false, code: 'invalid' })
    assert.deepEqual(await products.createProductService(id, { title: tx('X'), description: null, price: {}, period: 'weekly' }), { ok: false, code: 'invalid' })
  })

  it('an anonymous caller can change nothing', async () => {
    const { id, optionId } = await publishedProduct()
    resetRequest()
    for (const result of [
      await products.createProjectBlock(id, { type: 'intro', title: null, body: { text: tx('x') } }),
      await products.createSaleOption(id, optionInput()),
      await products.updateSaleOption(optionId, id, optionInput({ price: { usd: 1 } })),
      await products.unpublishSaleOption(optionId, id),
      await products.deleteSaleOption(optionId, id),
      await products.setProjectIsProduct(id, false),
      await settings.updateSiteSettings({}),
    ]) {
      assert.deepEqual(result, { ok: false, code: 'forbidden' })
    }
    const row = (await db.from('product_sale_options').select('published, price_usd').eq('id', optionId).single()).data
    assert.deepEqual([row.published, Number(row.price_usd)], [true, 200])
  })
})

describe('27.5 product purchase and demo requests', () => {
  it('a purchase request names the product, the option and the services, keeps a snapshot, and queues the two e-mails', async () => {
    const product = await publishedProduct()
    resetRequest()
    const result = await submitProductRequest(request(product.slug, { saleOptionId: product.optionId, productServiceIds: [product.serviceId], message: 'For 3 offices' }), meta())
    assert.equal(result.ok, true)
    const row = (await db.from('inquiries').select('*').eq('id', result.id).single()).data
    assert.deepEqual([row.inquiry_kind, row.product_project_id, row.product_sale_option_id, row.product_service_ids], ['product-purchase', product.id, product.optionId, [product.serviceId]])
    assert.equal(row.product_snapshot.option.price.afn, 15000)
    assert.equal(row.goal, 'For 3 offices')
    const out = (await db.from('notification_outbox').select('kind, subject').eq('inquiry_id', result.id)).data
    assert.deepEqual(out.map((o) => o.kind).sort(), ['client-confirmation', 'owner-alert'])
    assert.ok(out.find((o) => o.kind === 'owner-alert').subject.startsWith('New purchase request'))

    // the owner changes the price afterwards: the request keeps what the client saw
    await login(EDITOR)
    await products.updateSaleOption(product.optionId, product.id, optionInput({ price: { afn: 99999 } }))
    const again = (await db.from('inquiries').select('product_snapshot').eq('id', result.id).single()).data
    assert.equal(again.product_snapshot.option.price.afn, 15000)
  })

  it('a demo request is about the product only — a chosen option is not recorded', async () => {
    const product = await publishedProduct()
    resetRequest()
    const result = await submitProductRequest(request(product.slug, { kind: 'product-demo', saleOptionId: product.optionId }), meta())
    assert.equal(result.ok, true)
    const row = (await db.from('inquiries').select('inquiry_kind, product_sale_option_id').eq('id', result.id).single()).data
    assert.deepEqual(row, { inquiry_kind: 'product-demo', product_sale_option_id: null })
  })

  it('only what the site really offers: an unknown, hidden or non-product project, or another product\'s option, is refused and nothing is stored', async () => {
    const product = await publishedProduct()
    const other = await publishedProduct()
    await login(EDITOR)
    const hidden = await products.createSaleOption(product.id, optionInput())
    const portfolioOnly = projectInput()
    const { id: portfolioId } = await content.createProject(portfolioOnly)
    await content.publishProject(portfolioId)

    const before = (await db.from('inquiries').select('id', { count: 'exact', head: true })).count
    for (const bad of [
      request('it-does-not-exist'),
      request(portfolioOnly.slug),
      request(product.slug, { saleOptionId: hidden.id }),
      request(product.slug, { saleOptionId: other.optionId }),
      request(product.slug, { productServiceIds: [other.serviceId] }),
    ]) {
      resetRequest()
      assert.deepEqual(await submitProductRequest(bad, meta()), { ok: false, code: 'invalid' }, JSON.stringify(bad))
    }
    resetRequest()
    assert.deepEqual(await submitProductRequest({ ...request(product.slug), consent: false }, meta()), { ok: false, code: 'invalid' })
    assert.equal((await db.from('inquiries').select('id', { count: 'exact', head: true })).count, before)
  })

  it('the same guards as a brief: honeypot, too fast, and idempotent replay', async () => {
    const product = await publishedProduct()
    resetRequest()
    assert.deepEqual(await submitProductRequest(request(product.slug), meta({ honeypot: 'bot' })), { ok: false, code: 'rejected' })
    resetRequest()
    assert.deepEqual(await submitProductRequest(request(product.slug), meta({ formRenderedAt: Date.now() })), { ok: false, code: 'rejected' })
    resetRequest()
    const m = meta()
    const r = request(product.slug)
    const first = await submitProductRequest(r, m)
    const second = await submitProductRequest(r, m)
    assert.equal(second.replay, true)
    assert.equal(second.id, first.id)
    assert.equal((await db.from('notification_outbox').select('id').eq('inquiry_id', first.id)).data.length, 2, 'no second pair of e-mails')
  })

  it('the Brief Builder\'s "buy one of our products" becomes a purchase request for that product', async () => {
    const product = await publishedProduct()
    resetRequest()
    const result = await submitInquiry(
      { ...createEmptyInquiryDraft('fa'), projectType: 'buy-product', productSlug: product.slug, saleOptionId: product.optionId, goal: 'برای سه دفتر می‌خواهیم', timeline: 'asap', name: 'مشتری', email: `bb-${uuid().slice(0, 8)}@example.com`, consent: true },
      meta(),
    )
    assert.equal(result.ok, true)
    const row = (await db.from('inquiries').select('inquiry_kind, project_type, product_project_id, product_snapshot').eq('id', result.id).single()).data
    assert.deepEqual([row.inquiry_kind, row.project_type, row.product_project_id], ['product-purchase', 'buy-product', product.id])
    const confirmation = (await db.from('notification_outbox').select('body_text').eq('inquiry_id', result.id).eq('kind', 'client-confirmation').single()).data
    assert.match(confirmation.body_text, /۱۵٬۰۰۰ افغانی در سال/, 'the Dari confirmation shows the Afghani price, per year')

    resetRequest()
    assert.deepEqual(
      await submitInquiry({ ...createEmptyInquiryDraft('en'), projectType: 'buy-product', goal: 'No product named here', timeline: 'asap', name: 'X', email: `bb-${uuid().slice(0, 8)}@example.com`, consent: true }, meta()),
      { ok: false, code: 'invalid' },
    )
    resetRequest()
    assert.deepEqual(
      await submitInquiry({ ...createEmptyInquiryDraft('en'), projectType: 'new-website', goal: 'An old project type id', timeline: 'asap', name: 'X', email: `bb-${uuid().slice(0, 8)}@example.com`, consent: true }, meta()),
      { ok: false, code: 'invalid' },
      'the project type is a closed set',
    )
  })
})

describe('27.6 the shell reads its settings from the database', () => {
  const original = {}
  before(async () => {
    Object.assign(original, (await db.from('site_settings').select('*').eq('id', true).single()).data)
  })
  after(async () => {
    await db.from('site_settings').update({ contact_email: original.contact_email, whatsapp_number: original.whatsapp_number, phone_number: original.phone_number, external_profiles: original.external_profiles }).eq('id', true)
    await db.from('navigation_items').update({ has_content: false }).eq('key', 'products')
    await db.from('navigation_items').update({ sort_order: 2 }).eq('key', 'work')
  })

  const settingsInput = (extra = {}) => ({
    availabilityState: original.availability_state, nextOpening: original.next_opening, responseCommitment: original.response_commitment,
    timezone: original.timezone, languages: original.languages, externalProfiles: original.external_profiles,
    contactEmail: original.contact_email, whatsappNumber: original.whatsapp_number, phoneNumber: original.phone_number, ...extra,
  })

  it('the seeded channels are today\'s real values, and the products item exists but is hidden', async () => {
    const shell = await getShellData()
    assert.deepEqual(shell.contact, { email: 'artaveo.dev@gmail.com', whatsappNumber: '+93790685832', phoneNumber: '+93790685832' })
    assert.ok(!shell.nav.some((item) => item.key === 'products'), 'hidden until Phase 30 builds /products')
    assert.ok(shell.nav.some((item) => item.key === 'consultation' && item.surfaces.includes('command-palette')))
    assert.ok(!shell.nav.some((item) => item.key === 'insights'), 'Insights stays hidden (Phase 26.5)')
  })

  it('an edit in the admin is what the shell shows, and the whole layout is revalidated', async () => {
    await login(EDITOR)
    clearRevalidated()
    assert.deepEqual(await settings.updateSiteSettings(settingsInput({ whatsappNumber: '+93 70 000 0000', contactEmail: 'hello@example.com' })), { ok: true })
    assert.ok(revalidated().some((r) => r.path === '/' && r.type === 'layout'), JSON.stringify(revalidated()))
    const shell = await getShellData()
    assert.deepEqual([shell.contact.whatsappNumber, shell.contact.email], ['+93700000000', 'hello@example.com'])

    const { data: products } = await db.from('navigation_items').select('*').eq('key', 'products').single()
    assert.deepEqual(await settings.updateNavigationItem(products.id, { href: '/products', surfaces: ['header', 'footer'], hasDescription: true, hasContent: true, sortOrder: 1 }), { ok: true })
    assert.ok((await getShellData()).nav.find((item) => item.key === 'products')?.surfaces.includes('header'))
  })

  it('what ends up in a link is checked: no foreign or script navigation link, no http profile, no malformed number', async () => {
    await login(EDITOR)
    const { data: work } = await db.from('navigation_items').select('*').eq('key', 'work').single()
    for (const href of ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/work?x=<script>']) {
      assert.deepEqual(await settings.updateNavigationItem(work.id, { href, surfaces: ['header'], hasDescription: true, hasContent: true, sortOrder: 2 }), { ok: false, code: 'invalid' }, href)
    }
    assert.deepEqual(await settings.updateNavigationItem(work.id, { href: '/work', surfaces: ['sidebar'], hasDescription: true, hasContent: true, sortOrder: 2 }), { ok: false, code: 'invalid' })
    assert.deepEqual(await settings.updateSiteSettings(settingsInput({ externalProfiles: [{ href: 'http://insecure.example', label: 'X' }] })), { ok: false, code: 'invalid' })
    assert.deepEqual(await settings.updateSiteSettings(settingsInput({ whatsappNumber: '0790 abc' })), { ok: false, code: 'invalid' })
    assert.deepEqual(await settings.updateSiteSettings(settingsInput({ contactEmail: 'not-an-address' })), { ok: false, code: 'invalid' })
    assert.equal((await db.from('navigation_items').select('href').eq('key', 'work').single()).data.href, '/work')
  })

  it('a visitor can read the shell settings but not change them', async () => {
    assert.equal((await visitor.from('site_settings').select('contact_email')).data.length, 1)
    const upd = await visitor.from('site_settings').update({ contact_email: 'x@evil.example' }).eq('id', true).select()
    assert.deepEqual(upd.data ?? [], [])
  })
})

describe('owner review (18 October 2026): technologies and images per project', () => {
  // The same test image the CMS suite uploads.
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  const uploadForm = (extra = {}) => {
    const f = new FormData()
    f.set('file', new File([PNG], 'shot.png', { type: 'image/png' }))
    f.set('altEn', 'A screen')
    f.set('altFa', 'یک صفحه')
    for (const [key, value] of Object.entries(extra)) f.set(key, value)
    return f
  }
  after(() => sql("delete from public.media_assets where url not like '/images/%'; delete from public.technologies where slug in ('flutter', 'sql-server')"))

  it('a technology that is not in the list is added from the project form, once', async () => {
    await login(EDITOR)
    const first = await content.createTechnology({ name: '  Flutter ', category: 'mobile' })
    assert.equal(first.ok, true)
    assert.deepEqual([first.technology.name, first.technology.slug, first.technology.category], ['Flutter', 'flutter', 'mobile'])
    const again = await content.createTechnology({ name: 'flutter', category: 'mobile' })
    assert.equal(again.technology.id, first.technology.id, 'the same name returns the existing row')
    assert.deepEqual(await content.createTechnology({ name: 'SQL Server', category: 'nonsense' }), { ok: false, code: 'invalid' })
    assert.deepEqual(await content.createTechnology({ name: 'x'.repeat(41), category: 'other' }), { ok: false, code: 'invalid' })
    resetRequest()
    assert.deepEqual(await content.createTechnology({ name: 'SQL Server', category: 'database' }), { ok: false, code: 'forbidden' })
  })

  it('an image uploaded from a project belongs to it; it can be moved to another project or to none; a fake project is refused', async () => {
    await login(EDITOR)
    const { id: projectId } = await content.createProject(projectInput())
    const { id: otherId } = await content.createProject(projectInput())
    const uploaded = await media.uploadMedia(uploadForm({ projectId }))
    assert.equal(uploaded.ok, true)
    const row = async () => (await db.from('media_assets').select('project_id').eq('id', uploaded.id).single()).data.project_id
    assert.equal(await row(), projectId)

    const alt = { en: 'A screen', fa: 'یک صفحه' }
    assert.deepEqual(await media.updateMediaAlt(uploaded.id, { alt, focalX: 0.5, focalY: 0.5, projectId: otherId }), { ok: true })
    assert.equal(await row(), otherId)
    assert.deepEqual(await media.updateMediaAlt(uploaded.id, { alt, focalX: 0.5, focalY: 0.5 }), { ok: true })
    assert.equal(await row(), otherId, 'leaving projectId out keeps it')
    assert.deepEqual(await media.updateMediaAlt(uploaded.id, { alt, focalX: 0.5, focalY: 0.5, projectId: null }), { ok: true })
    assert.equal(await row(), null)
    assert.deepEqual(await media.updateMediaAlt(uploaded.id, { alt, focalX: 0.5, focalY: 0.5, projectId: uuid() }), { ok: false, code: 'error' })
    assert.equal((await media.uploadMedia(uploadForm({ projectId: 'not-a-uuid' }))).ok, false)
  })

  it('deleting a project keeps its images, no longer tied to it', async () => {
    await login(EDITOR)
    const { id: projectId } = await content.createProject(projectInput())
    const uploaded = await media.uploadMedia(uploadForm({ projectId }))
    await db.from('projects').delete().eq('id', projectId)
    const asset = (await db.from('media_assets').select('id, project_id').eq('id', uploaded.id).single()).data
    assert.deepEqual(asset, { id: uploaded.id, project_id: null })
  })
})
