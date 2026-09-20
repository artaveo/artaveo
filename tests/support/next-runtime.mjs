/**
 * Test-side controls for the Next runtime stubs (tests/support/stubs/next-runtime.mjs).
 * Import this in a test file that calls real server actions.
 */
const state = () => (globalThis.__TEST_NEXT__ ??= { headers: {}, cookies: new Map(), revalidated: [] })

/** Start a fresh "request context": no cookies, the given headers, no recorded revalidations. */
export function resetRequest(headers = {}) {
  const s = state()
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
