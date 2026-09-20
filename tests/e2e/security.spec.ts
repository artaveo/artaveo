import { readFileSync } from 'node:fs'
import path from 'node:path'

import { clearAdminRateLimits, db, EDITOR, expect, msg, OWNER, ROUTES, signInAsAdmin, test } from './support'

/**
 * Phase 23 — what the BROWSER and the built server actually do about security:
 * the headers on every kind of page, no Content Security Policy violation on any
 * page (public or admin, both languages), private pages that are never cached,
 * a cross-origin Server Action that is refused, hostile text that stays text,
 * a private file only the owner can reach, and the sign-in limit.
 *
 * (Every OTHER browser test now also fails on a CSP violation — see the console
 * filter in support.ts — so the policy is exercised by the whole suite.)
 */

const env: Record<string, string> = JSON.parse(readFileSync(path.join(process.cwd(), '.test-stack/env.json'), 'utf8'))
const LOCALES = ['en', 'fa'] as const

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __csp: string[] }).__csp = []
    document.addEventListener('securitypolicyviolation', (event) => {
      ;(window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective}: ${event.blockedURI || 'inline'}`)
    })
  })
})

const violations = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)

test.describe('headers and policy on every kind of page', () => {
  for (const locale of LOCALES) {
    for (const [label, route] of ROUTES) {
      test(`${label} (${locale}): security headers present, policy enforced, no violation`, async ({ page }) => {
        const response = await page.goto(`/${locale}${route}`)
        expect(response?.status()).toBe(200)
        const headers = response!.headers()
        expect(headers['x-content-type-options']).toBe('nosniff')
        expect(headers['x-frame-options']).toBe('DENY')
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
        expect(headers['x-powered-by']).toBeUndefined()
        expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
        expect(headers['content-security-policy']).toContain("object-src 'none'")
        expect(headers['content-security-policy-report-only']).toBeUndefined()
        await page.waitForLoadState('networkidle')
        expect(await violations(page)).toEqual([])
      })
    }
  }
})

test.describe('private links are never cached and never leak through Referer', () => {
  const fakeToken = 'A'.repeat(32)
  for (const [label, route] of [['consultation link', `/en/consultation/${fakeToken}`], ['recommendation link', `/fa/recommend/${fakeToken}`]] as const) {
    test(label, async ({ request }) => {
      const response = await request.get(route)
      const headers = response.headers()
      expect(headers['cache-control']).toBe('no-store')
      expect(headers['referrer-policy']).toBe('no-referrer')
      expect(headers['x-robots-tag']).toMatch(/noindex/)
    })
  }
  test('the consultation request form itself is an ordinary public page', async ({ request }) => {
    const headers = (await request.get('/en/consultation')).headers()
    expect(headers['cache-control'] ?? '').not.toBe('no-store')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
  test('the calendar download for an unknown link is 404 and not cacheable', async ({ request }) => {
    const response = await request.get(`/api/consultation/${fakeToken}/calendar`)
    expect(response.status()).toBe(404)
    expect(response.headers()['cache-control']).toBe('no-store')
    expect(response.headers()['content-security-policy']).toContain("default-src 'none'")
  })
})

test.describe('the admin', () => {
  test('sign in, then walk the admin: nonce policy holds — no violation, scripts run, session cookie is not readable by scripts', async ({ page, context }) => {
    await signInAsAdmin(page, OWNER)
    for (const route of ['/admin', '/admin/leads', '/admin/notifications', '/admin/consultations', '/admin/content', '/admin/content/media', '/admin/security']) {
      const response = await page.goto(`/en${route}`)
      expect(response?.status(), route).toBe(200)
      const csp = response!.headers()['content-security-policy']
      expect(csp, route).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{20,}' 'sha256-/)
      expect(csp, route).not.toMatch(/script-src[^;]*'unsafe-inline'/)
      expect(response!.headers()['cache-control'], route).toContain('no-store')
      await page.waitForLoadState('networkidle')
      expect(await violations(page), route).toEqual([])
    }
    const cookies = (await context.cookies()).filter((cookie) => /^sb-/.test(cookie.name))
    expect(cookies.length).toBeGreaterThan(0)
    for (const cookie of cookies) expect(cookie.httpOnly, cookie.name).toBe(true)
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/sb-/)
  })

  test('an injected inline script does not run in the admin', async ({ browser }) => {
    // A raw page: the expected policy violation must not trip the shared fixture that fails on any CSP message.
    const context = await browser.newContext({ baseURL: `http://127.0.0.1:3100` })
    const page = await context.newPage()
    await page.addInitScript(() => {
      ;(window as unknown as { __csp: string[] }).__csp = []
      document.addEventListener('securitypolicyviolation', (event) => {
        ;(window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective}: ${event.blockedURI || 'inline'}`)
      })
    })
    await signInAsAdmin(page, OWNER)
    await page.goto('/en/admin')
    await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'window.__injected = 1'
      document.body.appendChild(script)
    })
    expect(await page.evaluate(() => (window as unknown as { __injected?: number }).__injected)).toBeUndefined()
    expect((await violations(page)).some((v) => v.startsWith('script-src'))).toBe(true)
    await context.close()
  })

  test('the sign-in form refuses after too many attempts for one account, and says so', async ({ page }) => {
    await clearAdminRateLimits()
    await page.goto('/en/admin/login')
    const email = 'probe-limit@test.artaveo.dev'
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      await page.locator('#admin-email').fill(email)
      await page.locator('#admin-password').fill(`wrong-password-${attempt}`)
      await page.locator('form button[type=submit]').click()
      await expect(page.getByText(attempt <= 10 ? msg('en', 'Admin.errorInvalidCredentials') : msg('en', 'Admin.errorRateLimited'))).toBeVisible()
    }
    // The limit is per account: the owner is not locked out by someone else's guessing.
    await signInAsAdmin(page, OWNER)
    const audited = await db<{ action: string; actor: string }[]>('audit_log?action=eq.admin.sign_in_rate_limited&select=action,actor')
    expect(audited.length).toBeGreaterThanOrEqual(1)
    expect(audited.length, 'one row per crossed limit, never one per refused attempt').toBeLessThanOrEqual(3)
    expect(audited[0].actor).toBe('system')
  })
})

test.describe('cross-site requests (CSRF) against Server Actions', () => {
  test('a Server Action call with a foreign Origin is refused and runs nothing; the same call from the site\'s own origin runs', async ({ page, request }) => {
    await clearAdminRateLimits()
    await page.goto('/en/admin/login')
    const captured = page.waitForRequest((req) => req.method() === 'POST' && req.url().includes('/admin/login'))
    await page.locator('#admin-email').fill('csrf-probe@test.artaveo.dev')
    await page.locator('#admin-password').fill('not-the-password')
    await page.locator('form button[type=submit]').click()
    const original = await captured
    // The page's own submission must have finished (and written its audit row) before counting.
    await expect(page.getByText(msg('en', 'Admin.errorInvalidCredentials'))).toBeVisible()
    const headers = original.headers()
    expect(headers['next-action'], 'the form posts a Server Action').toBeTruthy()
    const body = original.postDataBuffer()!

    const failuresBefore = (await db<unknown[]>('audit_log?action=eq.admin.sign_in_failed&actor=eq.csrf-probe@test.artaveo.dev&select=id')).length
    const replay = (origin: string) =>
      request.post(original.url(), {
        headers: { 'next-action': headers['next-action'], 'content-type': headers['content-type'], accept: headers['accept'] ?? 'text/x-component', origin, 'next-router-state-tree': headers['next-router-state-tree'] ?? '' },
        data: body,
      })

    const foreign = await replay('https://evil.example')
    expect(foreign.status(), 'refused before the action runs').toBeGreaterThanOrEqual(400)
    // (Production builds mask the framework's message — "Invalid Server Actions request" — so what is asserted is the outcome: an error status, and that the action did not run.)
    expect((await db<unknown[]>('audit_log?action=eq.admin.sign_in_failed&actor=eq.csrf-probe@test.artaveo.dev&select=id')).length, 'nothing ran').toBe(failuresBefore)

    // Control: the identical request from our own origin does run — so the refusal above was about the Origin, not a malformed replay.
    const own = await replay(new URL(original.url()).origin)
    expect(own.status()).toBe(200)
    expect((await db<unknown[]>('audit_log?action=eq.admin.sign_in_failed&actor=eq.csrf-probe@test.artaveo.dev&select=id')).length).toBe(failuresBefore + 1)
  })
})

test.describe('hostile text stays text', () => {
  test('a lead whose fields are HTML and script is shown literally to the owner, and nothing runs', async ({ page }) => {
    const hostileName = '<img src=x onerror="window.__xss=1"> Mallory'
    const hostileGoal = '<script>window.__xss=1</script> please build =HYPERLINK("http://evil.example","x")'
    const lead = await db<{ id: string }[]>('inquiries', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), goal: hostileGoal, name: hostileName, email: `xss-${Date.now().toString(36)}@example.com`, preferred_locale: 'en', preferred_channel: 'email', consent: true },
    })
    await signInAsAdmin(page, OWNER)
    for (const route of [`/en/admin/leads/${lead[0].id}`, '/en/admin/leads', '/en/admin']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss), route).toBeUndefined()
      expect(await violations(page), route).toEqual([])
    }
    await page.goto(`/en/admin/leads/${lead[0].id}`)
    await expect(page.getByText(hostileName, { exact: false }).first()).toBeVisible()
    expect(await page.locator('img[src="x"]').count()).toBe(0)
  })
})

test.describe('a visitor\'s attachment is private', () => {
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  let fileId = ''
  let storagePath = ''

  test.beforeAll(async () => {
    const lead = await db<{ id: string }[]>('inquiries', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), goal: 'A lead with an attachment', name: 'Attach Lead', email: `attach-${Date.now().toString(36)}@example.com`, preferred_locale: 'en', preferred_channel: 'email', consent: true },
    })
    storagePath = `e2e-${Date.now().toString(36)}-file.png`
    const upload = await fetch(`${env.SUPABASE_URL}/storage/v1/object/inquiry-files/${storagePath}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'image/png' },
      body: PNG,
    })
    expect(upload.ok).toBe(true)
    const row = await db<{ id: string }[]>('inquiry_files', {
      method: 'POST',
      body: { inquiry_id: lead[0].id, storage_path: storagePath, content_type: 'image/png', size_bytes: PNG.length, original_name: 'reference.png', uploaded_by_ip_hash: 'e2e' },
    })
    fileId = row[0].id
  })

  test('there is no public URL for it', async ({ request }) => {
    expect((await request.get(`${env.SUPABASE_URL}/storage/v1/object/public/inquiry-files/${storagePath}`)).status()).toBe(404)
  })

  test('anonymous and malformed requests get the same plain 404', async ({ request }) => {
    for (const id of [fileId, 'not-a-uuid', crypto.randomUUID()]) {
      const response = await request.get(`/api/admin/inquiry-files/${id}`, { maxRedirects: 0 })
      expect(response.status(), id).toBe(404)
      expect(response.headers()['location']).toBeUndefined()
    }
  })

  test('an editor (no access to leads) gets a 404, the owner a short-lived download link — and the file arrives as an attachment', async ({ page, browser }) => {
    const editorContext = await browser.newContext()
    const editorPage = await editorContext.newPage()
    await signInAsAdmin(editorPage, EDITOR)
    const denied = await editorContext.request.get(`/api/admin/inquiry-files/${fileId}`, { maxRedirects: 0 })
    expect(denied.status()).toBe(404)
    expect(denied.headers()['location']).toBeUndefined()
    await editorContext.close()

    await signInAsAdmin(page, OWNER)
    const granted = await page.request.get(`/api/admin/inquiry-files/${fileId}`, { maxRedirects: 0 })
    expect(granted.status()).toBe(302)
    expect(granted.headers()['cache-control']).toBe('no-store')
    expect(granted.headers()['referrer-policy']).toBe('no-referrer')
    const signed = granted.headers()['location']
    expect(signed).toContain('/object/sign/inquiry-files/')
    const file = await fetch(signed)
    expect(file.status).toBe(200)
    expect(file.headers.get('content-disposition')).toMatch(/^attachment/)
    expect(Buffer.compare(Buffer.from(await file.arrayBuffer()), PNG)).toBe(0)
    const audit = await db<{ action: string }[]>(`audit_log?entity_id=eq.${fileId}&select=action`)
    expect(audit.map((row) => row.action)).toContain('pipeline.file_opened')
  })

  test('the lead page lists the attachment as a link to the owner-checked route, never a storage URL', async ({ page }) => {
    const [row] = await db<{ inquiry_id: string }[]>(`inquiry_files?id=eq.${fileId}&select=inquiry_id`)
    await signInAsAdmin(page, OWNER)
    await page.goto(`/en/admin/leads/${row.inquiry_id}`)
    const link = page.getByRole('link', { name: 'reference.png' })
    await expect(link).toHaveAttribute('href', `/api/admin/inquiry-files/${fileId}`)
    await expect(page.getByText(msg('en', 'Admin.leadFilesTitle'))).toBeVisible()
  })
})
