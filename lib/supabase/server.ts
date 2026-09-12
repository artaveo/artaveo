import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
  })
  return cached
}
