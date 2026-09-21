/**
 * Stand-ins for the three Next.js runtime modules the server actions import,
 * so the REAL actions (`submitInquiry`, `publishProject`, `adminSignIn` …) can
 * run under plain Node against the real database. Wired in by
 * scripts/ts-resolve-hook.mjs. Tests drive them through `globalThis.__TEST_NEXT__`
 * (see tests/support/next-runtime.mjs).
 *
 * Only what the app calls is implemented. In particular `redirect` throws
 * like Next's (the thrown error carries the destination), and `cookies()`
 * behaves like a real cookie jar: `@supabase/ssr` writes the session cookie
 * into it on sign-in and reads it back on the next call, exactly as it does
 * with a browser.
 */
const state = () => (globalThis.__TEST_NEXT__ ??= { headers: {}, cookies: new Map(), revalidated: [] })

export async function headers() {
  return new Headers(state().headers)
}

export async function cookies() {
  const jar = state().cookies
  return {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name) => jar.has(name),
    set: (name, value, options) => {
      // An expired / emptied cookie is a deletion, as in a browser.
      if (value === '' || (options && (options.maxAge === 0 || (options.expires && new Date(options.expires) < new Date())))) jar.delete(name)
      else jar.set(name, value)
    },
    delete: (name) => jar.delete(name),
  }
}

export function revalidatePath(path, type) {
  state().revalidated.push({ kind: 'path', path, type })
}
export function revalidateTag(tag) {
  state().revalidated.push({ kind: 'tag', tag })
}

export class NextRedirect extends Error {
  constructor(destination) {
    super(`NEXT_REDIRECT ${destination}`)
    this.digest = `NEXT_REDIRECT;replace;${destination};307;`
    this.destination = destination
  }
}
export function redirect(destination) {
  throw new NextRedirect(destination)
}
export function notFound() {
  const error = new Error('NEXT_NOT_FOUND')
  error.digest = 'NEXT_HTTP_ERROR_FALLBACK;404'
  throw error
}

/** Next's `unstable_rethrow` re-throws its own control-flow errors (redirect, not-found, dynamic-usage) and ignores everything else. */
export function unstable_rethrow(err) {
  if (err && typeof err.digest === 'string' && /^(NEXT_|DYNAMIC_SERVER_USAGE|BAILOUT)/.test(err.digest)) throw err
}
