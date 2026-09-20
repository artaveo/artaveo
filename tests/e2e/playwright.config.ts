import { readFileSync } from 'node:fs'
import path from 'node:path'

import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end + accessibility suite (Phase 21). It drives the BUILT app
 * (`next start`) against the local test stack (real PostgreSQL + PostgREST, a
 * stand-in for auth and storage) — see docs/testing.md.
 *
 *   npm run test:stack:up      once: database, PostgREST, gateway
 *   npm run test:stack:build   once per code change: `next build` against the stack
 *   npm run test:e2e           this suite (starts `next start` on :3100 itself)
 */
const ROOT = process.cwd()
const stackEnvFile = path.join(ROOT, '.test-stack/env.json')

let stackEnv: Record<string, string> = {}
try {
  stackEnv = JSON.parse(readFileSync(stackEnvFile, 'utf8'))
} catch {
  throw new Error('The test stack is not running. Start it with `npm run test:stack:up` and build with `npm run test:stack:build`.')
}

export const PORT = 3100

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(ROOT, 'test-results'),
  // Flows share one database (a lead created in one test is worked on in the next),
  // so the suite runs in order, one worker.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: path.join(ROOT, 'playwright-report') }]] : [['list']],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Deterministic rendering: no animation, so a check never races a transition.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    // Touch viewport, only for specs tagged @mobile (the palette button, the menu, no horizontal overflow).
    { name: 'mobile', use: { ...devices['Pixel 5'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    cwd: ROOT,
    url: `http://127.0.0.1:${PORT}/en`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { ...(process.env as Record<string, string>), ...stackEnv },
  },
})
