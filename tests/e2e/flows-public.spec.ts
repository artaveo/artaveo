
import { expect, test, ROUTES } from './support'

test.describe('Home → Work → Case study', () => {
  test('a visitor can click through from the home page to a case study and see its story', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('banner').getByRole('link', { name: 'Work', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/work$/)
    await expect(page.locator('h1')).toHaveCount(1)

    await page.locator('main a[href="/en/work/transportation-system"]').first().click()
    await expect(page).toHaveURL(/\/en\/work\/transportation-system$/)
    await expect(page.locator('h1')).toContainText('Transportation System')
    // The case study is real content, not a shell: several sections, each with a heading and text.
    expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(5)
    await expect(page.getByRole('link', { name: /start a project/i }).first()).toBeVisible()
  })

  test('the same journey works in Persian and stays right-to-left', async ({ page }) => {
    await page.goto('/fa')
    await page.getByRole('banner').locator('a[href="/fa/work"]').first().click()
    await expect(page).toHaveURL(/\/fa\/work$/)
    await page.locator('main a[href="/fa/work/pazhuhesh-portal"]').first().click()
    await expect(page).toHaveURL(/\/fa\/work\/pazhuhesh-portal$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('case studies have canonical, language alternates and structured data', async ({ page }) => {
    await page.goto('/en/work/transportation-system')
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/en\/work\/transportation-system$/)
    await expect(page.locator('link[rel=alternate][hreflang=fa]')).toHaveAttribute('href', /\/fa\/work\/transportation-system$/)
    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''))
    expect(types.join(' ')).toContain('CreativeWork')
  })
})

test.describe('Service → Package → Brief Builder', () => {
  test('choosing a package carries the service and the package into the brief', async ({ page }) => {
    await page.goto('/en/services')
    await page.locator('main a[href="/en/services/business-website"]').first().click()
    await expect(page.locator('h1')).toContainText('Business Website')
    // Three tiers, the last one always "scoped after discovery".
    const choose = page.locator('a[href*="/start?service=business-website&package="]')
    expect(await choose.count()).toBeGreaterThanOrEqual(3)
    await page.locator('a[href="/en/start?service=business-website&package=standard"]').first().click()
    await expect(page).toHaveURL(/\/en\/start\?service=business-website&package=standard/)
    await expect(page.locator('#brief-service-hidden-input')).toHaveValue('business-website')
  })

  test('every price on the service page is an honest "Ask for a quote" — no invented figure (D-04)', async ({ page }) => {
    for (const locale of ['en', 'fa']) {
      await page.goto(`/${locale}/services/business-website`)
      const text = await page.locator('main').innerText()
      expect(text, `${locale}: a currency amount appeared on a service page`).not.toMatch(/[$€£]\s?\d|\d\s?(USD|EUR)\b|[$€£]\s?[۰-۹]/)
    }
  })
})

test.describe('language switch on every route type', () => {
  for (const [label, route] of ROUTES) {
    test(`${label}: EN → فا → EN keeps the same page`, async ({ page }) => {
      await page.goto(`/en${route}`)
      await page.getByRole('banner').getByRole('button', { name: 'فا' }).click()
      await expect(page).toHaveURL(new RegExp(`/fa${route.replace(/[/-]/g, '\\$&')}(\\?.*)?$`))
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.locator('h1')).toHaveCount(1)
      await page.getByRole('banner').getByRole('button', { name: 'EN' }).click()
      await expect(page).toHaveURL(new RegExp(`/en${route.replace(/[/-]/g, '\\$&')}(\\?.*)?$`))
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    })
  }

  test('the switch keeps the query string (a chosen package survives it)', async ({ page }) => {
    await page.goto('/en/start?service=business-website&package=standard')
    await page.getByRole('banner').getByRole('button', { name: 'فا' }).click()
    await expect(page).toHaveURL(/\/fa\/start\?service=business-website&package=standard/)
  })
})

test.describe('theme', () => {
  test('switching to dark applies at once, survives a reload and applies to a different page; switching back restores light', async ({ page }) => {
    await page.goto('/en')
    const root = page.locator('html')
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(root).toHaveClass(/\bdark\b/)
    await page.reload()
    await expect(root).toHaveClass(/\bdark\b/)
    await page.goto('/en/about')
    await expect(root).toHaveClass(/\bdark\b/)
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(root).not.toHaveClass(/\bdark\b/)
    await page.reload()
    await expect(root).not.toHaveClass(/\bdark\b/)
  })

  test('the theme control is named in the page language (a screen-reader user of the Persian site hears Persian)', async ({ page }) => {
    await page.goto('/fa')
    const control = page.getByRole('banner').getByRole('button', { name: /حالت/ })
    await expect(control).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^Switch to/ })).toHaveCount(0)
  })

})
