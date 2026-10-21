#!/usr/bin/env node
/**
 * Phase 34 — Lighthouse budgets per route (tests/performance/lighthouserc.json).
 *
 * Starts the BUILT app (`next start`, port 3400) and runs Lighthouse CI against
 * it: mobile emulation, simulated slow 4G, one run per route. What fails the
 * run (errors) are the numbers that do not depend on the machine — bytes of
 * script, fonts, document, styles and the whole page; layout shift — plus a
 * generous ceiling on LCP and blocking time that only a real regression
 * crosses, and accessibility. The targets themselves (LCP 2.5 s, blocking
 * 200 ms, performance 90) are warnings: lab timings on a shared CI machine
 * move from run to run; the real answer is field data (Speed Insights).
 *
 *   CI:     after `test:stack:build`, with the test stack up (its env is read
 *           from .test-stack/env.json, as the end-to-end suite does).
 *   Local:  `npm run build && npm run test:lighthouse` — `next start` reads
 *           .env.local. CHROME_PATH picks a browser (default: Playwright's
 *           Chromium); LHCI_BIN a locally installed `lhci` (default: npx).
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PORT = 3400
const CONFIG = 'tests/performance/lighthouserc.json'
const LHCI = process.env.LHCI_BIN ? [process.env.LHCI_BIN] : ['npx', '--yes', '@lhci/cli@0.15.1']

const stackFile = path.join(ROOT, '.test-stack/env.json')
const stackEnv = existsSync(stackFile) ? JSON.parse(readFileSync(stackFile, 'utf8')) : {}

async function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const { chromium } = await import('@playwright/test')
  return chromium.executablePath()
}

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function waitFor(url, ms = 60_000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${url} did not answer within ${ms / 1000} s`)
}

const env = { ...process.env, ...stackEnv, CHROME_PATH: await chromePath() }
// Node runs Next's own entry directly, so stopping `server` stops the app (no npx in between).
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], { cwd: ROOT, env, stdio: ['ignore', 'inherit', 'inherit'] })
let code = 1
try {
  await waitFor(`http://127.0.0.1:${PORT}/en`)
  code = await run(LHCI[0], [...LHCI.slice(1), 'collect', `--config=${CONFIG}`], env)
  if (code === 0) code = await run(LHCI[0], [...LHCI.slice(1), 'upload', `--config=${CONFIG}`], env)
  if (code === 0) code = await run(LHCI[0], [...LHCI.slice(1), 'assert', `--config=${CONFIG}`], env)
} finally {
  server.kill()
}
process.exit(code)
