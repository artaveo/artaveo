
import { expect, test, LEAK, ROUTES } from './support'

/**
 * Every kind of route, in both languages: it answers, is in the right language
 * and direction, has one h1, and shows no leaked template text.
 */
for (const locale of ['en', 'fa'] as const) {
  for (const [label, route] of ROUTES) {
    test(`${label} renders in ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}${route}`)
      expect(response?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr')
      await expect(page.locator('h1')).toHaveCount(1)
      const text = await page.locator('body').innerText()
      expect(text, `leaked template text on ${page.url()}`).not.toMatch(LEAK)
      // No horizontal scrolling on the page body at desktop width.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(0)
    })
  }
}

// KNOWN ISSUE (docs/phases/PHASE-21-README.md): a URL that matches no route at all
// (/en/no-such-page) gets the correct 404 status but is rendered by the ROOT
// app/not-found.tsx — plain, English-only (also under /fa), no site header, no
// <title>, no <h1> — not by the designed per-locale page. Next only uses
// app/[locale]/not-found.tsx when a route matched and then called notFound().
// Pinned as it is: the status must stay 404 and the page must offer a way home.
test('a URL that matches no route is a real 404 with a way back home', async ({ page }) => {
  for (const url of ['/en/no-such-page', '/fa/no-such-page', '/en/no/such/deep/path']) {
    const response = await page.goto(url)
    expect(response?.status(), url).toBe(404)
    await expect(page.getByRole('link', { name: /back to home/i }), url).toBeVisible()
  }
})

// KNOWN ISSUE (docs/phases/PHASE-21-README.md): an unknown slug under a dynamic
// route answers HTTP 200, not 404 — the page streams (loading.tsx) before it finds
// out the record does not exist, and Next then cannot change the status. What is
// pinned here is the safe half: the response is never indexable, and the visitor
// sees the not-found page. If the status is ever fixed, tighten this to 404.
test('an unknown slug under a dynamic route is never indexable and shows the not-found page', async ({ page }) => {
  for (const url of ['/en/work/no-such-project', '/fa/work/no-such-project', '/en/services/no-such-service', '/en/insights/no-such-article']) {
    const response = await page.goto(url)
    expect([200, 404], url).toContain(response?.status())
    if (response?.status() === 200) await expect(page.locator('meta[name=robots]').first(), url).toHaveAttribute('content', /noindex/)
    await expect(page.locator('h1'), url).toHaveCount(1)
    expect(await page.locator('h1').innerText(), `${url} must not render a real record`).not.toMatch(/no-such/i)
  }
})

test('the bare domain and an unsupported locale do not 500', async ({ request }) => {
  for (const url of ['/', '/de', '/de/work']) {
    const response = await request.get(url, { maxRedirects: 0 })
    expect([200, 301, 302, 307, 308, 404], url).toContain(response.status())
  }
})

test('machine-readable routes: sitemap, robots, feeds, manifest', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  expect(xml).toContain('/en/work/transportation-system')
  expect(xml).toContain('/fa/insights/e2e-fixture-article')
  expect(xml, 'admin and private pages are never in the sitemap').not.toMatch(/\/(en|fa)\/admin(\/|<)|\/consultation\/[0-9a-f]{8}|\/recommend\//)

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toMatch(/Disallow:\s*\/admin/)

  for (const locale of ['en', 'fa']) {
    const feed = await request.get(`/${locale}/insights/feed.xml`)
    expect(feed.status()).toBe(200)
    expect(feed.headers()['content-type']).toContain('xml')
    expect(await feed.text()).toContain('e2e-fixture-article')
  }
  expect((await request.get('/manifest.webmanifest')).status()).toBeLessThan(400)
})

test('the daily cron route refuses callers without the secret (fails closed)', async ({ request }) => {
  expect((await request.get('/api/cron/notifications')).status()).toBe(401)
  expect((await request.get('/api/cron/notifications', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)
  const ok = await request.get('/api/cron/notifications', { headers: { authorization: 'Bearer test-only-cron-secret-0123456789' } })
  expect(ok.status()).toBe(200)
})

test('private pages are not indexable', async ({ page }) => {
  await page.goto('/en/consultation/0123456789abcdef0123456789abcdef0123456789abcdef')
  await expect(page.locator('meta[name=robots]').first()).toHaveAttribute('content', /noindex/)
  await page.goto('/en/admin/login')
  await expect(page.locator('meta[name=robots]').first()).toHaveAttribute('content', /noindex/)
})
