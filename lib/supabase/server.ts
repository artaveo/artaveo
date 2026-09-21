import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { currentRequestId } from '@/lib/observability/context'
import { REQUEST_ID_HEADER } from '@/lib/observability/request-id'

/**
 * Server-only Supabase client (roadmap § 9.2). Uses the service-role key,
 * which bypasses RLS entirely — this is deliberate: § 9.2 requires
 * "inserts only through the server," so there is no public anon-key
 * insert policy at all (see `db/migrations/0001_inquiries.sql`). The
 * `server-only` import makes it a build error to ever import this file
 * from a Client Component, so the service-role key can never end up in a
 * browser bundle.
 *
 * D-10 (Supabase plan and region for Artaveo) is still open — no
 * Artaveo project exists yet (only the unrelated `pajouhesh-portal` and
 * `Transportation-System` projects are provisioned). Until the owner
 * resolves D-10 and sets `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`,
 * this returns `null` instead of throwing, so `app/actions/inquiries.ts`
 * can surface the honest "not configured" state (§ 2 principle 15: never
 * fake success, but also never crash the page over a missing decision).
 */
let cached: SupabaseClient | null | undefined

/**
 * Phase 24: every request this client makes carries the id of the request that
 * caused it (`x-request-id`), when one is bound (`lib/observability/context.ts`).
 * That is what lets a database-side log line be matched to the request that
 * produced it — whether Supabase's own logs show the header is something only the
 * live project can say (`docs/observability.md` § 6). It reads the id from an
 * AsyncLocalStorage and never from `headers()`: this client is also used while
 * prerendering, and `headers()` there would make the page dynamic.
 */
const fetchWithRequestId: typeof fetch = (input, init) => {
  const requestId = currentRequestId()
  if (!requestId) return fetch(input, init)
  if (input instanceof Request) {
    const headers = new Headers(input.headers)
    headers.set(REQUEST_ID_HEADER, requestId)
    return fetch(new Request(input, { headers }), init)
  }
  const headers = new Headers(init?.headers)
  headers.set(REQUEST_ID_HEADER, requestId)
  return fetch(input, { ...init, headers })
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    cached = null
    return cached
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithRequestId },
  })
  return cached
}
