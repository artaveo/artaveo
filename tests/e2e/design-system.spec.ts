import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { expect, msg, test } from './support'

/**
 * Phase 28 — Design System 2.0 on /design-system: every component renders
 * from real data in both languages (so both directions) and both themes, at
 * the three preview widths without anything spilling sideways; axe finds
 * nothing in the new sections; glass turns solid under reduced transparency;
 * motion is off under reduced motion; the mega menu works by keyboard; and the
 * whole-page fade is gone from the site.
 */

const DS2 = ['#ds2-tokens', '#ds2-type', '#ds2-glass', '#ds2-motion', '#ds2-components']

/** Always drawn: the test stack's data (seed projects, services) is enough for each. */
const COMPONENTS = [
  'glass-header',
  'product-block',
  'portfolio-row',
  'service-card',
  'process-steps',
  'sale-option-card',
  'after-sales',
  'cta-band',
  'brand-footer',
]

/**
 * Drawn only from real data, never invented: mock-ups and the article card need a
 * project screenshot (the test stack's seed projects have none — the live site's
 * do), the WhatsApp button needs the number set in the admin. Each must then be
 * consistently present or absent.
 */
const fromData = (page: Page) =>
  page.evaluate(() => {
    const has = (slot: string) => document.querySelector(`[data-slot="${slot}"]`) !== null
    return {
      laptop: has('laptop-mockup'),
      phone: has('phone-mockup'),
      article: has('article-card'),
      whatsappButton: has('whatsapp-button'),
      whatsappLink: document.querySelector('[data-slot="cta-band"] a[href^="https://wa.me/"]') !== null,
    }
  })

const setTheme = (page: Page, theme: 'light' | 'dark') =>
  page.evaluate((t) => {
    localStorage.setItem('artaveo-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    document.documentElement.classList.toggle('light', t === 'light')
  }, theme)

/** How far any element inside a preview reaches past the preview's own edges (it clips, so measure). */
const spill = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = []
    for (const frame of document.querySelectorAll<HTMLElement>('[data-preview-width]')) {
      const box = frame.getBoundingClientRect()
      for (const el of frame.querySelectorAll<HTMLElement>('*')) {
        if (el.closest('[aria-hidden="true"]')) continue
        const r = el.getBoundingClientRect()
        if (r.width === 0) continue
        if (r.right > box.right + 1 || r.left < box.left - 1) found.push(`${frame.querySelector('[data-slot]')?.getAttribute('data-slot')}: ${el.tagName}.${String(el.className).slice(0, 60)}`)
      }
    }
    return found.slice(0, 5)
  })

for (const locale of ['en', 'fa'] as const) {
  test(`every Design System 2.0 component renders, at every width (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/design-system`)
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr')
    for (const slot of COMPONENTS) await expect(page.locator(`[data-slot="${slot}"]`).first(), slot).toBeAttached()
    const data = await fromData(page)
    expect(data.article, 'the article card shows exactly when a screenshot exists for its cover').toBe(data.laptop)
    if (data.phone) expect(data.laptop, 'a phone only ever stands beside a laptop').toBe(true)
    expect(data.whatsappButton, 'the WhatsApp button and the WhatsApp actions come from the same number').toBe(data.whatsappLink)

    for (const label of ['Phone · 375', 'Tablet · 768', 'Desktop · 1240']) {
      await page.getByRole('radio', { name: label }).click()
      await expect(page.getByRole('radio', { name: label })).toHaveAttribute('aria-checked', 'true')
      expect(await spill(page), `nothing spills out of a preview at ${label}`).toEqual([])
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    // At desktop width each CTA band spans its band — it once shrank to a one-word-wide column.
    const narrowest = await page.evaluate(() => Math.min(...[...document.querySelectorAll<HTMLElement>('[data-slot="cta-band"]')].map((el) => el.getBoundingClientRect().width)))
    expect(narrowest).toBeGreaterThan(600)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`axe finds nothing in the Design System 2.0 sections (${locale}, ${theme})`, async ({ page }) => {
      await page.goto(`/${locale}/design-system`)
      await setTheme(page, theme)
      let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      for (const section of DS2) builder = builder.include(section)
      const results = await builder.analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.help} — ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
    })
  }
}

test('the mega menu opens, closes with Escape and gives focus back (keyboard)', async ({ page }) => {
  await page.goto('/en/design-system')
  const header = page.locator('[data-slot="glass-header"]')
  const services = header.getByRole('button', { name: msg('en', 'Brand.services') })
  await services.focus()
  await page.keyboard.press('Enter')
  await expect(services).toHaveAttribute('aria-expanded', 'true')
  const panel = page.locator(`#${await services.getAttribute('aria-controls')}`)
  await expect(panel.getByRole('link').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(services).toHaveAttribute('aria-expanded', 'false')
  await expect(services).toBeFocused()
})

test('at phone width the header folds its links into the menu button', async ({ page }) => {
  await page.goto('/en/design-system')
  await page.getByRole('radio', { name: 'Phone · 375' }).click()
  const header = page.locator('[data-slot="glass-header"]')
  const menu = header.getByRole('button', { name: msg('en', 'Brand.openMenu') })
  await expect(menu).toBeVisible()
  await expect(header.getByRole('navigation', { name: msg('en', 'Brand.mainNav') })).toBeHidden()
  await menu.click()
  await expect(header.getByRole('navigation', { name: msg('en', 'Brand.mobileNav') }).getByRole('link', { name: msg('en', 'Brand.work') })).toBeVisible()
})

test('glass becomes a solid surface when the visitor asks for less transparency', async ({ page }) => {
  await page.goto('/en/design-system')
  const sample = page.getByTestId('glass-sample')
  await expect(sample).toHaveCSS('background-color', 'rgba(10, 12, 17, 0.74)')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  await expect(sample).toHaveCSS('background-color', 'rgb(23, 26, 34)')
  await expect(sample).toHaveCSS('backdrop-filter', 'none')
})

test.describe('with motion allowed', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })
  test('cards lift on hover', async ({ page }) => {
    await page.goto('/en/design-system')
    const card = page.getByTestId('lift-sample')
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')
  })
})

test('with reduced motion nothing moves and nothing waits to be revealed', async ({ page }) => {
  // The suite's default context already asks for reduced motion.
  await page.goto('/en/design-system')
  const card = page.getByTestId('lift-sample')
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  await expect(card).toHaveCSS('transform', 'none')
  await page.mouse.wheel(0, 20000)
  expect(await page.locator('[data-reveal="pending"]').count()).toBe(0)
})

test('pages no longer fade in as a whole on navigation', async ({ page }) => {
  await page.goto('/en')
  expect(await page.locator('main > [class*="animate-in"]').count()).toBe(0)
})
