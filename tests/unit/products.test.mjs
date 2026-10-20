/**
 * Phase 27 — the pure rules behind products, prices, content blocks and the
 * shell settings. The database and the actions are covered by
 * tests/integration/products.integration.test.mjs; this file pins the rules
 * themselves.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cleanAmount, formatMoney, hasPrice, moneyFromRow, pickPrice } from '../../lib/products/money.ts'
import {
  blockCompleteness,
  normalizeBlockBody,
  parseVideoUrl,
  toPublicBlock,
  VIDEO_FRAME_ORIGINS,
  videoEmbedUrl,
} from '../../lib/products/blocks.ts'
import {
  buildShellData,
  FALLBACK_SHELL,
  formatPhoneNumber,
  isSafeExternalHref,
  isSafeInternalHref,
  navFor,
  normalizePhoneNumber,
  whatsappHref,
} from '../../lib/shell-settings.ts'
import { validateProductRequest, validateStep } from '../../lib/inquiry-validation.ts'
import { projectTypeLabel, projectTypeOptions } from '../../lib/inquiry-content.ts'
import { createEmptyInquiryDraft, PROJECT_TYPE_IDS } from '../../types/inquiry.ts'

const tx = (en, fa = `${en}-fa`) => ({ en, fa })
const UUID = '6f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

describe('prices (D-21, D-04)', () => {
  it('the Dari site shows Afghani, the English site dollars; each falls back to the other', () => {
    assert.deepEqual(pickPrice({ afn: 15000, usd: 200 }, 'fa'), { amount: 15000, currency: 'AFN', from: false })
    assert.deepEqual(pickPrice({ afn: 15000, usd: 200 }, 'en'), { amount: 200, currency: 'USD', from: false })
    assert.deepEqual(pickPrice({ usd: 200 }, 'fa'), { amount: 200, currency: 'USD', from: false })
    assert.deepEqual(pickPrice({ afn: 15000 }, 'en'), { amount: 15000, currency: 'AFN', from: false })
  })
  it('no amount is no price — never a zero, never an invented figure', () => {
    assert.equal(pickPrice({}, 'en'), null)
    assert.equal(pickPrice(null, 'fa'), null)
    assert.equal(hasPrice({ from: true }), false)
    assert.equal(formatMoney({}, 'year', 'en'), 'Price after a short conversation')
    assert.equal(formatMoney({}, null, 'fa'), 'قیمت بعد از یک گفتگوی کوتاه')
  })
  it('zero is a real price (free), not "no price"', () => {
    assert.deepEqual(pickPrice({ usd: 0 }, 'en'), { amount: 0, currency: 'USD', from: false })
  })
  it('formats with the period and "from", in Dari word order and Dari currency names', () => {
    assert.equal(formatMoney({ afn: 15000 }, 'month', 'fa'), '۱۵٬۰۰۰ افغانی در ماه')
    assert.equal(formatMoney({ afn: 15000, from: true }, 'once', 'fa'), 'از ۱۵٬۰۰۰ افغانی')
    assert.equal(formatMoney({ usd: 500, from: true }, 'year', 'en'), 'From $500 per year')
    assert.equal(formatMoney({ usd: 500 }, 'once', 'fa'), '۵۰۰ دالر')
  })
  it('amounts typed by the owner: empty = none, negative/absurd/non-numeric refused, cents kept', () => {
    assert.equal(cleanAmount(''), null)
    assert.equal(cleanAmount(undefined), null)
    assert.equal(cleanAmount('12.345'), 12.35)
    assert.equal(cleanAmount(0), 0)
    for (const bad of [-1, '-3', 'abc', Infinity, 1e12, NaN]) assert.equal(cleanAmount(bad), 'invalid', String(bad))
  })
  it('database numerics (which may arrive as strings) become numbers; nulls stay absent', () => {
    assert.deepEqual(moneyFromRow('15000.00', null, true), { afn: 15000, from: true })
    assert.deepEqual(moneyFromRow(null, null), {})
  })
})

describe('video blocks: YouTube and Vimeo only, by id', () => {
  it('reads the usual address forms', () => {
    for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3']) {
      assert.deepEqual(parseVideoUrl(url), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' }, url)
    }
    assert.deepEqual(parseVideoUrl('https://vimeo.com/76979871'), { provider: 'vimeo', videoId: '76979871' })
  })
  it('refuses everything else', () => {
    for (const url of ['https://evil.example/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://vimeo.com/abc', 'not a url']) {
      assert.equal(parseVideoUrl(url), null, url)
    }
  })
  it('embeds through the privacy-friendly players — exactly the origins the public CSP allows', () => {
    const youtube = new URL(videoEmbedUrl({ provider: 'youtube', videoId: 'dQw4w9WgXcQ' }))
    const vimeo = new URL(videoEmbedUrl({ provider: 'vimeo', videoId: '76979871' }))
    assert.deepEqual([youtube.origin, vimeo.origin], VIDEO_FRAME_ORIGINS)
  })
})

describe('block bodies', () => {
  it('cleans text, drops empty list entries, refuses a wrong shape', () => {
    assert.deepEqual(normalizeBlockBody('intro', { text: { en: '  Hi  ', fa: ' سلام ' } }), { text: { en: 'Hi', fa: 'سلام' } })
    assert.deepEqual(normalizeBlockBody('audience', { items: [tx('Bus companies'), { en: '', fa: '' }, 'junk'] }), { items: [tx('Bus companies')] })
    assert.equal(normalizeBlockBody('intro', 'not an object'), null)
    assert.equal(normalizeBlockBody('gallery', { images: [{ mediaId: 'x' }] }), null)
    assert.deepEqual(normalizeBlockBody('gallery', { images: [{ mediaId: UUID }, { mediaId: UUID }] }), { images: [{ mediaId: UUID }] }, 'one image once')
    assert.equal(normalizeBlockBody('video', { url: 'https://evil.example/v.mp4' }), null)
  })
  it('a block is complete only with its content in both languages; an empty list block never is', () => {
    assert.deepEqual(blockCompleteness('intro', null, { text: tx('x') }), { en: true, fa: true })
    assert.deepEqual(blockCompleteness('intro', null, { text: { en: 'x', fa: '' } }), { en: true, fa: false })
    assert.deepEqual(blockCompleteness('faq', null, { items: [] }), { en: false, fa: false })
    assert.deepEqual(blockCompleteness('gallery', null, { images: [] }), { en: false, fa: false })
    assert.deepEqual(blockCompleteness('features', null, {}), { en: true, fa: true }, 'the features block shows the project\'s list')
    assert.deepEqual(blockCompleteness('features', { en: 'Title', fa: '' }, {}), { en: true, fa: false }, 'a heading written in one language blocks it')
    assert.deepEqual(blockCompleteness('features-by-role', null, { groups: [{ role: tx('Passenger'), items: [] }] }), { en: false, fa: false })
  })
  it('the public block: gallery images resolved from the library, images without alt text skipped', () => {
    const media = new Map([
      [UUID, { id: UUID, url: '/a.png', alt: tx('Seat map'), width: 100, height: 50 }],
      ['b', { id: 'b', url: '/b.png', alt: null, width: null, height: null }],
    ])
    const block = toPublicBlock({ id: 'blk', type: 'gallery', title: null, body: { images: [{ mediaId: UUID, caption: tx('Seats') }, { mediaId: 'b' }, { mediaId: 'gone' }] } }, media)
    assert.deepEqual(block, { id: 'blk', type: 'gallery', images: [{ mediaId: UUID, src: '/a.png', alt: tx('Seat map'), caption: tx('Seats'), width: 100, height: 50 }] })
    assert.equal(toPublicBlock({ id: 'x', type: 'gallery', title: null, body: { images: [{ mediaId: 'gone' }] } }, media), null, 'nothing left to show')
    assert.equal(toPublicBlock({ id: 'x', type: 'architecture', title: null, body: {} }, media), null, 'an unknown (engineering) type never renders')
  })
})

describe('shell settings (27.6)', () => {
  it('navigation links are same-site paths only', () => {
    for (const ok of ['/', '/work', '/services/business-website']) assert.equal(isSafeInternalHref(ok), true, ok)
    for (const bad of ['https://x.example', '//x.example', 'javascript:alert(1)', 'work', '/work?x=1', '/../etc', '/a//b']) assert.equal(isSafeInternalHref(bad), false, bad)
  })
  it('external profiles are https only', () => {
    assert.equal(isSafeExternalHref('https://github.com/artaveo'), true)
    for (const bad of ['http://x.example', 'javascript:alert(1)', 'mailto:a@b.c', '']) assert.equal(isSafeExternalHref(bad), false, bad)
  })
  it('phone numbers: international form, spaces and 00 accepted, anything else refused', () => {
    assert.equal(normalizePhoneNumber('+93 79 068 5832'), '+93790685832')
    assert.equal(normalizePhoneNumber('0093-790-685-832'), '+93790685832')
    for (const bad of ['0790685832', '+93 79 abc', '+0123456789', '+1']) assert.equal(normalizePhoneNumber(bad), 'invalid', bad)
    assert.equal(whatsappHref('+93790685832'), 'https://wa.me/93790685832')
    assert.equal(formatPhoneNumber('+93790685832'), '+93 79 068 5832')
  })
  it('rows → shell: hidden items, unknown keys and unsafe links are dropped; order is the owner\'s', () => {
    const shell = buildShellData(
      [
        { key: 'about', href: '/about', surfaces: ['header'], has_description: true, has_content: true, sort_order: 4 },
        { key: 'work', href: '/work', surfaces: ['header', 'footer', 'sidebar'], has_description: true, has_content: true, sort_order: 1 },
        { key: 'products', href: '/products', surfaces: ['header'], has_description: true, has_content: false, sort_order: 0 },
        { key: 'blog', href: '/blog', surfaces: ['header'], has_description: false, has_content: true, sort_order: 2 },
        { key: 'contact', href: 'https://evil.example', surfaces: ['footer'], has_description: false, has_content: true, sort_order: 3 },
      ],
      { contact_email: 'a@b.co', whatsapp_number: '+93790685832', phone_number: null, external_profiles: [{ href: 'http://x', label: 'X' }, { href: 'https://y.example', label: 'Y' }] },
    )
    assert.deepEqual(shell.nav.map((item) => item.key), ['work', 'about'])
    assert.deepEqual(shell.nav[0].surfaces, ['header', 'footer'])
    assert.deepEqual(shell.profiles, [{ href: 'https://y.example', label: 'Y' }])
    assert.deepEqual(shell.contact, { email: 'a@b.co', whatsappNumber: '+93790685832', phoneNumber: null })
  })
  it('the fallback (database unreachable) is today\'s shell: no hidden item, the real channels', () => {
    assert.deepEqual(navFor(FALLBACK_SHELL, 'header').map((item) => item.key), ['home', 'work', 'services', 'about'])
    assert.deepEqual(navFor(FALLBACK_SHELL, 'footer').map((item) => item.key).slice(0, 5), ['home', 'work', 'services', 'process', 'about'])
    assert.ok(!FALLBACK_SHELL.nav.some((item) => item.key === 'products' || item.key === 'insights'))
    assert.equal(FALLBACK_SHELL.contact.whatsappNumber, '+93790685832')
  })
})

describe('inquiries (27.5)', () => {
  const contact = { name: 'A', email: 'a@example.com', phone: '', preferredLocale: 'en', preferredChannel: 'email', consent: true }
  it('the Brief Builder\'s project types are by kind of software, with "something else" always there', () => {
    assert.deepEqual(projectTypeOptions.map((o) => o.id), PROJECT_TYPE_IDS)
    assert.ok(PROJECT_TYPE_IDS.includes('other') && PROJECT_TYPE_IDS.includes('buy-product'))
    assert.equal(projectTypeLabel('web-app-or-mvp').en, 'A web application', 'old leads still read correctly')
    assert.equal(projectTypeLabel('nonsense'), null)
  })
  it('"buy one of our products" needs the product; an unknown project type is refused', () => {
    const base = { ...createEmptyInquiryDraft('en'), goal: 'A long enough goal' }
    assert.equal(validateStep('project', { ...base, projectType: 'buy-product' }).productSlug, 'required')
    assert.deepEqual(validateStep('project', { ...base, projectType: 'buy-product', productSlug: 'ticket-system' }), {})
    assert.equal(validateStep('project', { ...base, projectType: 'new-website' }).projectType, 'required')
  })
  it('a product request: kind, product slug, ids and contact are checked', () => {
    const ok = { kind: 'product-purchase', productSlug: 'ticket-system', productServiceIds: [UUID], message: '', ...contact }
    assert.deepEqual(validateProductRequest(ok), {})
    assert.deepEqual(validateProductRequest({ ...ok, saleOptionId: UUID }), {})
    for (const [patch, field] of [
      [{ kind: 'project' }, 'kind'],
      [{ productSlug: '../x' }, 'productSlug'],
      [{ saleOptionId: 'nope' }, 'saleOptionId'],
      [{ productServiceIds: ['nope'] }, 'productServiceIds'],
      [{ message: 'x'.repeat(4001) }, 'message'],
      [{ consent: false }, 'consent'],
      [{ email: 'not-an-address' }, 'email'],
      [{ preferredChannel: 'whatsapp' }, 'phone'],
    ]) {
      assert.ok(field in validateProductRequest({ ...ok, ...patch }), JSON.stringify(patch))
    }
    assert.deepEqual(validateProductRequest(null), { form: 'required' })
  })
})

describe('owner review (18 October 2026): addresses and image filtering', async () => {
  const { toSlug, toSlugWhileTyping } = await import('../../lib/slug.ts')
  const { filterMedia, countByProject } = await import('../../lib/media-filter.ts')

  it('a page address can be typed freely: "Windows Application" becomes windows-application', () => {
    assert.equal(toSlug('Windows Application'), 'windows-application')
    assert.equal(toSlug('  Artaveo Dental!! '), 'artaveo-dental')
    assert.equal(toSlug('Café_Menu  2026'), 'cafe-menu-2026')
    assert.equal(toSlug('آرتاویو'), '', 'a Persian-only title gives no address — the owner types one')
    assert.equal(toSlugWhileTyping('windows '), 'windows-', 'a trailing dash survives while typing, so the next word can follow')
  })

  it('images: one project, the unassigned ones, or all — and a search over alt text and file name', () => {
    const assets = [
      { id: '1', url: '/media/seat-map.png', alt: { en: 'Seat map', fa: 'نقشه‌ی چوکی' }, projectId: 'p1', createdAt: '' },
      { id: '2', url: '/media/dashboard.png', alt: { en: 'Admin dashboard', fa: 'داشبورد' }, projectId: 'p2', createdAt: '' },
      { id: '3', url: '/media/logo.svg', alt: null, projectId: null, createdAt: '' },
    ]
    assert.deepEqual(filterMedia(assets, 'p1', '').map((a) => a.id), ['1'])
    assert.deepEqual(filterMedia(assets, 'none', '').map((a) => a.id), ['3'])
    assert.deepEqual(filterMedia(assets, 'all', 'چوکی').map((a) => a.id), ['1'])
    assert.deepEqual(filterMedia(assets, 'all', 'LOGO').map((a) => a.id), ['3'], 'file name, case-insensitive')
    assert.deepEqual(filterMedia(assets, 'all', 'admin board').map((a) => a.id), ['2'], 'every word must appear')
    assert.deepEqual(Object.fromEntries(countByProject(assets)), { p1: 1, p2: 1, none: 1 })
  })
})
