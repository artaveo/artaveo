import AxeBuilder from '@axe-core/playwright'
import { test as raw } from '@playwright/test'

import { db, EDITOR, expect, isInteractive, msg, OWNER, ROUTES, signInAsAdmin, test } from './support'

/**
 * Phase 24 in the BUILT app and a real browser: the correlation id on every kind of
 * response, the health endpoints, the owner's Observability page (both languages, both
 * themes, accessibility, the resolve/ignore controls, the reference lookup), what a
 * browser reports back (a CSP violation, an uncaught error), and the error page's
 * reference.
 */

const LOCALES = ['en', 'fa'] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function reset() {
  await db('error_groups?fingerprint=not.is.null', { method: 'DELETE', prefer: 'return=minimal' })
  await db('ops_events?id=not.is.null', { method: 'DELETE', prefer: 'return=minimal' })
  await db('rate_limit_buckets?bucket_key=not.is.null', { method: 'DELETE', prefer: 'return=minimal' })
}

const seedGroup = (patch: Record<string, unknown> = {}) =>
  db('error_groups', {
    method: 'POST',
    body: { fingerprint: 'f'.repeat(32), source: 'action', event: 'inquiry.persist_failed', name: 'Error', message: 'simulated failure for the browser test', route: '/[locale]/start', event_count: 4, ...patch },
  })

test.describe('the correlation id and the report endpoint in the policy', () => {
  for (const [label, route] of ROUTES) {
    test(`${label}: every response carries a fresh request id and a policy that reports to us`, async ({ request }) => {
      const a = await request.get(`/en${route}`)
      const b = await request.get(`/en${route}`)
      expect(a.headers()['x-request-id'], route).toMatch(UUID)
      expect(b.headers()['x-request-id']).not.toBe(a.headers()['x-request-id'])
      expect(a.headers()['content-security-policy']).toMatch(/report-uri \/api\/observe\/csp/)
      expect(a.headers()['content-security-policy']).not.toMatch(/report-to/)
    })
  }
  test('an id sent by the caller is never echoed back — the proxy makes its own', async ({ request }) => {
    const forged = '11111111-2222-4333-8444-555555555555'
    const res = await request.get('/en', { headers: { 'x-request-id': forged } })
    expect(res.headers()['x-request-id']).toMatch(UUID)
    expect(res.headers()['x-request-id']).not.toBe(forged)
  })
  test('the admin redirect for a signed-out visitor carries an id too', async ({ request }) => {
    const res = await request.get('/en/admin/observability', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['x-request-id']).toMatch(UUID)
  })
})

test.describe('health endpoints and the check', () => {
  test('liveness and the inquiry path answer 200 with no detail, and every answer has its own request id', async ({ request }) => {
    const live = await request.get('/api/health')
    expect(live.status()).toBe(200)
    expect(await live.json()).toEqual({ ok: true })
    expect(live.headers()['cache-control']).toBe('no-store')

    const inquiry = await request.get('/api/health/inquiry')
    expect(inquiry.status()).toBe(200)
    const body = await inquiry.json()
    expect(body.ok).toBe(true)
    expect(Object.keys(body.checks).sort()).toEqual(['configured', 'database', 'limiter', 'outbox'])
    expect(inquiry.headers()['x-request-id']).toMatch(UUID)
    expect((await request.head('/api/health/inquiry')).status()).toBe(200)
  })
  test('the alert check refuses a caller without the secret', async ({ request }) => {
    expect((await request.get('/api/ops/check')).status()).toBe(401)
    expect((await request.get('/api/ops/check', { headers: { authorization: 'Bearer nope' } })).status()).toBe(401)
  })
  test('the reporting endpoints refuse GET and answer 204 to garbage', async ({ request }) => {
    for (const path of ['/api/observe/csp', '/api/observe/client-error']) {
      expect((await request.get(path)).status()).toBe(405)
      const res = await request.post(path, { data: 'not json at all', headers: { 'content-type': 'application/json' } })
      expect(res.status()).toBe(204)
    }
  })
})

