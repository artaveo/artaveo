import { readFileSync } from 'node:fs'
import path from 'node:path'

import { test as base, expect, type Locator, type Page } from '@playwright/test'

export { expect }

const env: Record<string, string> = JSON.parse(readFileSync(path.join(process.cwd(), '.test-stack/env.json'), 'utf8'))

export const OWNER = { email: 'owner@test.artaveo.dev', password: 'Test-Password-123!' }
export const EDITOR = { email: 'editor@test.artaveo.dev', password: 'Test-Password-123!' }

/** Direct REST access to the test database as the server would have it (service role). For arranging data and checking what the UI claims happened. */
export async function db<T = unknown>(pathAndQuery: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: init.prefer ?? 'return=representation',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw new Error(`db ${init.method ?? 'GET'} ${pathAndQuery} → ${res.status} ${await res.text()}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

/** Routes of every kind the site has, as `[label, path-without-locale]`. */
export const ROUTES: [string, string][] = [
  ['home', ''],
  ['work index', '/work'],
  ['case study', '/work/transportation-system'],
  ['services index', '/services'],
  ['service detail', '/services/business-website'],
  ['about', '/about'],
  ['process', '/process'],
  ['contact', '/contact'],
  ['start (brief builder)', '/start'],
  ['consultation request', '/consultation'],
  ['insights index', '/insights'],
  ['insights article', '/insights/e2e-fixture-article'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
]

/** Text that means a template or a data bug leaked into the page. */
export const LEAK = /MISSING_MESSAGE|\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b(?!\s*[-–—:])/

export async function signInAsAdmin(page: Page, account: { email: string; password: string }, locale = 'en') {
  await page.goto(`/${locale}/admin/login`)
  await page.locator('input[type=email], input[name=email]').first().fill(account.email)
  await page.locator('input[type=password]').first().fill(account.password)
  await page.locator('form button[type=submit]').first().click()
  await expect(page).not.toHaveURL(/\/admin\/login/)
}

/**
 * True once React has attached its handlers to the element. A server-rendered
 * button that React has not yet hydrated ignores a click — silently — which
 * shows up as a random "the step did not advance". React marks every hydrated
 * DOM node with a `__reactProps$…` key, so that key is the exact signal.
 */
export async function isInteractive(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => Object.keys(el).some((key) => key.startsWith('__reactProps'))).catch(() => false)
}

/** Waits for the element to be hydrated, then clicks it. Use for the first interaction after a navigation. */
export async function clickWhenReady(locator: Locator) {
  await expect.poll(() => isInteractive(locator), { message: 'element never became interactive (hydration)' }).toBe(true)
  await locator.click()
}

/**
 * `page.goto` that returns only once the page is hydrated (the site header's
 * first button is the probe), so a test's first click never races React.
 * Pages without the site header (admin) simply do not wait.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page)
    page.goto = (async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await goto(url, options)
      const probe = page.locator('header button').first()
      await expect.poll(() => isInteractive(probe), { timeout: 8000 }).toBe(true).catch(() => {})
      return response
    }) as Page['goto']

    // A page that renders "Something went wrong" is a failure even if the test never
    // looked for it: collect uncaught exceptions and framework errors, assert at the end.
    const problems: string[] = []
    page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const text = message.text()
      if (/Base UI error|Minified React error|Hydration failed|hydrated but some attributes|Warning: /.test(text)) problems.push(`console: ${text.slice(0, 200)}`)
    })
    await use(page)
    expect(problems, 'errors raised in the browser during the test').toEqual([])
  },
})

/** A string from the real message files, so a spec asserts what the visitor actually sees in either language. */
export function msg(locale: 'en' | 'fa', key: string): string {
  const messages = JSON.parse(readFileSync(path.join(process.cwd(), `messages/${locale}.json`), 'utf8'))
  const value = key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown> | undefined)?.[part], messages)
  if (typeof value !== 'string') throw new Error(`no message ${locale}:${key}`)
  return value
}
