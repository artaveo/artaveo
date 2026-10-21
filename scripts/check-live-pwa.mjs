#!/usr/bin/env node
/**
 * Phase 34 — Phase 10's exit check on the live site: install, offline, update.
 *
 *   node scripts/check-live-pwa.mjs [--url https://…] [--profile <dir>] [--channel chrome]
 *
 * 1. Install: the manifest's fields and icons, and Chrome's own verdict
 *    (DevTools `Page.getInstallabilityErrors` — empty means installable).
 * 2. Offline: visits the pages the service worker keeps (Home, Work, a case
 *    study, Services, a service, About, in both languages), cuts the network,
 *    reloads each one and expects the page — its own heading — not the
 *    browser's offline error. /start is never kept (a form must not pretend
 *    to work offline), so offline it must fail.
 * 3. Update: with `--profile`, the browser profile is kept between runs. Run
 *    once, deploy, run again: when the profile's worker is from the previous
 *    deploy, the page must offer «Update available» and, after Reload, run
 *    the new worker. Without a previous worker this step reports "primed".
 *
 * Prints one line per check and exits non-zero if any check fails.
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const BASE = (arg('url', process.env.SITE_URL ?? 'https://artaveo-seven.vercel.app')).replace(/\/+$/, '')
const PROFILE = arg('profile', null)
const CHANNEL = arg('channel', undefined)
const KEPT = ['/fa', '/fa/work', '/fa/work/transportation-system', '/fa/services', '/fa/services/websites', '/fa/about', '/en', '/en/work', '/en/services']

let failed = 0
const report = (ok, name, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const context = PROFILE
  ? await chromium.launchPersistentContext((mkdirSync(path.resolve(PROFILE), { recursive: true }), path.resolve(PROFILE)), { channel: CHANNEL })
  : await (await chromium.launch({ channel: CHANNEL })).newContext()
const page = context.pages()[0] ?? (await context.newPage())

// 1. Install ------------------------------------------------------------
const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json()
const sizes = new Set((manifest.icons ?? []).flatMap((icon) => String(icon.sizes).split(' ')))
report(Boolean(manifest.name && manifest.short_name && manifest.start_url && manifest.display === 'standalone'), 'manifest: name, short name, start URL, standalone', `${manifest.short_name} → ${manifest.start_url}`)
report(sizes.has('192x192') && sizes.has('512x512'), 'manifest: 192 and 512 px icons', [...sizes].join(' '))
const sw = await fetch(`${BASE}/sw.js`)
const swText = await sw.text()
const liveBuild = swText.match(/const BUILD_ID = '([^']+)'/)?.[1]
report(sw.ok && /no-cache|no-store|max-age=0/.test(sw.headers.get('cache-control') ?? ''), '/sw.js is never served from a cache', sw.headers.get('cache-control') ?? '')

// The previous worker of a kept profile, before this visit replaces anything.
await page.goto(`${BASE}/fa`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
const before = await page.evaluate(async () => {
  const keys = await caches.keys()
  return { controlled: Boolean(navigator.serviceWorker.controller), build: keys.find((k) => k.startsWith('artaveo-static-'))?.slice('artaveo-static-'.length) ?? null }
})
await page.evaluate(() => navigator.serviceWorker.ready)
const cdp = await context.newCDPSession(page)
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
report(installabilityErrors.length === 0, 'Chrome finds the site installable', installabilityErrors.map((e) => e.errorId).join(', '))

// 3. Update (needs a profile from before the deploy) -----------------------
if (PROFILE && before.controlled && before.build && before.build !== liveBuild) {
  const prompt = page.getByText(/Update available|نسخه‌ی تازه/)
  await prompt.first().waitFor({ timeout: 20_000 }).then(
    () => report(true, 'update: the page offers the new version', `${before.build} → ${liveBuild}`),
    () => report(false, 'update: the page offers the new version', 'no prompt within 20 s'),
  )
  const reload = page.getByRole('button', { name: /Reload|بارگذاری|تازه/ })
  if (await reload.count()) {
    await Promise.all([page.waitForEvent('load'), reload.first().click()])
    const now = await page.evaluate(async () => (await caches.keys()).find((k) => k.startsWith('artaveo-static-')) ?? '')
    report(now === `artaveo-static-${liveBuild}`, 'update: after Reload the new worker runs', now)
  }
} else {
  console.log(`INFO  update: ${PROFILE ? (before.controlled ? 'same build as last run' : 'primed — run again after the next deploy') : 'skipped (no --profile)'} (live build ${liveBuild})`)
}

// 2. Offline --------------------------------------------------------------
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 }) // now controlled by the worker
for (const route of KEPT) await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
await context.setOffline(true)
for (const route of KEPT) {
  const ok = await page
    .goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    .then(async () => (await page.locator('main h1').count()) > 0)
    .catch(() => false)
  report(ok, `offline: ${route} opens with its heading`)
}
const startOffline = await page.goto(`${BASE}/fa/start`, { timeout: 10_000 }).then(() => page.locator('main h1').count(), () => 0)
report(startOffline === 0, 'offline: /fa/start is not faked (the form needs the network)')
await context.setOffline(false)

await context.close()
console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
