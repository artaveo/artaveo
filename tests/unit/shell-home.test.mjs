/**
 * Phase 29 — the rules behind the new shell and Home: what the glass header,
 * its mobile menu and the footer show for the owner's data
 * (`lib/shell-menus.ts`), the real WhatsApp glyph everywhere WhatsApp is
 * offered, and the Home page's section list. The pages themselves are
 * covered by tests/e2e/home.spec.ts.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  buildFooterModel,
  buildHeaderModel,
  buildShellMenus,
  EMPTY_MENUS,
  FOOTER_SERVICE_LIMIT,
  productDemoHref,
  productPageHref,
  projectHref,
} from '../../lib/shell-menus.ts'
import { buildShellData, FALLBACK_SHELL } from '../../lib/shell-settings.ts'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const tx = (en, fa) => ({ en, fa })

const ALL = ['header', 'footer', 'mobile', 'command-palette']
const row = (key, href, surfaces, sort, has_content = true) => ({ key, href, surfaces, has_description: false, has_content, sort_order: sort })
/** The live navigation after migrations 0028 and 0029. */
const LIVE_NAV = [
  row('home', '/', ALL, 0),
  row('products', '/products', ALL, 1),
  row('work', '/work', ALL, 2),
  row('services', '/services', ALL, 3),
  row('process', '/process', ['footer', 'command-palette'], 4),
  row('about', '/about', ALL, 5),
  row('insights', '/insights', ALL, 6, false),
  row('designSystem', '/design-system', ['footer', 'command-palette'], 7),
  row('contact', '/contact', ['footer', 'command-palette'], 8),
  row('start', '/start', ['command-palette'], 9),
  row('privacy', '/privacy', ['footer', 'command-palette'], 11),
  row('terms', '/terms', ['footer', 'command-palette'], 12),
]
const shell = buildShellData(LIVE_NAV, { contact_email: 'a@b.co', whatsapp_number: '+93790685832', phone_number: null, external_profiles: [] })

const project = (slug, extra = {}) => ({
  id: slug,
  slug,
  title: tx(`Title ${slug}`, `عنوان ${slug}`),
  summary: tx(`Summary ${slug}`, `خلاصه ${slug}`),
  outcomeLine: undefined,
  showInPortfolio: true,
  isProduct: true,
  accentColor: '#F2A93B',
  ...extra,
})
const service = (slug, extra = {}) => ({
  id: slug,
  slug,
  title: tx(`Service ${slug}`, `خدمت ${slug}`),
  description: tx('Long description', 'شرح'),
  tagline: tx(`Promise ${slug}`, `وعده ${slug}`),
  kind: 'website',
  ...extra,
})

describe('product links (Phase 30: /products/[slug])', () => {
  it('a product always opens its product page; a portfolio row opens the product page for a product, the project page otherwise', () => {
    assert.equal(productPageHref({ slug: 'clinic' }), '/products/clinic')
    assert.equal(projectHref({ slug: 'clinic', isProduct: true }), '/products/clinic')
    assert.equal(projectHref({ slug: 'bus', isProduct: false }), '/work/bus')
  })
  it('"Request a demo" opens the Brief Builder with the product chosen', () => {
    assert.equal(productDemoHref({ slug: 'clinic' }), '/start?product=clinic')
  })
})

describe('mega menu entries', () => {
  it('are in the page language, with the outcome line before the summary', () => {
    const menus = buildShellMenus([project('a', { outcomeLine: tx('Outcome', 'نتیجه') }), project('b')], [service('web')], 'fa')
    assert.deepEqual(menus.products.map((entry) => [entry.href, entry.title, entry.line]), [
      ['/products/a', 'عنوان a', 'نتیجه'],
      ['/products/b', 'عنوان b', 'خلاصه b'],
    ])
    assert.deepEqual(menus.services, [{ href: '/services/web', title: 'خدمت web', line: 'وعده web', kind: 'website' }])
  })
  it('include a product that is not in the portfolio (its product page is enough), and fall back to the description for a service without a promise', () => {
    const menus = buildShellMenus([project('clinic', { showInPortfolio: false })], [service('x', { tagline: undefined })], 'en')
    assert.deepEqual(menus.products.map((entry) => entry.href), ['/products/clinic'])
    assert.equal(menus.services[0].line, 'Long description')
  })
})

describe('the header (29.1: Products · Services · Work · About)', () => {
  it('with no product published there is no Products menu; Services is a menu; Work and About are links; Home is the logo', () => {
    const model = buildHeaderModel(shell, { products: [], services: [{ href: '/services/web', title: 'Web', line: '…' }] })
    assert.deepEqual(model.products, [])
    assert.equal(model.services.length, 1)
    assert.equal(model.allServicesHref, '/services')
    assert.deepEqual(model.links.map((link) => link.key), ['work', 'about'])
  })
  it('a published product brings the Products menu with "All products"; the owner can still switch the products item off', () => {
    const menus = { products: [{ href: '/products/a', title: 'A', line: '…' }], services: [] }
    assert.equal(buildHeaderModel(shell, menus).products.length, 1)
    assert.equal(buildHeaderModel(shell, menus).allProductsHref, '/products')
    assert.equal(buildHeaderModel(shell, EMPTY_MENUS).allProductsHref, undefined, 'no product → no link to /products')
    const off = buildShellData(LIVE_NAV.map((item) => (item.key === 'products' ? { ...item, has_content: false } : item)), null)
    assert.equal(buildHeaderModel(off, menus).allProductsHref, undefined)
    assert.ok(!buildHeaderModel(shell, menus).links.some((link) => link.key === 'products'), 'Products is the menu, never also a plain link')
  })
  it('with no service published, Services is an ordinary link instead of an empty menu', () => {
    const model = buildHeaderModel(shell, EMPTY_MENUS)
    assert.deepEqual(model.services, [])
    assert.deepEqual(model.links.map((link) => link.key), ['work', 'services', 'about'])
  })
  it('the mobile menu adds the footer-only pages a visitor looks for (Contact), never the legal links or the design system', () => {
    const model = buildHeaderModel(shell, EMPTY_MENUS)
    const keys = model.mobileLinks.map((link) => link.key)
    assert.deepEqual(keys, ['work', 'services', 'about', 'process', 'contact'])
    for (const hidden of ['privacy', 'terms', 'designSystem', 'home', 'products']) assert.ok(!keys.includes(hidden), hidden)
  })
  it('the built-in fallback (database unreachable) still gives a working header', () => {
    const model = buildHeaderModel(FALLBACK_SHELL, EMPTY_MENUS)
    assert.deepEqual(model.links.map((link) => link.key), ['work', 'services', 'about'])
  })
})

