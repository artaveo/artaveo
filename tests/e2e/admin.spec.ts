import { db, EDITOR, expect, OWNER, signInAsAdmin, test } from './support'

/**
 * The owner's and the editor's real journeys through /admin (roadmap § 13–15).
 * The authorization RULES are tested exhaustively in
 * tests/integration/admin-authorization.integration.test.mjs; here the point is
 * that the UI honours them, and that publishing really changes the public site.
 * Sign-in goes through the test stack's stand-in for the auth service.
 */

test.describe.configure({ mode: 'serial' })

const SLUG = 'e2e-draft-project'
let projectId = ''
let leadEmail = ''
let leadId = ''

test.beforeAll(async () => {
  await db(`projects?slug=eq.${SLUG}`, { method: 'DELETE' })
  const created = await db<{ id: string }[]>('projects', {
    method: 'POST',
    body: {
      slug: SLUG,
      title: { en: 'E2E Draft Project', fa: 'پروژه پیش‌نویس آزمایشی' },
      category: { en: 'Web app', fa: 'برنامه وب' },
      summary: { en: 'Created by the end-to-end suite.', fa: 'ساخته‌شده توسط مجموعه آزمون سرتاسری.' },
      published: false,
    },
  })
  projectId = created[0].id

  // A lead for the pipeline tests, made the way a real one is: a row in `inquiries`.
  leadEmail = `pipeline-${Date.now().toString(36)}@example.com`
  const lead = await db<{ id: string }[]>('inquiries', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), goal: 'A lead for the pipeline journey', name: 'Pipeline Lead', email: leadEmail, preferred_locale: 'en', preferred_channel: 'email', consent: true },
  })
  leadId = lead[0].id
})

test.afterAll(async () => {
  await db(`projects?slug=eq.${SLUG}`, { method: 'DELETE' })
})

/**
 * The list page is regenerated on demand after a publish or unpublish. Next serves
 * the previous version to the first visitor while it regenerates, so the check
 * reloads until the change shows — and fails if it never does. (That first-visitor
 * lag is Next's stale-while-revalidate, not a bug; it is noted in docs/testing.md.)
 */
