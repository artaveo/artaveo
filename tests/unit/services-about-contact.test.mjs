/**
 * Phase 31 — Services, About, Contact & Start: the service catalogue by kind
 * of software (the seed and migration 0030 agree), the retired /process page
 * and old service addresses, the Service structured data with the owner's
 * "from" price only, direct contact channels only, the legal pages' contact
 * address from the admin, and that the retired freelancer pieces are gone.
 * The pages themselves are covered by tests/e2e/flows-public.spec.ts.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import nextConfig from '../../next.config.mjs'
import { getDirectContactChannels } from '../../lib/contact-content.ts'
import { getPrivacyPolicy, getTermsOfService } from '../../lib/legal-content.ts'
import { getAllServicesRaw } from '../../lib/services-content.ts'
import { buildServiceJsonLd } from '../../lib/structured-data.ts'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const en = JSON.parse(read('messages/en.json'))
const fa = JSON.parse(read('messages/fa.json'))

describe('services by kind of software (31.1)', () => {
  const services = getAllServicesRaw()

  it('five services: websites, web systems, mobile apps, desktop software, support', () => {
    assert.deepEqual(services.map((s) => s.slug), ['websites', 'web-systems', 'mobile-apps', 'desktop-software', 'support'])
    assert.deepEqual(services.map((s) => s.kind), ['website', 'web-system', 'mobile-app', 'desktop-software', 'support'])
  })
  it('each one has what you get, four steps, questions and a promise — and no invented price or package', () => {
    for (const service of services) {
      assert.ok(service.deliverables.length >= 4, service.slug)
      assert.equal(service.process?.length, 4, service.slug)
      assert.ok((service.faq?.length ?? 0) >= 2, service.slug)
      assert.ok(service.tagline?.en && service.tagline?.fa, service.slug)
      assert.equal(service.fromPrice, undefined, `${service.slug}: the owner sets prices (D-04)`)
      assert.equal(service.packages, undefined, service.slug)
    }
  })
  it('the copy follows § 16.1: no technology names, no freelancer menu, no «من»', () => {
    const text = JSON.stringify(services)
    assert.doesNotMatch(text, /\b(CMS|MVP|API|SEO|React|Next\.js|PostgreSQL|Supabase|Neon)\b|Discovery Sprint|Care Plan|full-stack|فول‌استک|\bI\b|\bme\b|\bmy\b|(^|[\s«])من([\s،.»]|$)/)
  })
  it('migration 0030 carries exactly the seed (generated from it) and keeps the old services unpublished, not deleted', () => {
    const sql = read('db/migrations/0030_services_catalogue.sql')
    for (const service of services) {
      assert.match(sql, new RegExp(`-- service: ${service.slug}\\r?\\n`))
      assert.ok(sql.includes(service.title.fa) && sql.includes(service.title.en), service.slug)
    }
    assert.match(sql, /set published = false, sort_order = sort_order \+ 100/)
    assert.doesNotMatch(sql, /^delete from public\.services/m)
    assert.match(sql, /delete from public\.navigation_items where key = 'process'/)
    assert.equal((sql.match(/select 'global', null/g) ?? []).length, 5, 'five questions of "how working together goes"')
  })
})

describe('retired addresses (31.1, 31.2)', async () => {
  const redirects = await nextConfig.redirects()
  const find = (source) => redirects.find((r) => r.source === source)

  it('/process → the process part of /services, permanently, with and without a language', () => {
    assert.deepEqual(find('/:locale(en|fa)/process'), { source: '/:locale(en|fa)/process', destination: '/:locale/services#process', permanent: true })
    assert.equal(find('/process').destination, '/services#process')
    assert.equal(existsSync(new URL('../../app/[locale]/process', import.meta.url)), false)
  })
  it('every old service address goes to the service that covers it now', () => {
    const map = {
      'business-website': 'websites',
      'web-application-mvp': 'web-systems',
      'admin-dashboards': 'web-systems',
      'backend-api-database': 'web-systems',
      'performance-accessibility-seo': 'support',
      'bug-fix-rescue': 'support',
      'care-plan': 'support',
    }
    const slugs = new Set(getAllServicesRaw().map((s) => s.slug))
    for (const [from, to] of Object.entries(map)) {
      const rule = find(`/:locale(en|fa)/services/${from}`)
      assert.equal(rule?.destination, `/:locale/services/${to}`, from)
      assert.equal(rule.permanent, true)
      assert.ok(slugs.has(to), `${to} exists`)
    }
  })
  it('nothing links to /process any more: menus, search, sitemap', () => {
    for (const file of ['lib/site.ts', 'lib/shell-settings.ts', 'app/sitemap.ts']) assert.doesNotMatch(read(file), /'\/process'|'process'/, file)
    assert.equal(en.Nav.process, undefined)
    assert.equal(en.ProcessPage, undefined)
  })
})

describe('Service structured data (31.1, D-04)', () => {
  const base = { id: 's', slug: 'websites', icon: 'Globe', title: { en: 'Websites', fa: 'وب‌سایت' }, description: { en: 'd', fa: 'd' }, deliverables: [] }

  it('no Offer without a price the owner set', () => {
    assert.equal(buildServiceJsonLd('en', base).offers, undefined)
  })
  it('a "from" price is a minimum: one Offer per currency with minPrice', () => {
    const ld = buildServiceJsonLd('fa', { ...base, fromPrice: { afn: 25000, usd: 400 } })
    assert.deepEqual(
      ld.offers.map((o) => [o.priceSpecification.priceCurrency, o.priceSpecification.minPrice]),
      [
        ['AFN', 25000],
        ['USD', 400],
      ],
    )
    assert.ok(ld.offers.every((o) => o.price === undefined))
  })
})

describe('contact: direct channels only (31.4, D-05)', () => {
  it('WhatsApp, phone, e-mail — in that order, each only when the owner set it', () => {
    const all = getDirectContactChannels({ email: 'a@b.co', whatsappNumber: '+93790685832', phoneNumber: '+93700000000' })
    assert.deepEqual(all.map((c) => c.id), ['whatsapp', 'phone', 'email'])
    assert.equal(all[0].href, 'https://wa.me/93790685832')
    assert.equal(all[0].external, true)
    assert.deepEqual(getDirectContactChannels({ email: null, whatsappNumber: null, phoneNumber: null }), [])
  })
  it('the hire-channel selector and the availability widget are gone from the public pages', () => {
    assert.equal(existsSync(new URL('../../components/contact/hire-channel-selector.tsx', import.meta.url)), false)
    for (const file of ['components/contact/contact-content.tsx', 'components/about/about-content.tsx', 'components/site/site-shell.tsx']) {
      assert.doesNotMatch(read(file), /HireChannel|AvailabilityCard|StickyMobileCta|Fiverr/, file)
    }
  })
})

describe('about (31.3)', () => {
  it('the studio and its founder: no "one person", no technical focus, no tools, no languages or time zone', () => {
    const code = read('components/about/about-content.tsx').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.doesNotMatch(code, /\.focus|getTechStack|getWorkingLanguages|timezone|AvailabilityCard/)
    const copy = JSON.stringify([en.AboutPage, fa.AboutPage])
    assert.doesNotMatch(copy, /one person|independent|full-stack|developer|یک نفر|توسعه‌دهنده|فول‌استک|(^|[\s«"])من[\s،.»"]/)
    assert.equal(fa.AboutPage.founderName, 'ذاکر ناصری')
  })
})

describe('copy of the rebuilt pages (§ 16)', () => {
  const namespaces = ['ServicesIndex', 'ServiceDetail', 'WayOfWorking', 'AboutPage', 'ContactPage', 'StartPage', 'ConsultationPage', 'BriefBuilder']
  it('Dari speaks to «شما», never «تو»', () => {
    const text = JSON.stringify(namespaces.map((ns) => fa[ns]))
    assert.doesNotMatch(text, /می‌کنی[\s،."]|می‌خواهی[\s،."]|بفرست[\s،."]|بگو[\s،."]|داری[\s،."؟]/)
  })
  it('no engagement model, Discovery Sprint, Care Plan or hire-channel language (31 exit criteria)', () => {
    const text = JSON.stringify(namespaces.flatMap((ns) => [en[ns], fa[ns]]))
    assert.doesNotMatch(text, /engagement model|Discovery Sprint|Care Plan|Fiverr|escrow|freelanc|hire|مدل همکاری|Brief Builder/i)
  })
  it('/consultation is «گرفتن وقت مشوره»', () => {
    assert.equal(fa.Nav.consultation, 'گرفتن وقت مشوره')
    assert.equal(fa.ConsultationPage.metaTitle, 'گرفتن وقت مشوره')
  })
})

describe('legal pages read the contact address from the admin (Phase 27 debt, closed in 31)', () => {
  it('the address the owner set appears wherever the texts name one', () => {
    for (const doc of [getPrivacyPolicy('owner@example.com'), getTermsOfService('owner@example.com')]) {
      const text = JSON.stringify(doc)
      assert.match(text, /owner@example\.com/)
      assert.doesNotMatch(text, /\{email\}/)
    }
  })
  it('the founder is named correctly and not as "one independent developer"', () => {
    const text = JSON.stringify([getPrivacyPolicy(), getTermsOfService()])
    assert.doesNotMatch(text, /زکریا نصری|one independent developer|توسعه‌دهنده‌ی مستقل/)
    assert.match(text, /ذاکر ناصری/)
  })
})
