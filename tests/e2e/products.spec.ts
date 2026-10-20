import { db, expect, msg, test } from './support'

/**
 * Phase 30 — product pages on the built app and the test stack's fixture
 * product `e2e-product` (tests/support/stack/fixtures.sql): two published ways
 * to get it (a priced yearly licence, a highlighted custom edition without a
 * price), one UNPUBLISHED way that must never appear, one after-sales service,
 * features by role, who it is for and a question. Exit criteria (§ 11A): the
 * page shows exactly the options turned on, and a purchase request with the
 * chosen option reaches the pipeline.
 */

const PRODUCT = 'e2e-product'

type Inquiry = { id: string; inquiry_kind: string; product_sale_option_id: string | null; product_service_ids: string[]; product_snapshot: { product?: { slug?: string }; option?: { title?: { en?: string } } } | null; stage: string }
const inquiriesFor = (email: string) =>
  db<Inquiry[]>(`inquiries?email=eq.${encodeURIComponent(email)}&select=id,inquiry_kind,product_sale_option_id,product_service_ids,product_snapshot,stage`)

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  // Every browser test comes from one address, and the server takes at most five requests an hour from one
  // address (Phase 9.2). The Brief Builder suite has already used most of that; forget the earlier addresses.
  await db('inquiries?submitter_ip_hash=not.is.null', { method: 'PATCH', body: { submitter_ip_hash: null }, prefer: 'return=minimal' })
})

for (const locale of ['en', 'fa'] as const) {
  test(`the product page shows exactly the published ways to get it (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/products/${PRODUCT}`)
    await expect(page.locator('h1')).toHaveText(locale === 'en' ? 'E2E Clinic System' : 'سیستم آزمایشی کلینیک')

    const cards = page.locator('[data-slot="sale-option-card"]')
    await expect(cards).toHaveCount(2)
    await expect(page.locator('main')).not.toContainText(locale === 'en' ? 'E2E hidden option' : 'روش پنهان آزمایشی')
    await expect(page.locator('[data-slot="sale-option-card"][data-highlighted]')).toHaveCount(1)
    // A price only where the owner set one; the other says "after a short conversation".
    await expect(cards.first()).toContainText(locale === 'en' ? '12,000' : '۱۲٬۰۰۰')
    await expect(page.locator('[data-slot="after-sales"]')).toContainText(locale === 'en' ? 'E2E staff training' : 'آموزش آزمایشی کارمندان')

    // The owner's blocks: features by role, who it is for, a question — and no repository link anywhere.
    await expect(page.getByRole('heading', { name: msg(locale, 'BlockTypes.features-by-role'), level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: msg(locale, 'BlockTypes.audience'), level: 2 })).toBeVisible()
    await expect(page.locator('main details summary')).toHaveCount(1)
    expect(await page.locator('main a[href*="github.com"]').count()).toBe(0)

    // Structured data: a Product with an Offer for the priced option only.
    const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
    const product = ld.find((item) => item['@type'] === 'Product')
    expect(product?.offers?.map((offer: { priceCurrency: string }) => offer.priceCurrency)).toEqual(['AFN'])
  })
}