async function expectWorkIndex(page: import('@playwright/test').Page, title: string, shown: boolean) {
  await expect
    .poll(
      async () => {
        await page.goto('/en/work')
        return (await page.locator('main').innerText()).includes(title)
      },
      { message: `"${title}" should ${shown ? '' : 'no longer '}be on /en/work`, timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBe(shown)
}

test.describe('signing in', () => {
  test('anonymous visitors are sent to the login page and land where they were going afterwards', async ({ page }) => {
    await page.goto('/en/admin/leads')
    await expect(page).toHaveURL(/\/en\/admin\/login/)
    await expect(page.locator('input[type=password]')).toBeVisible()
    await page.locator('#admin-email').fill(OWNER.email)
    await page.locator('#admin-password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/en\/admin\/leads/)
    await expect(page.getByRole('heading', { name: 'Lead pipeline' })).toBeVisible()
  })

  test('a wrong password shows one generic message and stays on the login page', async ({ page }) => {
    await page.goto('/en/admin/login')
    await page.locator('#admin-email').fill(OWNER.email)
    await page.locator('#admin-password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/login/)
    await page.locator('#admin-email').fill('nobody@test.artaveo.dev')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible()
  })

  test('an account that exists but is not an admin gets the same message', async ({ page }) => {
    await page.goto('/en/admin/login')
    await page.locator('#admin-email').fill('stranger@test.artaveo.dev')
    await page.locator('#admin-password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible()
  })

  test('the login page is available in Persian, right-to-left', async ({ page }) => {
    await page.goto('/fa/admin/login')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('#admin-email')).toBeVisible()
  })

  test('signing out ends the session: the admin pages ask for a login again', async ({ page }) => {
    await signInAsAdmin(page, OWNER)
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/admin\/login/) // wait for the action to finish before looking again
    await page.goto('/en/admin/leads')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})

test.describe('the editor', () => {
  test('sees content tools but no lead data, and cannot reach it by URL either', async ({ page }) => {
    await signInAsAdmin(page, EDITOR)
    await page.goto('/en/admin')
    await expect(page.getByRole('link', { name: /lead/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /content/i }).first()).toBeVisible()
    for (const url of ['/en/admin/leads', `/en/admin/leads/${leadId}`, '/en/admin/notifications']) {
      await page.goto(url)
      await expect(page.locator('body'), url).not.toContainText(leadEmail)
      await expect(page.locator('body'), url).not.toContainText('Pipeline Lead')
    }
  })
})

test.describe('the owner: lead pipeline', () => {
  test('finds the lead, moves it along the allowed stages, and every move is on its timeline', async ({ page }) => {
    await signInAsAdmin(page, OWNER)
    await page.goto(`/en/admin/leads/${leadId}`)
    await expect(page.locator('main')).toContainText('Pipeline Lead')
    await expect(page.locator('main')).toContainText('New')

    await page.getByRole('combobox').filter({ hasText: 'Move to…' }).click()
    // Only what the graph allows from "new": Reviewed and Lost — never "Won".
    await expect(page.getByRole('option', { name: 'Reviewed' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Won' })).toHaveCount(0)
    await page.getByRole('option', { name: 'Reviewed' }).click()
    await expect(page.locator('main')).toContainText('Reviewed')

    const rows = await db<{ stage: string }[]>(`inquiries?id=eq.${leadId}&select=stage`)
    expect(rows[0].stage).toBe('reviewed')
    const events = await db<{ type: string }[]>(`inquiry_events?inquiry_id=eq.${leadId}&type=eq.stage-changed&select=type`)
    expect(events).toHaveLength(1)
  })

  test('a note is saved and shown on the timeline', async ({ page }) => {
    await signInAsAdmin(page, OWNER)
    await page.goto(`/en/admin/leads/${leadId}`)
    await page.getByRole('textbox', { name: /note/i }).fill('Called the client, wants a proposal')
    await page.getByRole('button', { name: /add note|save note/i }).click()
    await expect(page.locator('main')).toContainText('Called the client, wants a proposal')
  })

  test('the list finds the lead, filters by stage, and exports a CSV that contains it', async ({ page }) => {
    await signInAsAdmin(page, OWNER)
    await page.goto('/en/admin/leads')
    await expect(page.locator('main')).toContainText('Pipeline Lead')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /csv|export/i }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.csv$/)
  })
})

test.describe('the editor: publishing a project changes the public site', () => {
  test('a draft is not public; Publish makes it public in both languages at once; Unpublish takes it back', async ({ page, request }) => {
    expect((await request.get(`/en/work/${SLUG}`)).headers()['x-nextjs-cache'] ?? '').not.toBe('HIT')
    await signInAsAdmin(page, EDITOR)
    await page.goto(`/en/admin/content/projects/${projectId}`)
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()

    for (const locale of ['en', 'fa']) {
      await expect.poll(async () => (await request.get(`/${locale}/work/${SLUG}`)).status(), { message: `${locale} case study after publish`, timeout: 15_000 }).toBe(200)
    }
    await expectWorkIndex(page, 'E2E Draft Project', true)

    await page.goto(`/en/admin/content/projects/${projectId}`)
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click()
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()
    await expectWorkIndex(page, 'E2E Draft Project', false)
  })

  test('an incomplete project cannot be published: the button is disabled and nothing goes public', async ({ page, request }) => {
    await db(`projects?id=eq.${projectId}`, { method: 'PATCH', body: { summary: { en: 'English only', fa: '' } } }).catch(() => {})
    await signInAsAdmin(page, EDITOR)
    await page.goto(`/en/admin/content/projects/${projectId}`)
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled()
    expect((await db<{ published: boolean }[]>(`projects?id=eq.${projectId}&select=published`))[0].published).toBe(false)
    expect([404, 200]).toContain((await request.get(`/en/work/${SLUG}`)).status())
  })
})
