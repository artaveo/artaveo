import type { Page } from '@playwright/test'

import { clickWhenReady, db, expect, msg, test } from './support'

/**
 * The conversion path: Brief Builder (roadmap § 10). What matters most is that a
 * brief is never lost and never falsely reported as sent.
 */

type Labels = { next: string; back: string; send: string; project: string; timeline: string; goalError: string }
const EN: Labels = { next: 'Next', back: 'Back', send: 'Send brief', project: 'A web application or MVP', timeline: '1–3 months', goalError: 'This field is required.' }

const unique = () => `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}@example.com`

async function forward(page: Page, labels: Labels = EN) {
  await clickWhenReady(page.getByRole('button', { name: labels.next, exact: true }))
}

/** Fills every required field and stops on the review step, ready to send. */
async function fillToReview(page: Page, email: string, extra: { goal?: string; fast?: boolean } = {}) {
  const startedAt = Date.now()
  await forward(page) // service → project
  await page.getByRole('radio', { name: EN.project }).click()
  await page.locator('#brief-goal').fill(extra.goal ?? 'Rebuild our booking system for intercity buses')
  await forward(page) // → scope
  await forward(page) // → timeline
  await page.getByRole('radio', { name: EN.timeline }).click()
  await forward(page) // → links
  await forward(page) // → contact
  await page.locator('#brief-name').fill('E2E Client')
  await page.locator('#brief-email').fill(email)
  await page.getByRole('checkbox', { name: /I agree/ }).click()
  await forward(page) // → review
  await expect(page.getByRole('heading', { name: 'Review your brief' })).toBeVisible()
  // The server refuses a brief sent less than 3 s after the form appeared (a bot check).
  // A real visitor never gets near that, so tests wait it out unless they are testing it.
  if (!extra.fast) await page.waitForTimeout(Math.max(0, 3300 - (Date.now() - startedAt)))
}

const inquiriesFor = (email: string) => db<{ id: string; service_slug: string | null; package_id: string | null; stage: string; email: string; goal: string }[]>(`inquiries?email=eq.${encodeURIComponent(email)}&select=*`)

test.describe.configure({ mode: 'serial' })

test('validation: an empty project step shows a specific error per field and does not advance', async ({ page }) => {
  await page.goto('/en/start')
  await forward(page)
  await expect(page.getByRole('heading', { name: 'Tell me about the project' })).toBeVisible()
  await forward(page) // nothing chosen, nothing written
  await expect(page.getByRole('heading', { name: 'Tell me about the project' })).toBeVisible()
  // project type and goal each show their own message (plus the form-level line)
  await expect.poll(() => page.getByText(EN.goalError).count()).toBeGreaterThanOrEqual(2)
  await page.getByRole('radio', { name: EN.project }).click()
  await page.locator('#brief-goal').fill('too short')
  await forward(page)
  await expect(page.getByText(/A little more detail/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tell me about the project' })).toBeVisible()
})

test('every option can be chosen by clicking its label, not only the small circle', async ({ page }) => {
  await page.goto('/en/start')
  await forward(page)
  for (const label of ['A new website', 'A web application or MVP', 'Improving an existing product', 'Ongoing care for a live product', 'Not sure yet']) {
    await page.getByText(label, { exact: true }).click()
    await expect(page.getByRole('radio', { name: label })).toBeChecked()
  }
})

test('a link that is not http(s) is refused with a specific message', async ({ page }) => {
  await page.goto('/en/start')
  await forward(page)
  await page.getByRole('radio', { name: EN.project }).click()
  await page.locator('#brief-goal').fill('Rebuild our booking system for intercity buses')
  await forward(page)
  await forward(page)
  await page.getByRole('radio', { name: EN.timeline }).click()
  await forward(page)
  await page.getByRole('button', { name: /add.*link/i }).click()
  await page.getByPlaceholder(msg('en', 'BriefBuilder.linkPlaceholder')).first().fill('javascript:alert(1)')
  await forward(page)
  await expect(page.getByText(/full URL/)).toBeVisible()
})

test('happy path from a package: the brief is saved once with the service and package, and two e-mails are queued', async ({ page }) => {
  const email = unique()
  await page.goto('/en/services/business-website')
  await page.locator('a[href="/en/start?service=business-website&package=standard"]').first().click()
  await fillToReview(page, email)
  await page.getByRole('button', { name: EN.send }).click()
  await expect(page.getByRole('status').getByText('Brief sent', { exact: true })).toBeVisible()

  const rows = await inquiriesFor(email)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ service_slug: 'business-website', package_id: 'standard', stage: 'new' })
  const outbox = await db<{ kind: string; status: string }[]>(`notification_outbox?inquiry_id=eq.${rows[0].id}&select=kind,status`)
  expect(outbox.map((o) => o.kind).sort()).toEqual(['client-confirmation', 'owner-alert'])
})

test('the review step shows what will be sent, and Back keeps every answer', async ({ page }) => {
  const email = unique()
  await page.goto('/en/start')
  await fillToReview(page, email, { goal: 'A distinctive goal sentence for review' })
  const main = page.locator('main')
  await expect(main).toContainText('A distinctive goal sentence for review')
  await expect(main).toContainText(email)
  await page.getByRole('button', { name: EN.back }).click()
  await expect(page.locator('#brief-email')).toHaveValue(email)
  await page.getByRole('button', { name: EN.back }).click()
  await page.getByRole('button', { name: EN.back }).click()
  await page.getByRole('button', { name: EN.back }).click()
  await page.getByRole('button', { name: EN.back }).click()
  await expect(page.locator('#brief-goal')).toHaveValue('A distinctive goal sentence for review')
  expect(await inquiriesFor(email), 'nothing is saved until Send').toHaveLength(0)
})