test('a purchase request with the chosen way to get it reaches the pipeline', async ({ page }) => {
  const email = `e2e-purchase-${Date.now()}@example.com`
  await page.goto(`/en/products/${PRODUCT}`)
  const startedAt = Date.now()

  // The yearly licence card's own button picks it in the form below.
  const yearly = page.locator('[data-slot="sale-option-card"]').filter({ hasText: 'E2E yearly licence' })
  await yearly.getByRole('link', { name: msg('en', 'Brand.ctaPurchase') }).click()
  await expect(page).toHaveURL(/#request-purchase-[0-9a-f-]{36}$/)
  const form = page.locator('[data-slot="product-request-form"]')
  await expect(form.getByRole('radio', { name: msg('en', 'ProductPage.kindPurchase') })).toBeChecked()
  await expect(form.getByRole('radio', { name: /E2E yearly licence/ })).toBeChecked()

  await form.getByRole('checkbox', { name: /E2E staff training/ }).click()
  await form.locator('#product-name').fill('E2E Buyer')
  await form.locator('#product-email').fill(email)
  await form.locator('#product-phone').fill('+93790000000')
  await form.getByRole('checkbox', { name: /I agree/ }).click()
  // The server refuses a request sent less than 2 s after the form appeared (a bot check).
  await page.waitForTimeout(Math.max(0, 2300 - (Date.now() - startedAt)))
  await form.getByRole('button', { name: msg('en', 'ProductPage.submitPurchase') }).click()

  await expect(page.getByText(msg('en', 'ProductPage.successPurchaseTitle'))).toBeVisible()
  const rows = await inquiriesFor(email)
  expect(rows).toHaveLength(1)
  expect(rows[0].inquiry_kind).toBe('product-purchase')
  expect(rows[0].stage).toBe('new')
  expect(rows[0].product_sale_option_id).toBeTruthy()
  expect(rows[0].product_service_ids).toHaveLength(1)
  expect(rows[0].product_snapshot?.option?.title?.en).toBe('E2E yearly licence')
})

test('a demo request from the hero, in Dari, and the form says what is missing first', async ({ page }) => {
  const email = `e2e-demo-${Date.now()}@example.com`
  await page.goto(`/fa/products/${PRODUCT}`)
  const startedAt = Date.now()
  await page.locator('[data-slot="project-hero"]').getByRole('link', { name: msg('fa', 'Brand.requestDemo') }).click()
  const form = page.locator('[data-slot="product-request-form"]')
  await expect(form.getByRole('radio', { name: msg('fa', 'ProductPage.kindDemo') })).toBeChecked()

  await form.getByRole('button', { name: msg('fa', 'ProductPage.submitDemo') }).click()
  await expect(form.getByText(msg('fa', 'ProductPage.errorRequired')).first()).toBeVisible()
  expect(await inquiriesFor(email), 'nothing is stored while the form is incomplete').toHaveLength(0)

  await form.getByRole('radio', { name: msg('fa', 'ProductPage.channelEmail') }).click()
  await form.locator('#product-name').fill('خریدار آزمایشی')
  await form.locator('#product-email').fill(email)
  // The visible checkbox, by its label — `#product-consent` is the hidden native input behind it.
  await form.getByRole('checkbox', { name: /موافقم/ }).click()
  await page.waitForTimeout(Math.max(0, 2300 - (Date.now() - startedAt)))
  await form.getByRole('button', { name: msg('fa', 'ProductPage.submitDemo') }).click()

  await expect(page.getByText(msg('fa', 'ProductPage.successDemoTitle'))).toBeVisible()
  const rows = await inquiriesFor(email)
  expect(rows).toHaveLength(1)
  expect(rows[0].inquiry_kind).toBe('product-demo')
  expect(rows[0].product_sale_option_id).toBeNull()
})

test('/products lists every published product as its own block, and the menus offer it', async ({ page }) => {
  await page.goto('/en/products')
  await expect(page.locator('h1')).toBeVisible()
  const blocks = page.locator('[data-slot="product-block"]')
  await expect(blocks).toHaveCount(1)
  await expect(blocks.getByRole('link', { name: msg('en', 'Brand.seeProduct') })).toHaveAttribute('href', `/en/products/${PRODUCT}`)

  const header = page.getByRole('banner')
  await header.getByRole('button', { name: msg('en', 'Brand.products') }).click()
  await expect(header.getByRole('link', { name: /E2E Clinic System/ })).toHaveAttribute('href', `/en/products/${PRODUCT}`)
  await expect(header.getByRole('link', { name: msg('en', 'Brand.allProducts') })).toHaveAttribute('href', '/en/products')
})

test('a product that is not in the portfolio is not on /work, and its old /work address leads to its product page', async ({ page }) => {
  await page.goto('/en/work')
  await expect(page.locator(`main a[href="/en/products/${PRODUCT}"]`)).toHaveCount(0)
  await page.goto(`/en/work/${PRODUCT}`)
  await expect(page).toHaveURL(new RegExp(`/en/products/${PRODUCT}$`))
})

// An unknown product slug is covered with the other dynamic routes in routes.spec.ts (not-found page, never indexable).
