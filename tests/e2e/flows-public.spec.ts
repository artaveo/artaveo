
import { expect, test, ROUTES } from './support'

test.describe('Home → Work → Case study', () => {
  test('a visitor can click through from the home page to a case study and see its story', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('banner').getByRole('link', { name: 'Work', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/work$/)
    await expect(page.locator('h1')).toHaveCount(1)

    await page.locator('main a[href="/en/work/transportation-system"]').first().click()
    await expect(page).toHaveURL(/\/en\/work\/transportation-system$/)
    await expect(page.locator('h1')).toContainText('Ticket Sales & Transport Management')
    // The case study is real content, not a shell (Phase 27.2): built from its blocks — the features block lists what it does —
    // and none of the archived engineering sections comes back.
    await expect(page.getByRole('heading', { name: 'What it does', level: 2 })).toBeVisible()
    expect(await page.locator('main section li').count()).toBeGreaterThanOrEqual(3)
    for (const archived of ['Context', 'Problem & goals', 'Architecture', 'Responsive & RTL', 'Key decisions']) {
      await expect(page.getByRole('heading', { name: archived, exact: true })).toHaveCount(0)
    }
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

test.describe('Services → Service → Brief Builder (Phase 31.1)', () => {
  test('the services are the five kinds of software, and a service carries itself into the brief', async ({ page }) => {
    await page.goto('/en/services')
    for (const slug of ['websites', 'web-systems', 'mobile-apps', 'desktop-software', 'support']) {
      await expect(page.locator(`main a[href="/en/services/${slug}"]`).first()).toBeVisible()
    }
    // the process part and "how working together goes" live on the same page (31.2)
    await expect(page.locator('#process [data-slot="process-steps"] > li')).toHaveCount(4)
    await expect(page.locator('#working-together details')).toHaveCount(5)
    await page.locator('main a[href="/en/services/websites"]').first().click()
    await expect(page.locator('h1')).toContainText('Business websites')
    await expect(page.locator('[data-slot="process-steps"] > li')).toHaveCount(4)
    await page.locator('a[href="/en/start?service=websites"]').first().click()
    await expect(page).toHaveURL(/\/en\/start\?service=websites/)
    await expect(page.locator('#brief-service-hidden-input')).toHaveValue('websites')
  })

  test('no invented price on a service page — "price after a short conversation" until the owner sets one (D-04)', async ({ page }) => {
    for (const locale of ['en', 'fa']) {
      await page.goto(`/${locale}/services/websites`)
      const text = await page.locator('main').innerText()
      expect(text, `${locale}: a currency amount appeared on a service page`).not.toMatch(/[$€£]\s?\d|\d\s?(USD|EUR)\b|[$€£]\s?[۰-۹]|دالر|افغانی/)
      expect(text).toContain(locale === 'en' ? 'Price after a short conversation' : 'قیمت بعد از یک گفتگوی کوتاه')
    }
  })

  // Project summaries shown in "work of this kind" are database text rewritten in Phase 32.5, so only the freelancer menu is checked here.
  test('no freelancer-menu language is left on the public pages (31 exit criteria)', async ({ page }) => {
    for (const locale of ['en', 'fa']) {
      for (const route of ['/services', '/services/web-systems', '/services/support', '/about', '/contact', '/start', '/consultation']) {
        await page.goto(`/${locale}${route}`)
        const text = await page.locator('main').innerText()
        expect(text, `${locale}${route}`).not.toMatch(/Discovery Sprint|Care Plan|engagement model|Fiverr|escrow|freelanc|full-stack|فول‌استک|مدل همکاری|یک توسعه‌دهنده|Brief Builder/i)
      }
    }
  })
})

test.describe('retired addresses (Phase 31)', () => {
  test('/process goes to the process part of /services, in both languages', async ({ page }) => {
    for (const locale of ['en', 'fa']) {
      const response = await page.request.get(`/${locale}/process`, { maxRedirects: 0 })
      expect(response.status()).toBe(308)
      expect(response.headers().location).toBe(`/${locale}/services#process`)
    }
    await page.goto('/en/process')
    await expect(page).toHaveURL(/\/en\/services#process$/)
    await expect(page.locator('#process')).toBeInViewport()
  })

  test('an old service address goes to the service that covers it now', async ({ page }) => {
    for (const [from, to] of [['business-website', 'websites'], ['admin-dashboards', 'web-systems'], ['care-plan', 'support']]) {
      const response = await page.request.get(`/fa/services/${from}`, { maxRedirects: 0 })
      expect(response.status(), from).toBe(308)
      expect(response.headers().location).toBe(`/fa/services/${to}`)
    }
  })
})

// Phase 29.1: the switch is one link to the other language, named in that language («دری», "English").
test.describe('language switch on every route type', () => {
  for (const [label, route] of ROUTES) {
    test(`${label}: EN → دری → EN keeps the same page`, async ({ page }) => {
      await page.goto(`/en${route}`)
      await page.getByRole('banner').getByRole('link', { name: 'دری', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/fa${route.replace(/[/-]/g, '\\$&')}(\\?.*)?$`))
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.locator('h1')).toHaveCount(1)
      await page.getByRole('banner').getByRole('link', { name: 'English', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/en${route.replace(/[/-]/g, '\\$&')}(\\?.*)?$`))
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    })
  }

  test('the switch keeps the query string (a chosen package survives it)', async ({ page }) => {
    await page.goto('/en/start?service=websites&package=standard')
    await page.getByRole('banner').getByRole('link', { name: 'دری', exact: true }).click()
    await expect(page).toHaveURL(/\/fa\/start\?service=websites&package=standard/)
  })
})

// Phase 31 (owner): the theme switch is in the glass header again, at every width.
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
