import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { bucketKey } from '@/lib/security/rate-limit-policy'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Health checks (Phase 24) for the uptime check that runs outside the site.
 *
 * WHAT "THE INQUIRY ENDPOINT IS UP" CAN HONESTLY MEAN. The Brief Builder does not
 * post to a URL of its own: it calls a Server Action, whose address changes with
 * every build and which cannot be called without a real submission. A check that
 * submitted real briefs would put fake leads in the owner's pipeline and fake
 * e-mails in the outbox — so it does not. What it checks is everything the
 * action needs in order to succeed: the database is configured and answers, the
 * two tables a submission writes to are readable, and the rate limiter is
 * callable. Together with fetching the `/start` page itself (done by the workflow),
 * that catches every outage that has actually happened to a site like this one
 * (database down, key rotated, migration missing). What it cannot catch is a bug
 * inside the action — that is what error tracking is for.
 */

export type CheckName = 'configured' | 'database' | 'outbox' | 'limiter'
export type CheckResult = { ok: boolean; ms: number }
export type InquiryPathHealth = {
  /** False when a submission would fail: not configured, or the database / outbox unreadable. */
  ok: boolean
  /** True when it would work but something guarding it is off (the limiter fails open). */
  degraded: boolean
  checks: Partial<Record<CheckName, CheckResult>>
}

const CHECK_TIMEOUT_MS = 6_000

async function timed(run: () => PromiseLike<{ error: { message: string } | null }>): Promise<CheckResult> {
  const started = Date.now()
  try {
    const result = await Promise.race([
      Promise.resolve(run()),
      new Promise<{ error: { message: string } }>((resolve) => setTimeout(() => resolve({ error: { message: 'timeout' } }), CHECK_TIMEOUT_MS)),
    ])
    return { ok: !result.error, ms: Date.now() - started }
  } catch {
    return { ok: false, ms: Date.now() - started }
  }
}

/** One cheap read. Used by the admin page and the external check. */
export async function checkDatabase(supabase: SupabaseClient): Promise<CheckResult> {
  return timed(() => supabase.from('inquiries').select('id').limit(1))
}

export async function checkInquiryPathUncached(supabase: SupabaseClient | null): Promise<InquiryPathHealth> {
  if (!supabase) return { ok: false, degraded: false, checks: { configured: { ok: false, ms: 0 } } }

  const [database, outbox, limiter] = await Promise.all([
    checkDatabase(supabase),
    timed(() => supabase.from('notification_outbox').select('id').limit(1)),
    // The one write in the check: it bumps a single counter row (`health:global:probe`), which the daily run purges.
    timed(() => supabase.rpc('consume_rate_limit', { p_key: bucketKey('health', 'global', 'probe'), p_limit: 100_000, p_window_seconds: 3600 })),
  ])
  return {
    ok: database.ok && outbox.ok,
    degraded: !limiter.ok,
    checks: { configured: { ok: true, ms: 0 }, database, outbox, limiter },
  }
}

/**
 * The public endpoint answers many callers, and every call here is a few
 * database round trips — so an answer is reused for `ttlMs`. Anyone hammering the
 * URL costs at most one check per instance per interval.
 */
let cached: { at: number; value: InquiryPathHealth } | null = null
const CACHE_TTL_MS = 15_000

export async function checkInquiryPath(now: number = Date.now()): Promise<InquiryPathHealth> {
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value
  const value = await checkInquiryPathUncached(getSupabaseServerClient())
  cached = { at: now, value }
  return value
}

/** Test seam. */
export function resetHealthCache(): void {
  cached = null
}