describe('the footer (§ 14.0: Products · Services · Artaveo · contact; legal)', () => {
  it('lists products, at most five services with "All services", the site pages and the legal links', () => {
    const services = Array.from({ length: 7 }, (_, i) => ({ href: `/services/s${i}`, title: `S${i}`, line: '' }))
    const model = buildFooterModel(shell, { products: [{ href: '/products/a', title: 'A', line: '' }], services })
    assert.equal(model.products.length, 1)
    assert.equal(model.allProductsHref, undefined, 'one product: its own link is enough')
    assert.equal(model.services.length, FOOTER_SERVICE_LIMIT)
    assert.equal(model.allServicesHref, '/services')
    assert.deepEqual(model.pages.map((link) => link.key), ['work', 'process', 'about', 'designSystem', 'contact'])
    assert.deepEqual(model.legal.map((link) => link.key), ['privacy', 'terms'])
  })
  it('no "All services" link when the column already lists every service', () => {
    const model = buildFooterModel(shell, { products: [], services: [{ href: '/services/a', title: 'A', line: '' }] })
    assert.equal(model.allServicesHref, undefined)
  })
})

describe('the WhatsApp glyph (owner, 18 October 2026)', () => {
  const brand = (file) => read(`components/brand/${file}`)
  it('is one shared component drawing WhatsApp\'s own phone-in-a-bubble outline', () => {
    const icon = brand('whatsapp-icon.tsx')
    assert.match(icon, /M17\.472 14\.382c/)
    assert.match(icon, /fill="currentColor"/)
    assert.match(icon, /aria-hidden="true"/)
  })
  it('every WhatsApp action uses it — no generic chat bubble is left', () => {
    for (const file of ['whatsapp-button.tsx', 'cta-band.tsx', 'glass-header.tsx']) {
      const source = brand(file)
      assert.match(source, /WhatsAppIcon/, file)
      assert.doesNotMatch(source, /MessageCircle/, file)
    }
    assert.match(read('components/site/site-footer.tsx'), /WhatsAppIcon/)
  })
  it('its green is WhatsApp\'s own on ink, and the button keeps the darker green behind white', () => {
    const css = read('app/globals.css')
    assert.match(css, /--whatsapp-glyph:\s*#25d366/)
    assert.match(css, /--whatsapp:\s*#15803d/)
  })
})

describe('the current page in the header', () => {
  it('is marked with a fill and a gold bar, never gold text (gold on glass over a white page is 3.6:1 — found by CI)', () => {
    const header = read('components/brand/glass-header.tsx')
    assert.match(header, /aria-current=\{isCurrent\(link\.href\) \? 'page' : undefined\}/)
    assert.doesNotMatch(header, /aria-\[current=page\]:text-gold/)
    assert.match(header, /aria-\[current=page\]:shadow-\[inset_0_-2px_0_var\(--color-gold\)\]/)
  })
})

describe('Home (29.2)', () => {
  const page = read('app/[locale]/page.tsx')
  it('is built from the Design System 2.0 sections, in the sample\'s order', () => {
    const order = ['<HomeHero', '<PlatformsStrip', '<ProductBlockList', '<PortfolioList', '<ServiceKindGrid', '<ProcessSteps', '<Recommendations', '<CtaBand']
    const positions = order.map((marker) => page.indexOf(marker))
    positions.forEach((position, i) => assert.ok(position > 0, `${order[i]} is on Home`))
    assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  })
  it('drops the capability strip, tech stack, "one developer" section, About preview and Insights preview', () => {
    const home = readdirSync(new URL('../../components/home', import.meta.url))
    for (const gone of ['capability-strip.tsx', 'tech-stack.tsx', 'why-artaveo.tsx', 'about-preview.tsx', 'insights-preview.tsx']) {
      assert.ok(!home.includes(gone), gone)
    }
    assert.doesNotMatch(page, /CapabilityStrip|TechStack|WhyArtaveo|AboutPreview|InsightsPreview/)
  })
  it('never shows ways to get a product (§ 14.1: product page only)', () => {
    assert.doesNotMatch(page, /SaleOption|AfterSales/)
  })
  it('the header carries no "⌘K" text and no theme switch; the switch moved to the footer', () => {
    const header = read('components/site/site-header.tsx').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.doesNotMatch(header, /⌘K|<Kbd|ThemeToggle/)
    assert.match(read('components/site/site-footer.tsx'), /ThemeToggle tone="ink"/)
  })
})
