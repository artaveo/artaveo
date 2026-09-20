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
  test('@mobile the menu opens, lists the pages, navigates, and closes', async ({ page }) => {
    await page.goto('/en')
    await clickWhenReady(page.getByRole('button', { name: 'Open menu' }))
    const nav = page.getByRole('dialog')
    await expect(nav.getByRole('link', { name: 'Services' })).toBeVisible()
    await nav.getByRole('link', { name: 'Services' }).click()
    await expect(page).toHaveURL(/\/en\/services$/)
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('@mobile the menu works right-to-left in Persian', async ({ page }) => {
    await page.goto('/fa')
    await clickWhenReady(page.getByRole('button', { name: msg('fa', 'Common.openMenu') }))
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

test('@mobile the Brief Builder can be started and answered with touch', async ({ page }) => {
  await page.goto('/en/start')
  await clickWhenReady(page.getByRole('button', { name: 'Next', exact: true }))
  await page.getByText('A web application or MVP', { exact: true }).tap()
  await expect(page.getByRole('radio', { name: 'A web application or MVP' })).toBeChecked()
  await page.locator('#brief-goal').fill('Rebuild our booking system for intercity buses')
  await page.getByRole('button', { name: 'Next', exact: true }).tap()
  await expect(page.getByRole('heading', { name: 'What does it need to do?' })).toBeVisible()
})
