/**
 * Phase 30 — the rules behind the product and work pages: the links from the
 * "ways to get it" cards to the request form, which screens a page shows, the
 * /work filters, the Product / Offer structured data (D-04: an offer only for
 * a real price), and that the old engineering frames and labels are gone. The
 * pages and the purchase flow themselves are covered by
 * tests/e2e/products.spec.ts.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { parseRequestHash, requestHash } from '../../lib/products/request-hash.ts'
import { projectScreens } from '../../lib/products/screens.ts'
import { buildCreativeWorkJsonLd, buildProductJsonLd } from '../../lib/structured-data.ts'
import { filterByPlatform, platformFilters } from '../../lib/work-filters.ts'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const tx = (en, fa) => ({ en, fa })
const OPTION = '3f2c1f4e-8a1b-4c2d-9e3f-1a2b3c4d5e6f'

describe('request links (30.3)', () => {
  it('round-trip: demo, purchase, purchase with a published option', () => {
    assert.equal(requestHash({ kind: 'product-demo' }), '#request-demo')
    assert.deepEqual(parseRequestHash('#request-demo', []), { kind: 'product-demo' })
    assert.deepEqual(parseRequestHash(requestHash({ kind: 'product-purchase' }), []), { kind: 'product-purchase' })
    assert.deepEqual(parseRequestHash(requestHash({ kind: 'product-purchase', optionId: OPTION }), [OPTION]), { kind: 'product-purchase', optionId: OPTION })
  })
  it('an option the page does not show is never picked — the visitor still lands on "buy it"', () => {
    assert.deepEqual(parseRequestHash(`#request-purchase-${OPTION}`, []), { kind: 'product-purchase' })
  })
  it('anything else is no choice at all', () => {
    for (const hash of ['', '#', '#ways', '#request', '#requestdemo', '#request-demo-x']) assert.equal(parseRequestHash(hash, [OPTION]), null, hash)
  })
})

describe('screens with captions', () => {
  const m = (src, placement, extra = {}) => ({ src, alt: tx(src, src), placement, kind: 'desktop', ...extra })
  it('story screenshots first, then the gallery; never the hero image; each screenshot once', () => {
    const media = [m('hero.png', 'hero'), m('g1.png', 'gallery'), m('s1.png', 'story', { storyKey: 'a' }), m('s2.png', 'story', { storyKey: 'a' }), m('s1.png', 'gallery')]
    assert.deepEqual(projectScreens({ media }).map((x) => x.src), ['s1.png', 's2.png', 'g1.png'])
    assert.deepEqual(projectScreens({}), [])
  })
})

describe('/work filters (30.2: only from six projects, by platform)', () => {
  const p = (...platforms) => ({ platforms })
  it('none below six projects', () => {
    assert.deepEqual(platformFilters([p('web'), p('android'), p('web'), p('windows'), p('web')]), [])
  })
  it('from six: only platforms some — not all — projects have, in the fixed order', () => {
    const projects = [p('web'), p('web', 'android'), p('web'), p('web', 'windows'), p('web'), p('web', 'android')]
    assert.deepEqual(platformFilters(projects), ['android', 'windows'])
    assert.equal(filterByPlatform(projects, 'android').length, 2)
    assert.equal(filterByPlatform(projects, null).length, 6)
  })
})

describe('structured data (30.4)', () => {
  const product = {
    slug: 'clinic',
    title: tx('Clinic System', 'سیستم کلینیک'),
    summary: tx('Summary', 'خلاصه'),
    outcomeLine: tx('Patients in one place', 'مریضان در یک جا'),
    industry: tx('Health care', 'صحت'),
    coverImage: '/images/clinic.png',
    technologies: ['Next.js'],
    saleOptions: [
      { id: 'a', kind: 'licence-yearly', title: tx('Yearly', 'سالانه'), price: { afn: 12000, usd: 170 }, billingPeriod: 'year', maintenance: 'included', included: [], highlighted: false, cta: 'purchase-request' },
      { id: 'b', kind: 'custom-edition', title: tx('Custom', 'اختصاصی'), price: {}, billingPeriod: 'once', maintenance: 'not-offered', included: [], highlighted: true, cta: 'demo-request' },
      { id: 'c', kind: 'source-code', title: tx('Source', 'کد'), price: { usd: 900, from: true }, billingPeriod: 'once', maintenance: 'not-offered', included: [], highlighted: false, cta: 'contact' },
    ],
  }
  it('Product with one Offer per currency of a real price — none for "price after a short conversation"', () => {
    const json = buildProductJsonLd('en', product)
    assert.equal(json['@type'], 'Product')
    assert.equal(json.name, 'Clinic System')
    assert.equal(json.url.endsWith('/en/products/clinic'), true)
    assert.equal(json.category, 'Health care')
    const names = json.offers.map((offer) => `${offer.name}:${offer.priceCurrency}`)
    assert.deepEqual(names, ['Yearly:AFN', 'Yearly:USD', 'Source:USD'])
  })
  it('a yearly licence is a yearly unit price; a "from" price is a minimum, never a price', () => {
    const [afn, , source] = buildProductJsonLd('fa', product).offers
    assert.equal(afn.price, 12000)
    assert.equal(afn.priceSpecification['@type'], 'UnitPriceSpecification')
    assert.equal(afn.priceSpecification.unitCode, 'ANN')
    assert.equal(source.price, undefined)
    assert.equal(source.priceSpecification.minPrice, 900)
  })
  it('no offers at all when no option has a price', () => {
    assert.equal(buildProductJsonLd('en', { ...product, saleOptions: [product.saleOptions[1]] }).offers, undefined)
  })
  it('a case study no longer lists technologies as keywords', () => {
    const json = buildCreativeWorkJsonLd('en', { ...product, platforms: [], media: [] })
    assert.equal(json.keywords, undefined)
    assert.deepEqual(json.about, ['Health care'])
  })
})

describe('the pages (30.1, 30.2)', () => {
  it('the old grid, cards and browser frame with an address bar are gone from the work pages', () => {
    for (const gone of ['components/work/work-grid.tsx', 'components/work/project-card.tsx', 'components/work/case-study-media.tsx', 'components/work/project-gallery.tsx']) {
      assert.equal(existsSync(new URL(`../../${gone}`, import.meta.url)), false, gone)
    }
    const caseStudy = read('components/work/case-study.tsx')
    assert.doesNotMatch(caseStudy, /BrowserFrame|technologies|project\.category/)
  })
  it('/work is one project per row (PortfolioList), never a card grid', () => {
    const page = read('app/[locale]/work/page.tsx')
    assert.match(page, /PortfolioList/)
    assert.doesNotMatch(page, /WorkGrid|ProjectCard/)
  })
  it('a product page shows only what the data has: ways to get it, after-sales services, questions and the request form', () => {
    const page = read('components/products/product-page.tsx')
    for (const part of ['SaleOptionGrid', 'AfterSalesChips', 'ProductRequestForm', "type === 'faq'"]) assert.match(page, new RegExp(part.replace(/[()]/g, '\\$&')))
    assert.doesNotMatch(page, /githubUrl/, 'no repository link (D-19)')
  })
  it('a product that is not in the portfolio is redirected from its old /work address', () => {
    assert.match(read('app/[locale]/work/[slug]/page.tsx'), /permanentRedirect\(`\/\$\{locale\}\/products\/\$\{slug\}`\)/)
  })
  it('the request form shows success only after the server stored the request', () => {
    const form = read('components/products/product-request-form.tsx')
    const success = form.indexOf("setStatus('success')")
    assert.ok(success > form.indexOf('if (!result.ok)'), 'success comes after the stored-result check')
    assert.match(form, /honeypot/)
    assert.match(form, /idempotencyKey/)
  })
})
