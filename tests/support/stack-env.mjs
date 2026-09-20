/**
 * Loads the running test stack's environment (written by
 * tests/support/stack/stack.mjs `up`) into process.env and hands out clients.
 * Import this FIRST in an integration test, before any app module: the app's
 * Supabase client reads its env once, at first use.
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

// The console e-mail provider logs every "would send"; that is expected noise
// here, not signal. TEST_VERBOSE=1 brings it back.
if (!process.env.TEST_VERBOSE) {
  for (const level of ['log', 'info', 'warn']) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      if (typeof args[0] === 'string' && args[0].startsWith('[notifications:console]')) return
      original(...args)
    }
  }
}

const { createClient } = await import('@supabase/supabase-js')

const auth = { persistSession: false, autoRefreshToken: false }
/** Anonymous (public) access — what any visitor's browser could do with the anon key. */
export const anon = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth })
/** The server's own access: bypasses RLS, like the app's `getSupabaseServerClient()`. */
export const service = () => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth })
/** A signed-in user, as the browser would be (session obtained from the stack's auth service). */
export async function signedIn(email, password) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
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

export const uuid = () => globalThis.crypto.randomUUID()
export const stackUrl = env.SUPABASE_URL
export const stackEnv = env
