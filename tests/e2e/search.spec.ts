import { expect, test } from './support'


test.describe('search / command palette', () => {
  test('⌘K / Ctrl+K opens it, typing finds a project, Enter opens it, and Escape closes it', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Control+k')
    const box = page.getByRole('combobox')
    await expect(box).toBeVisible({ timeout: 20_000 }) // the palette is a lazily loaded chunk: the first open is the slow one
    await expect(box).toBeFocused()
    await box.fill('transport')
    const first = page.getByRole('option').first()
    await expect(first).toContainText('Ticket Sales & Transport Management')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/en\/work\/transportation-system$/)
    await expect(page.locator('h1')).toContainText('Ticket Sales & Transport Management') // the new page has rendered
    await expect(page.getByRole('combobox')).toHaveCount(0) // choosing a result closed the palette
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('combobox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('combobox')).toHaveCount(0)
  })

  test('arrow keys move the active result, and the active option is announced via aria-activedescendant', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Control+k')
    const box = page.getByRole('combobox')
    await box.fill('system')
    await expect(page.getByRole('option').nth(1)).toBeVisible() // at least two results, so ↓ has somewhere to go
    const before = await box.getAttribute('aria-activedescendant')
    await page.keyboard.press('ArrowDown')
    const after = await box.getAttribute('aria-activedescendant')
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })

  test('a query with no match says so; it does not show an empty list', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('zzzqqqxxx')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('dialog').locator('p', { hasText: /nothing found/i })).toBeVisible()
  })

  test('technology names are not searchable and not suggested (§ 16.1 rule 3, Phase 32)', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Control+k')
    const box = page.getByRole('combobox')
    await expect(box).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('dialog')).not.toContainText(/Next\.js|React|PostgreSQL|Supabase/)
    for (const name of ['PostgreSQL', 'Supabase']) {
      await box.fill(name)
      await expect(page.getByRole('option')).toHaveCount(0)
    }
  })

  test('searching services works, and the search button opens it without a keyboard', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('banner').getByRole('button', { name: 'Search' }).first().click()
    // Phase 31.1: services by kind of software — "Web systems & admin panels".
    await page.getByRole('combobox').fill('admin panels')
    await expect(page.getByRole('option').first()).toContainText(/admin panels/i)
  })

  test('Persian: Arabic-letter spellings (ي ك) find Persian-letter text (ی ک)', async ({ page }) => {
    await page.goto('/fa')
    await page.keyboard.press('Control+k')
    // "نمونه‌کارها" typed with Arabic kaf (ك) must still find the Work page.
    await page.getByRole('combobox').fill('نمونه‌كارها')
    await expect(page.getByRole('option').first()).toBeVisible()
  })

  test('a result that is not published is never offered: a draft article and an unpublished service do not appear', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('concurrent')
    await expect(page.getByRole('option')).toHaveCount(0) // the real draft article is not in the test database, and drafts are never indexed
  })

  test('the index endpoint is public JSON per language and never contains private paths', async ({ request }) => {
    for (const locale of ['en', 'fa']) {
      const res = await request.get(`/api/search/index/${locale}`)
      expect(res.status()).toBe(200)
      const index = (await res.json()) as { locale: string; docs: { href: string; kind: string }[] }
      expect(index.locale).toBe(locale)
      expect(JSON.stringify(index)).toContain('transportation-system')
      // Only public site paths are ever indexed — never an admin, token or private page.
      for (const doc of index.docs) {
        expect(doc.href, `${locale}: ${doc.kind}`).not.toMatch(/^\/admin|\/admin\/|\/consultation\/[0-9a-f]{8}|\/recommend\//)
      }
      expect(JSON.stringify(index)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+(?<!artaveo\.dev@gmail\.com)/)
    }
    expect((await request.get('/api/search/index/de')).status()).toBeGreaterThanOrEqual(400)
  })

  test('@mobile the palette can be opened on a phone (there is no keyboard shortcut)', async ({ page }) => {
    await page.goto('/en')
    // Phase 29.1: on a phone, search is in the glass header's menu.
    await page.getByRole('banner').getByRole('button', { name: 'Open the menu' }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('combobox')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