test('double-clicking Send (or a second tab retry) creates exactly one inquiry', async ({ page }) => {
  const email = unique()
  await page.goto('/en/start')
  await fillToReview(page, email)
  const send = page.getByRole('button', { name: EN.send })
  await send.dblclick()
  await expect(page.getByRole('status').getByText('Brief sent', { exact: true })).toBeVisible()
  expect(await inquiriesFor(email)).toHaveLength(1)
})

test('offline: the brief is kept on the device, the visitor is told the truth, and it sends by itself on reconnect — once', async ({ page, context }) => {
  const email = unique()
  await page.goto('/en/start')
  await fillToReview(page, email)
  await context.setOffline(true)
  await page.getByRole('button', { name: EN.send }).click()
  await expect(page.getByRole('status').getByText("You're offline", { exact: true })).toBeVisible()
  await expect(page.getByRole('status').getByText('Brief sent', { exact: true })).toHaveCount(0)
  expect(await inquiriesFor(email), 'not sent while offline').toHaveLength(0)

  await context.setOffline(false)
  await expect(page.getByRole('status').getByText('Brief sent', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/You were offline when you first tried/)).toBeVisible()
  expect(await inquiriesFor(email)).toHaveLength(1)
})

test('a brief sent faster than a person could type it is refused calmly and nothing is saved', async ({ page }) => {
  const email = unique()
  await page.goto('/en/start')
  await fillToReview(page, email, { fast: true })
  await page.getByRole('button', { name: EN.send }).click()
  await expect(page.getByText(msg('en', 'BriefBuilder.rateLimitedTitle'))).toBeVisible()
  expect(await inquiriesFor(email)).toHaveLength(0)
})

test('the "too fast" refusal is in Persian on the Persian page (it once showed English)', async ({ page }) => {
  const email = unique()
  await page.goto('/fa/start')
  const next = page.getByRole('button', { name: msg('fa', 'BriefBuilder.next'), exact: true })
  const namedRadio = (n: number) => page.locator('main [role=radiogroup]').first().getByRole('radio', { name: /./ }).nth(n)
  await clickWhenReady(next)
  await namedRadio(1).click()
  await page.locator('#brief-goal').fill('بازنویسی سامانه رزرو بلیت برای شرکت‌های اتوبوسرانی بین‌شهری')
  await next.click()
  await next.click()
  await namedRadio(1).click()
  await next.click()
  await next.click()
  await page.locator('#brief-name').fill('مشتری آزمایشی')
  await page.locator('#brief-email').fill(email)
  await page.getByRole('checkbox', { name: /./ }).first().click()
  await next.click()
  await page.getByRole('button', { name: msg('fa', 'BriefBuilder.submit'), exact: true }).click()
  await expect(page.getByText(msg('fa', 'BriefBuilder.rateLimitedTitle'))).toBeVisible()
  await expect(page.getByText(msg('en', 'BriefBuilder.rateLimitedTitle'))).toHaveCount(0)
  expect(await inquiriesFor(email)).toHaveLength(0)
})

test('a bot that fills the hidden field is told nothing and nothing is saved', async ({ page }) => {
  const email = unique()
  await page.goto('/en/start')
  await fillToReview(page, email)
  await page.locator('#bb-website').fill('http://spam.example', { force: true }) // what a form-filling bot does
  await page.getByRole('button', { name: EN.send }).click()
  await page.waitForTimeout(1500)
  expect(await inquiriesFor(email)).toHaveLength(0)
})

test('Persian: the whole brief works right-to-left and the confirmation is Persian', async ({ page }) => {
  const email = unique()
  await page.goto('/fa/start')
  const startedAt = Date.now() // the bot check counts from when the form appeared
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  // No physical-direction leaks: the page never scrolls sideways (the hidden bot field used to cause 9999px).
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  const next = page.getByRole('button', { name: msg('fa', 'BriefBuilder.next'), exact: true })
  const namedRadio = (n: number) => page.locator('main [role=radiogroup]').first().getByRole('radio', { name: /./ }).nth(n)
  await clickWhenReady(next)
  await namedRadio(1).click()
  await page.locator('#brief-goal').fill('بازنویسی سامانه رزرو بلیت برای شرکت‌های اتوبوسرانی بین‌شهری')
  await next.click()
  await next.click()
  await namedRadio(1).click()
  await next.click()
  await next.click()
  await page.locator('#brief-name').fill('مشتری آزمایشی')
  await page.locator('#brief-email').fill(email)
  await page.getByRole('checkbox', { name: /./ }).first().click()
  await next.click()
  await page.waitForTimeout(Math.max(0, 3300 - (Date.now() - startedAt))) // the 3 s "too fast" bot check
  await page.getByRole('button', { name: msg('fa', 'BriefBuilder.submit'), exact: true }).click()
  await expect(page.getByRole('status').getByText(msg('fa', 'BriefBuilder.successTitle'), { exact: true })).toBeVisible()
  const rows = await inquiriesFor(email)
  expect(rows).toHaveLength(1)
  const out = await db<{ kind: string; locale: string }[]>(`notification_outbox?inquiry_id=eq.${rows[0].id}&select=kind,locale`)
  expect(out.find((o) => o.kind === 'client-confirmation')?.locale).toBe('fa')
})
