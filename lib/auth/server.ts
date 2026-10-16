import { createNeonAuth } from '@neondatabase/auth/next/server'

/**
 * Admin sign-in/session (roadmap § 13) on Neon's Managed Better Auth, since the
 * move off Supabase (October 2026).
 *
 * Every call happens on the server — Server Actions, Server Components and
 * `proxy.ts` — and the browser never talks to the auth service directly: there
 * is no `/api/auth` route and no client SDK, so the session cookies are
 * httpOnly and no page script ever sees a token. The SDK keeps two cookies: the
 * Better Auth session token and a signed, short-lived copy of the session
 * (`sessionDataTtl`) that saves a round-trip on most requests.
 *
 * Deliberately not `server-only`: `proxy.ts` imports it too. It reads only
 * server-side environment variables, none prefixed `NEXT_PUBLIC_`.
 *
 * Returns `null` when NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET are missing
 * (or the secret is under the 32 characters the SDK requires), so callers can
 * surface an honest "auth not configured" state (§ 2 principle 15) instead of
 * crashing — the same pattern `getDbClient()` uses.
 */
export type NeonAuth = ReturnType<typeof createNeonAuth>

let instance: NeonAuth | null | undefined

export function getNeonAuth(): NeonAuth | null {
  if (instance !== undefined) return instance

  const baseUrl = process.env.NEON_AUTH_BASE_URL
  const secret = process.env.NEON_AUTH_COOKIE_SECRET
  if (!baseUrl || !secret || secret.length < 32) {
    instance = null
    return instance
  }

  instance = createNeonAuth({
    baseUrl,
    cookies: {
      secret,
      // `lax`, not the SDK's `strict` default: the login redirect and links from e-mail
      // notifications into the admin are cross-site navigations that must carry the session.
      sameSite: 'lax',
    },
    logLevel: 'warn',
  })
  return instance
}
