import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Refreshes the Supabase auth session cookie inside `proxy.ts` (roadmap
 * § 13, "secure sessions"). This is the one place in the app that *must*
 * run the refresh — Server Components can't reliably persist a refreshed
 * token themselves (`lib/supabase/server-auth.ts`'s `setAll` is a no-op
 * there), so without this every admin session would silently die at the
 * access-token's expiry instead of transparently refreshing.
 *
 * Cookie writes land directly on the `response` the caller already has
 * (the one `next-intl`'s middleware produced) rather than constructing a
 * fresh `NextResponse` — `proxy.ts` only calls `auth.getUser()` once per
 * request, before making any decision that depends on it, so there is no
 * need to feed refreshed cookies back into `request` for a second read
 * within the same middleware invocation.
 *
 * Returns `null` (not the user) when Supabase auth isn't configured yet,
 * so `proxy.ts` can decide how to treat that case explicitly instead of
 * `refreshSupabaseSession` silently deciding "no user" on its own.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ configured: boolean; userId: string | null }> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return { configured: false, userId: null }
  }

  const supabase = createServerClient(url, anonKey, {
    // Phase 23: the browser never talks to Supabase (no browser client exists), so the
    // session cookies have no reason to be readable by page scripts — `httpOnly` means an
    // XSS in the admin cannot lift the session token. `Secure` wherever the site is served
    // over HTTPS (Vercel); the local test stack is plain http.
    cookieOptions: { httpOnly: true, sameSite: 'lax' as const, secure: Boolean(process.env.VERCEL), path: '/' },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { configured: true, userId: user?.id ?? null }
}
