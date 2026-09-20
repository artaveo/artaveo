import { execFileSync } from 'node:child_process'
import path from 'node:path'

/**
 * Runs once before the suite: proves the stack is really up (a clear message
 * instead of forty timeouts) and empties the tables the flows write to, so a
 * run never depends on the one before it (rate limits are per address per hour).
 */
export default async function globalSetup() {
  const root = process.cwd()
  const stack = path.join(root, 'tests/support/stack/stack.mjs')
  try {
    execFileSync(process.execPath, [stack, 'status'], { stdio: 'pipe' })
  } catch {
    throw new Error('The test stack is down. Run `npm run test:stack:up` (and `npm run test:stack:build` after any code change).')
  }
  execFileSync(process.execPath, [stack, 'reset'], { stdio: 'pipe' })
}
