import { clickWhenReady, expect, msg, ROUTES, test } from './support'

/** Phone viewport (Pixel 5), Persian and English. Only tests tagged @mobile run in the `mobile` project. */

test.describe('@mobile every page fits a phone', () => {
  for (const locale of ['en', 'fa'] as const) {
    for (const [label, route] of ROUTES) {
      test(`@mobile ${label} (${locale}) does not scroll sideways`, async ({ page }) => {
        await page.goto(`/${locale}${route}`)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(0)
      })
    }
  }
})

test.describe('@mobile navigation', () => {
  // Phase 29.1: the glass header's menu — a disclosure button and a glass sheet with the pages.
  test('@mobile the menu opens, lists the pages, navigates, and closes', async ({ page }) => {
    await page.goto('/en')
    const button = page.getByRole('banner').getByRole('button', { name: msg('en', 'Brand.openMenu') })
    await clickWhenReady(button)
    const nav = page.getByRole('banner').getByRole('navigation', { name: msg('en', 'Brand.mobileNav') })
    await expect(nav.getByRole('link', { name: 'Services' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Contact' })).toBeVisible()
    await nav.getByRole('link', { name: 'Services' }).click()
    await expect(page).toHaveURL(/\/en\/services$/)
    await expect(page.getByRole('banner').getByRole('button', { name: msg('en', 'Brand.openMenu') })).toBeVisible()
    await expect(nav).toHaveCount(0)
  })

  test('@mobile the menu works right-to-left in Persian', async ({ page }) => {
    await page.goto('/fa')
    await clickWhenReady(page.getByRole('banner').getByRole('button', { name: msg('fa', 'Brand.openMenu') }))
    await expect(page.getByRole('banner').getByRole('navigation', { name: msg('fa', 'Brand.mobileNav') })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

test('@mobile the Brief Builder can be started and answered with touch', async ({ page }) => {
  await page.goto('/en/start')
  await clickWhenReady(page.getByRole('button', { name: 'Next', exact: true }))
  await page.getByText('A web system or admin panel', { exact: true }).tap()
  await expect(page.getByRole('radio', { name: 'A web system or admin panel' })).toBeChecked()
  await page.locator('#brief-goal').fill('Rebuild our booking system for intercity buses')
  await page.getByRole('button', { name: 'Next', exact: true }).tap()
  await expect(page.getByRole('heading', { name: 'What should it include?' })).toBeVisible()
})
