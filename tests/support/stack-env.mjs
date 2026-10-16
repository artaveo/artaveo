/**
 * Loads the running test stack's environment (written by
 * tests/support/stack/stack.mjs `up`) into process.env and hands out clients.
 * Import this FIRST in an integration test, before any app module: the app's
 * database client reads its env once, at first use.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const envFile = path.join(ROOT, '.test-stack/env.json')

let env
try {
  env = JSON.parse(readFileSync(envFile, 'utf8'))
} catch {
  console.error('The test stack is not running. Start it with:  npm run test:stack:up')
  process.exit(1)
}
Object.assign(process.env, env)

// Phase 24: the app logs one JSON line per event. Expected noise here, not signal —
// dropped unless TEST_VERBOSE is set. Tests that assert on log lines install their own sink
// (`setLogSink`) and restore this one with `setLogSink(quietSink)`.
const { setLogSink } = await import('../../lib/observability/logger.ts')
export const quietSink = process.env.TEST_VERBOSE ? null : () => {}
setLogSink(quietSink)

const { PostgrestClient } = await import('@supabase/postgrest-js')
const { accounts } = await import('./stack/accounts.mjs')
const { signJwt } = await import('./stack/jwt.mjs')

const clientWith = (token) => new PostgrestClient(env.NEON_DATA_API_URL, { headers: { Authorization: `Bearer ${token}` } })

/**
 * Anonymous (public) access through the Data API's `anon` role. On the real Neon
 * branch a request with no token is refused outright and `anonymous` is granted
 * nothing, so this is the WIDER of the two — what the public-read policies allow.
 */
export const anon = () => clientWith(env.ARTAVEO_TEST_ANON_KEY)
/** The server's own access: bypasses RLS, like the app's `getDbClient()`. */
export const service = () => clientWith(env.ARTAVEO_TEST_SERVICE_KEY)
/**
 * A signed-in user querying the Data API directly as `authenticated` (what a
 * Neon Auth JWT maps to) — the case the RLS suites check is never more than a
 * visitor gets. The password is checked against the stack's accounts.
 */
export async function signedIn(email, password) {
  const account = accounts.find((a) => a.email === email && a.password === password)
  if (!account) throw new Error(`no test account ${email} with that password`)
  const now = Math.floor(Date.now() / 1000)
  return clientWith(signJwt({ sub: account.id, email: account.email, role: 'authenticated', iat: now, exp: now + 3600 }, env.ARTAVEO_TEST_JWT_SECRET))
}

/** Raw SQL against the test database (for triggers, constraints and rollbacks PostgREST cannot express). */
export function sql(query, { allowError = false } = {}) {
  try {
    return execFileSync(
      path.join(env.ARTAVEO_TEST_PG_BIN, 'psql'),
      ['-X', '-q', '-A', '-t', '-h', '127.0.0.1', '-p', env.ARTAVEO_TEST_PG_PORT, '-U', 'postgres', '-d', env.ARTAVEO_TEST_DATABASE, '-v', 'ON_ERROR_STOP=1', '-c', query],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim()
  } catch (err) {
    if (allowError) return { error: String(err.stderr ?? err.message).trim() }
    throw err
  }
}

// Phase 23: rate-limit windows outlive a test process, so start every suite from empty
// buckets, and give every request context its own address (tests/support/next-runtime.mjs).
globalThis.__TEST_AUTO_IP__ = true
sql('truncate public.rate_limit_buckets')
globalThis.__TEST_CLEAR_ADMIN_BUCKETS__ = () => sql("delete from public.rate_limit_buckets where bucket_key like 'admin.%'")

export const uuid = () => globalThis.crypto.randomUUID()
/** The gateway origin (`/_test/*` inspection lives there). */
export const stackUrl = env.ARTAVEO_TEST_GATEWAY_URL
/** Where a stored object would be served from, as the app's storage client builds it (lib/db/storage.ts). */
export const objectUrl = (bucket, key) => `${env.NEON_STORAGE_ENDPOINT}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
export const stackEnv = env
