/**
 * Pricing display rules (roadmap § 7.2, D-04) — lib/pricing.ts, the JSON-LD
 * `Offer` rule, and the invariants of the real content.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatAddonPrice, formatPackagePrice } from '../../lib/pricing.ts'
import { buildServiceJsonLd } from '../../lib/structured-data.ts'
import { getAllServicesRaw } from '../../lib/services-content.ts'

const labels = { quote: 'Ask for a quote', from: 'From' }
const tPrice = (key) => labels[key] ?? `MISSING:${key}`

describe('formatPackagePrice', () => {
  it('a quote is always the honest label — even if an amount is (wrongly) present', () => {
    assert.equal(formatPackagePrice({ type: 'quote' }, 'en', tPrice), 'Ask for a quote')
    assert.equal(formatPackagePrice({ type: 'quote', amount: 900, currency: 'USD' }, 'en', tPrice), 'Ask for a quote')
  })
  it('a figure-typed price with no amount degrades to the quote label, never "$undefined"', () => {
    assert.equal(formatPackagePrice({ type: 'from' }, 'en', tPrice), 'Ask for a quote')
    assert.equal(formatPackagePrice({ type: 'fixed' }, 'fa', tPrice), 'Ask for a quote')
  })
  it('"from" prefixes the label; "fixed" is the bare figure', () => {
    assert.equal(formatPackagePrice({ type: 'from', amount: 1500, currency: 'USD' }, 'en', tPrice), 'From $1,500')
    assert.equal(formatPackagePrice({ type: 'fixed', amount: 1500, currency: 'USD' }, 'en', tPrice), '$1,500')
  })
  it('the currency defaults to USD, and fa renders Persian digits', () => {
    assert.equal(formatPackagePrice({ type: 'fixed', amount: 300 }, 'en', tPrice), '$300')
    const fa = formatPackagePrice({ type: 'fixed', amount: 300, currency: 'USD' }, 'fa', tPrice)
    assert.equal(fa.replace(/[^۰-۹]/g, ''), '۳۰۰')
  })
  it('amounts are whole numbers (no fake precision)', () => {
    assert.equal(formatPackagePrice({ type: 'fixed', amount: 99.6, currency: 'USD' }, 'en', tPrice), '$100')
  })
})

describe('formatAddonPrice', () => {
  it('quote or missing amount → the honest label', () => {
    assert.equal(formatAddonPrice({ type: 'quote' }, tPrice), 'Ask for a quote')
    assert.equal(formatAddonPrice({ type: 'from' }, tPrice), 'Ask for a quote')
  })
  it('a figure is shown as an increment', () => {
    assert.equal(formatAddonPrice({ type: 'fixed', amount: 200, currency: 'EUR' }, tPrice), '+200 EUR')
    assert.equal(formatAddonPrice({ type: 'from', amount: 200 }, tPrice), '+200 USD')
  })
})

describe('structured data never invents an Offer', () => {
  const service = (price) => ({
    slug: 's', title: { en: 'S', fa: 'س' }, description: { en: 'd', fa: 'ت' },
    packages: [{ id: 'starter', name: { en: 'Starter', fa: 'پایه' }, price }],
  })
  it('a quote produces no offers key at all', () => {
    assert.equal('offers' in buildServiceJsonLd('en', service({ type: 'quote' })), false)
  })
  it('a figure without an amount produces none either', () => {
    assert.equal('offers' in buildServiceJsonLd('en', service({ type: 'from' })), false)
  })
  it('an approved figure produces exactly one Offer with that amount', () => {
    const ld = buildServiceJsonLd('en', service({ type: 'from', amount: 750, currency: 'USD' }))
    assert.equal(ld.offers.length, 1)
    assert.equal(ld.offers[0].price, 750)
    assert.equal(ld.offers[0].priceCurrency, 'USD')
  })
})

describe('the real content obeys the pricing rules', () => {
  const services = getAllServicesRaw()
  const packages = services.flatMap((s) => (s.packages ?? []).map((p) => ({ service: s.slug, ...p })))
  const addons = services.flatMap((s) => (s.addOns ?? []).map((a) => ({ service: s.slug, ...a })))

  it('there are services and packages to check', () => {
    assert.ok(services.length > 0 && packages.length > 0)
  })
  it('every figure-typed price carries an amount (type says figure ⇒ figure exists)', () => {
    for (const item of [...packages, ...addons]) {
      if (item.price.type !== 'quote') assert.ok(typeof item.price.amount === 'number' && item.price.amount > 0, `${item.service}/${item.id}`)
    }
  })
  it('a quote price never carries an amount or currency', () => {
    for (const item of [...packages, ...addons]) {
      if (item.price.type === 'quote') assert.equal(item.price.amount, undefined, `${item.service}/${item.id}`)
    }
  })
  it('the "custom" tier is always a quote and has no invented delivery time', () => {
    for (const pkg of packages.filter((p) => p.id === 'custom')) {
      assert.equal(pkg.price.type, 'quote', pkg.service)
      assert.equal(pkg.deliveryDays, undefined, `${pkg.service} custom tier must not promise a delivery time`)
    }
  })
  // D-04 (pricing transparency) is an open owner decision: NO figure may be
  // published until it is resolved. This is deliberately a policy pin — when
  // D-04 is resolved this test must be deleted on purpose, not "fixed".
  it('POLICY PIN (D-04 open): every price on the site is a quote', () => {
    const figures = [...packages, ...addons].filter((item) => item.price.type !== 'quote')
    assert.deepEqual(figures.map((f) => `${f.service}/${f.id}`), [])
  })
})
