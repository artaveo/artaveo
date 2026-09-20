/**
 * SEO helpers and structured data (lib/seo.ts, lib/site-url.ts,
 * lib/structured-data.ts, lib/og.ts).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { absoluteUrl } from '../../lib/site-url.ts'
import { buildAlternates, buildPageOpenGraph } from '../../lib/seo.ts'
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildPersonJsonLd, buildSiteJsonLd } from '../../lib/structured-data.ts'

describe('absoluteUrl', () => {
  it('always yields one slash between origin and path', () => {
    const a = absoluteUrl('/en/work')
    assert.equal(absoluteUrl('en/work'), a)
    assert.ok(!a.replace('://', '').includes('//'))
    assert.ok(a.endsWith('/en/work'))
  })
})

describe('buildAlternates', () => {
  it('canonical is the page itself; every locale plus x-default is listed', () => {
    const alt = buildAlternates('fa', '/work/x')
    assert.ok(alt.canonical.endsWith('/fa/work/x'))
    assert.deepEqual(Object.keys(alt.languages).sort(), ['en', 'fa', 'x-default'])
    assert.ok(alt.languages.en.endsWith('/en/work/x') && alt.languages.fa.endsWith('/fa/work/x'))
    assert.ok(alt.languages['x-default'].endsWith('/en/work/x'), 'x-default points at the default locale')
  })
  it('the home route has no trailing slash, and an empty path is the home route', () => {
    assert.ok(buildAlternates('en', '/').canonical.endsWith('/en'))
    assert.ok(buildAlternates('en').canonical.endsWith('/en'))
  })
})

describe('buildPageOpenGraph', () => {
  it('en gets the dynamic image; fa keeps the static fallback (Satori has no Persian font)', () => {
    const en = buildPageOpenGraph({ locale: 'en', title: 'T', description: 'D' })
    const fa = buildPageOpenGraph({ locale: 'fa', title: 'ت', description: 'D' })
    assert.ok(en.openGraph.images[0].url.includes('/api/og'))
    assert.equal(fa.openGraph.images[0].url, '/brand/og-image.png')
    assert.equal(fa.twitter.images[0], '/brand/og-image.png')
    assert.deepEqual([en.openGraph.images[0].width, en.openGraph.images[0].height], [1200, 630])
  })
})

describe('JSON-LD', () => {
  it('breadcrumbs are positioned from 1 and use absolute URLs', () => {
    const ld = buildBreadcrumbJsonLd('en', [{ name: 'Home', path: '/en' }, { name: 'Work', path: '/en/work' }])
    assert.equal(ld['@type'], 'BreadcrumbList')
    assert.deepEqual(ld.itemListElement.map((i) => i.position), [1, 2])
    assert.ok(ld.itemListElement.every((i) => /^https?:\/\//.test(i.item)))
  })
  it('FAQPage mirrors the questions in the requested locale', () => {
    const ld = buildFaqPageJsonLd('fa', [{ question: { en: 'Q', fa: 'سوال' }, answer: { en: 'A', fa: 'پاسخ' } }])
    assert.equal(ld.mainEntity[0].name, 'سوال')
    assert.equal(ld.mainEntity[0].acceptedAnswer.text, 'پاسخ')
  })
  it('the site graph is valid JSON-serialisable and every node has a type', () => {
    for (const locale of ['en', 'fa']) {
      const graph = JSON.parse(JSON.stringify(buildSiteJsonLd(locale)))
      const nodes = graph['@graph'] ?? [graph]
      assert.ok(nodes.length >= 2)
      assert.ok(nodes.every((n) => typeof n['@type'] === 'string'))
    }
  })
  it('no aggregate rating or review is ever emitted (B-21: ratings rejected)', () => {
    const serialised = JSON.stringify([buildSiteJsonLd('en'), buildPersonJsonLd('en')])
    assert.ok(!/aggregateRating|ratingValue|reviewCount/.test(serialised))
  })
  it('no price range is published while D-04 is open', () => {
    assert.ok(!/priceRange/.test(JSON.stringify(buildSiteJsonLd('en'))))
  })
})
