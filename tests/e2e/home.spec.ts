import type { Page } from '@playwright/test'

import { expect, msg, test } from './support'

/**
 * Phase 29 — the shell and Home of Design System 2.0, on the built app and the
 * test stack's data (two portfolio projects without screenshots, the
 * services, no published product, the WhatsApp number from migration 0026).
 * Accessibility of Home in both languages and themes is a11y.spec.ts's; no
 * sideways scrolling on a phone is mobile.spec.ts's.
 */

const setTheme = (page: Page, theme: 'light' | 'dark') =>
  page.addInitScript((t) => {
    localStorage.setItem('artaveo-theme', t)
  }, theme)

for (const locale of ['en', 'fa'] as const) {
  test(`Home is the seven sections of the design, each from data (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(msg(locale, 'Home.heroTitle'))

    // Platforms strip: kinds of software, never technology names.
    const strip = page.locator('[data-slot="platforms-strip"]')
    await expect(strip.locator('li')).toHaveCount(5)
    await expect(strip).not.toContainText(/React|Next|PostgreSQL|TypeScript/)

    // No product is published on the test stack: no Products section, and the hero's second action is the work.
    await expect(page.locator('[data-slot="home-products"]')).toHaveCount(0)
    await expect(page.locator('[data-slot="home-hero"]').getByRole('link', { name: msg(locale, 'Home.heroSeeWork') })).toHaveAttribute('href', `/${locale}/work`)

    // Work: one row per project, each its own block linking to its page.
    const rows = page.locator('[data-slot="home-work"] [data-slot="portfolio-row"]')
    expect(await rows.count()).toBeGreaterThanOrEqual(1)
    await expect(rows.first().getByRole('link').last()).toHaveAttribute('href', new RegExp(`^/${locale}/work/`))

    // Services and the four steps on the warm panel, then the CTA band.
    expect(await page.locator('[data-slot="home-services"] [data-slot="service-card"]').count()).toBeGreaterThanOrEqual(1)
    await expect(page.locator('[data-slot="process-steps"] > li')).toHaveCount(4)
    await expect(page.locator('[data-slot="home-cta"] [data-slot="cta-band"]')).toBeVisible()

    // Retired sections stay gone, and nothing on Home offers ways to buy (product page only).
    const main = page.locator('main')
    await expect(main).not.toContainText(/one developer|independent full-stack|Tech stack/i)
    await expect(main.locator('[data-slot="sale-option-card"]')).toHaveCount(0)
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`dark bands stay ink and content panels stay warm in the ${theme} theme`, async ({ page }) => {
    await setTheme(page, theme)
    await page.goto('/en')
    for (const slot of ['home-hero', 'home-cta', 'brand-footer']) {
      await expect(page.locator(`[data-slot="${slot}"]`)).toHaveCSS('background-color', 'rgb(10, 12, 17)')
    }
    for (const slot of ['home-work', 'home-services']) {
      await expect(page.locator(`[data-slot="${slot}"]`)).toHaveCSS('background-color', 'rgb(244, 242, 237)')
    }
  })
}

test('the header: menus and links from the data, a search icon without "⌘K", the language link, Start a Project', async ({ page }) => {
  await page.goto('/en')
  const header = page.getByRole('banner')
  await expect(header).not.toContainText('⌘K')
  const nav = header.getByRole('navigation', { name: msg('en', 'Brand.mainNav') })
  await expect(nav.getByRole('button', { name: msg('en', 'Brand.services') })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Work', exact: true })).toBeVisible()
  await expect(nav.getByRole('button', { name: msg('en', 'Brand.products') })).toHaveCount(0) // no product published
  await expect(header.getByRole('button', { name: msg('en', 'Brand.search') })).toBeVisible()
  await expect(header.getByRole('link', { name: 'دری', exact: true })).toHaveAttribute('href', '/fa')
  await expect(header.getByRole('link', { name: msg('en', 'Brand.start') })).toHaveAttribute('href', '/en/start')

  await page.goto('/en/work')
  await expect(nav.getByRole('link', { name: 'Work', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('every WhatsApp action shows the real WhatsApp glyph, and the floating button opens the admin\'s number', async ({ page }) => {
  await page.goto('/en')
  const button = page.locator('[data-slot="whatsapp-button"]')
  await expect(button).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+$/)
  await expect(button).toHaveAccessibleName(msg('en', 'Brand.whatsapp'))
  await expect(button.locator('[data-slot="whatsapp-icon"] path')).toHaveAttribute('d', /^M17\.472 14\.382c/)
  await expect(page.locator('[data-slot="cta-band"] [data-slot="whatsapp-icon"]')).toHaveCount(1)
  await expect(page.getByRole('contentinfo').locator('[data-slot="whatsapp-icon"]')).toHaveCount(1)
})

test('the footer: Services · Artaveo · Contact columns, the legal row and the year in the page\'s calendar', async ({ page }) => {
  await page.goto('/fa')
  const footer = page.getByRole('contentinfo')
  for (const column of [msg('fa', 'Brand.services'), msg('fa', 'Brand.footerArtaveo'), msg('fa', 'Brand.footerContact')]) {
    await expect(footer.getByRole('navigation', { name: column })).toBeVisible()
  }
  await expect(footer.getByRole('navigation', { name: msg('fa', 'Brand.products') })).toHaveCount(0)
  await expect(footer).toContainText(/© ۱۴[۰-۹]{2}/) // Persian digits: `\d` would only match 0–9
  await expect(footer.getByRole('link', { name: msg('fa', 'Nav.privacy') })).toBeVisible()
})
