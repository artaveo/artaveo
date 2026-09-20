/**
 * Test-side controls for the Next runtime stubs (tests/support/stubs/next-runtime.mjs).
 * Import this in a test file that calls real server actions.
 */
const state = () => (globalThis.__TEST_NEXT__ ??= { headers: {}, cookies: new Map(), revalidated: [] })

/** Start a fresh "request context": no cookies, the given headers, no recorded revalidations. */
let ipCounter = 0
export function resetRequest(headers = {}) {
  const s = state()
  // Phase 23: integration suites set `__TEST_AUTO_IP__`. Every fresh "request context" then
  // arrives from its own address unless the test names one — as separate visitors would —
  // so the many sign-ins and submissions a suite makes do not share one rate-limit bucket.
  // Unit tests leave it off and see the real "no address" behaviour.
  if (globalThis.__TEST_AUTO_IP__ && !('x-forwarded-for' in headers) && !('x-real-ip' in headers)) {
    ipCounter += 1
    headers = { ...headers, 'x-forwarded-for': `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}` }
  }
  // Suites sign in as the same few accounts hundreds of times; the per-account sign-in limit
  // is a production control, not something for a fixture to trip over. Each fresh request
  // context starts with empty admin buckets. (Sign-in limit tests do NOT call resetRequest between attempts.)
  globalThis.__TEST_CLEAR_ADMIN_BUCKETS__?.()
  s.headers = headers
  s.cookies = new Map()
  s.revalidated = []
}

export const setHeaders = (headers) => {
  state().headers = headers
}
export const revalidated = () => state().revalidated
export const clearRevalidated = () => {
  state().revalidated = []
}
export const cookieNames = () => [...state().cookies.keys()]

/** Run `fn` and return the redirect destination it threw, or `null` when it returned normally. */
export async function redirectOf(fn) {
  try {
    await fn()
    return null
  } catch (err) {
    if (err && typeof err.destination === 'string') return err.destination
    throw err
  }
}