test.describe('the owner’s Observability page', () => {
  test.beforeEach(reset)

  for (const locale of LOCALES) {
    test(`renders in ${locale} with a seeded error, the funnel and the health block`, async ({ page }) => {
      await seedGroup({ last_request_id: '3f2b8c1e-5d4a-4e6b-9a7c-0d1e2f3a4b5c', digest: '424242' })
      await db('ops_events', { method: 'POST', body: { level: 'info', name: 'inquiry.submitted', subject_type: 'inquiry', subject_id: 'abc12345-0000-4000-8000-000000000000' } })
      await signInAsAdmin(page, OWNER, locale)
      await page.goto(`/${locale}/admin/observability`)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(msg(locale, 'Admin.obsTitle'))
      await expect(page.getByText('simulated failure for the browser test')).toBeVisible()
      await expect(page.getByText('inquiry.persist_failed').first()).toBeVisible()
      await expect(page.getByText('inquiry.submitted').first()).toBeVisible()
      await expect(page.getByText(msg(locale, 'Admin.obsFunnelTitle'))).toBeVisible()
      await expect(page.getByText(msg(locale, 'Admin.obsHealthTitle'))).toBeVisible()
      // No missing translation, no raw ICU, no undefined anywhere on the page.
      const text = await page.locator('main').innerText()
      expect(text).not.toMatch(/MISSING_MESSAGE|\bundefined\b|\[object Object\]|obs[A-Z]\w+|\{count\}|\{ms\}/)
      if (locale === 'fa') expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
    })
  }

  test('a new error group raises a warning, a spike raises an error, and the dashboard says so', async ({ page }) => {
    await seedGroup({ window_count: 12, event_count: 12 })
    await signInAsAdmin(page, OWNER)
    await page.goto('/en/admin/observability')
    await expect(page.getByText(msg('en', 'Admin.obsAlertErrorsSpike'))).toBeVisible()
    await expect(page.getByText(msg('en', 'Admin.obsAlertErrorsSpikeAction'))).toBeVisible()
    await page.goto('/en/admin')
    await expect(page.getByText('alert needs you', { exact: false })).toBeVisible()
  })

  test('resolving a group works, survives a reload, and reopening it works too', async ({ page }) => {
    await seedGroup()
    await signInAsAdmin(page, OWNER)
    await page.goto('/en/admin/observability')
    const row = page.getByRole('row').filter({ hasText: 'simulated failure' })
    await row.getByRole('button', { name: msg('en', 'Admin.obsGroupResolve') }).click()
    await expect(row.getByRole('button', { name: msg('en', 'Admin.obsGroupReopen') })).toBeVisible()
    expect((await db<{ status: string }[]>('error_groups?select=status'))[0].status).toBe('resolved')
    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: 'simulated failure' }).getByRole('button', { name: msg('en', 'Admin.obsGroupReopen') })).toBeVisible()
    await page.getByRole('row').filter({ hasText: 'simulated failure' }).getByRole('button', { name: msg('en', 'Admin.obsGroupReopen') }).click()
    await expect(page.getByRole('row').filter({ hasText: 'simulated failure' }).getByRole('button', { name: msg('en', 'Admin.obsGroupResolve') })).toBeVisible()
    const audit = await db<{ action: string }[]>('audit_log?action=eq.observability.error_group_status&select=action')
    expect(audit.length).toBeGreaterThanOrEqual(2)
  })

  test('a reference lookup finds an error by its digest and by its request id, and refuses anything else', async ({ page }) => {
    await seedGroup({ digest: '424242', last_request_id: '3f2b8c1e-5d4a-4e6b-9a7c-0d1e2f3a4b5c' })
    await signInAsAdmin(page, OWNER)
    for (const ref of ['424242', '3f2b8c1e-5d4a-4e6b-9a7c-0d1e2f3a4b5c']) {
      await page.goto(`/en/admin/observability?ref=${ref}`)
      await expect(page.getByText(msg('en', 'Admin.obsRefFound'), { exact: false })).toBeVisible()
      await expect(page.getByText('simulated failure', { exact: false }).first()).toBeVisible()
    }
    await page.goto(`/en/admin/observability?ref=${encodeURIComponent("x'; drop table inquiries; --")}`)
    await expect(page.getByText(msg('en', 'Admin.obsRefInvalid'))).toBeVisible()
    // The form is a plain GET: it works and the URL carries the reference.
    await page.getByLabel(msg('en', 'Admin.obsRefLabel')).fill('999999')
    await page.getByRole('button', { name: msg('en', 'Admin.obsRefButton') }).click()
    await expect(page).toHaveURL(/ref=999999/)
    await expect(page.getByText(msg('en', 'Admin.obsRefNothing'), { exact: false })).toBeVisible()
  })

  test('an editor does not see the link and is sent back to the dashboard', async ({ page }) => {
    await signInAsAdmin(page, EDITOR)
    await page.goto('/en/admin')
    await expect(page.getByRole('link', { name: msg('en', 'Admin.obsNavLink') })).toHaveCount(0)
    await page.goto('/en/admin/observability')
    await expect(page).toHaveURL(/\/en\/admin\/?$/)
  })

  for (const locale of LOCALES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`accessibility (${locale}, ${theme}): no axe violations with content on the page`, async ({ page }) => {
        await seedGroup()
        await db('ops_events', { method: 'POST', body: { level: 'warn', name: 'alert.raised', subject_type: 'alert', subject_id: 'errors.spike' } })
        await signInAsAdmin(page, OWNER, locale)
        await page.evaluate((t) => localStorage.setItem('artaveo-theme', t), theme)
        await page.goto(`/${locale}/admin/observability?ref=424242`)
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        expect(
          results.violations.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`),
          `axe violations on observability ${locale} ${theme}`,
        ).toEqual([])
      })
    }
  }
})

test.describe('a lead shows where its request can be found', () => {
  test.beforeEach(reset)
  test('an e-mail queued by a request links to that request’s references', async ({ page }) => {
    const [inquiry] = await db<{ id: string }[]>('inquiries', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), goal: 'Observability link probe', name: 'Link Probe', email: 'probe@example.com', preferred_locale: 'en', preferred_channel: 'email', consent: true },
    })
    const requestId = crypto.randomUUID()
    const [message] = await db<{ id: string }[]>('notification_outbox', {
      method: 'POST',
      body: { kind: 'owner-alert', recipient_email: 'owner@example.com', locale: 'en', subject: 's', body_text: 'b', dedupe_key: `k-${requestId}`, inquiry_id: inquiry.id, request_id: requestId },
    })
    await signInAsAdmin(page, OWNER)
    await page.goto(`/en/admin/notifications/${message.id}`)
    const link = page.getByRole('link', { name: requestId })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`observability\\?ref=${requestId}`))
    await expect(page.getByText(msg('en', 'Admin.obsRefFound'), { exact: false })).toBeVisible()
    await expect(page.getByText(msg('en', 'Admin.obsRefNotification'), { exact: false })).toBeVisible()
  })
})

// The next tests provoke a real policy violation and a real uncaught error on purpose, so they use a raw page:
// the shared fixture (support.ts) fails a test on any console error, which is exactly what is being caused here.
raw.describe('what the browser reports back', () => {
  raw.beforeEach(reset)

  raw('an injected inline script in the admin is blocked AND reported: the violation lands in the error groups as a CSP group', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' })
    const page = await context.newPage()
    await signInAsAdmin(page, OWNER)
    await page.goto('/en/admin')
    // The browser sends a CSP report from its own network stack, which Playwright does not surface as a page
    // request — so the proof is the stored group, not an observed request.
    await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'window.__injected = 1'
      document.body.appendChild(script)
    })
    await expect.poll(async () => (await db<{ source: string; event: string }[]>('error_groups?source=eq.csp&select=source,event')).length, { timeout: 15_000 }).toBeGreaterThan(0)
    const [group] = await db<{ event: string; message: string; route: string; source: string }[]>('error_groups?source=eq.csp')
    expect(group.event).toBe('csp.violation')
    expect(group.message).toMatch(/script-src/)
    expect(group.route).toBe('/en/admin')
    // A report from the browser can never wake the owner.
    const alerts = await db<unknown[]>('ops_events?name=eq.alert.raised')
    expect(alerts).toHaveLength(0)
    await context.close()
  })

  raw('an uncaught error in the page is reported once, scrubbed, and without alerting', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' })
    const page = await context.newPage()
    await page.goto('/en/contact')
    await page.waitForLoadState('load')
    // The service worker may claim the page shortly after load (a navigation-less reload of the
    // context); wait until the header is interactive and the URL is stable before provoking the error.
    await expect.poll(() => isInteractive(page.locator('header button').first()), { timeout: 10_000 }).toBe(true)
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      setTimeout(() => {
        throw new TypeError('e2e client failure for visitor ada@example.com')
      }, 0)
    })
    await expect.poll(async () => (await db<unknown[]>('error_groups?source=eq.client')).length, { timeout: 15_000 }).toBe(1)
    const [group] = await db<{ event: string; name: string; message: string; route: string }[]>('error_groups?source=eq.client')
    expect(group.event).toBe('client.error')
    expect(group.name).toBe('TypeError')
    expect(group.message).toContain('[email]')
    expect(JSON.stringify(group)).not.toContain('ada@example.com')
    expect(group.route).toBe('/en/contact')
    await context.close()
  })
})
