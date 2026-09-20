import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-bound Supabase client for the admin sign-in/session flow (roadmap
 * § 13). Distinct from `lib/supabase/server.ts`'s service-role client:
 * that one deliberately bypasses RLS for trusted server-side content
 * reads/writes and is never tied to a particular visitor. This one is the
 * opposite — it acts *as* whichever user the request's cookies belong to,
 * using the public `anon` key, so `auth.getUser()` / `auth.mfa.*` operate
 * on a real session instead of a service identity.
 *
 * Call this fresh in every Server Action and Server Component render
 * (never cache or share the instance across requests — see the
 * `@supabase/ssr` docs this follows). Cookie writes (`setAll`) only
 * succeed from a Server Action or Route Handler; called from a Server
 * Component render they throw, which is caught and ignored below — safe
 * because `proxy.ts` already refreshes the session cookie on every
 * request through the middleware pipeline, so a Server Component that
 * can't itself persist a refreshed token isn't the only place it happens.
 *
 * Returns `null` when `SUPABASE_URL` / `SUPABASE_ANON_KEY` aren't
 * configured yet, so callers can surface an honest "auth not configured"
 * state (§ 2 principle 15) instead of crashing — same pattern
 * `getSupabaseServerClient()` already uses.
 */
export async function createAuthServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    // Phase 23: the browser never talks to Supabase (no browser client exists), so the
    // session cookies have no reason to be readable by page scripts — `httpOnly` means an
    // XSS in the admin cannot lift the session token. `Secure` wherever the site is served
    // over HTTPS (Vercel); the local test stack is plain http.
    cookieOptions: { httpOnly: true, sameSite: 'lax' as const, secure: Boolean(process.env.VERCEL), path: '/' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component render, not a Server Action /
          // Route Handler — see the doc comment above.
        }
      },
    },
  })
}
