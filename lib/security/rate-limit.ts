import 'server-only'
import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import { log } from '@/lib/observability/logger'
import { track } from '@/lib/observability/store'
import { getClientIp, hashSecret } from '@/lib/request-ip'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { bucketKey, RATE_LIMITS, type LimitRule, type RateLimitName } from '@/lib/security/rate-limit-policy'

/**
 * Applies the policy in `rate-limit-policy.ts` through the database function
 * `consume_rate_limit` (migration 0020): one atomic statement per bucket, so it
 * holds across serverless instances — an in-memory counter would not, since
 * every instance would count alone.
 *
 * FAILURE POLICY — fails OPEN, and says so. If the limiter cannot be reached
 * (the database is down, or the code was deployed before migration 0020 was
 * applied) the request is allowed and the error is logged. A limiter that
 * blocks everyone whenever it breaks would turn its own outage into the site's
 * outage — and into a lock-out of the owner at the sign-in form. The older
 * record-counting limits still apply on the forms that had them. Phase 24
 * makes "the limiter has been failing" visible: the failure is recorded as a
 * `rate_limit.unavailable` event (at most one a minute) and raises the
 * `rate_limit.unavailable` warning on `/admin/observability`.
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; dimension: 'ip' | 'subject' | 'global'; hits: number; limit: number }

/** Salted, one-way, fixed length: a bucket key can be read in the database without revealing an address or an e-mail. */
export function hashForBucket(dimension: string, value: string): string {
  return crypto.createHmac('sha256', hashSecret()).update(`${dimension}:${value}`).digest('hex').slice(0, 32)
}

type ConsumeRow = { allowed: boolean; hit_count: number; retry_after_seconds: number }

async function consume(supabase: SupabaseClient, key: string, rule: LimitRule): Promise<ConsumeRow | null> {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    log.error('rate_limit.consume_failed', { err: error ?? new Error('no row returned'), decision: 'allowed' })
    await track('rate_limit.unavailable', { level: 'warn', dedupeSeconds: 60, data: { reason: (error?.message ?? 'no row returned').slice(0, 200) }, supabase })
    return null
  }
  return data[0] as ConsumeRow
}

export type RateLimitInput = {
  /** Overrides the caller's address (tests). */
  ip?: string
  /** The second dimension the policy names, if it names one: an e-mail address, a link token, a user id. Trimmed and compared case-insensitively (an e-mail address is; for a token it only means two tokens that differ by case share a window, which costs an attacker nothing they had). */
  subject?: string | null
}

export async function checkRateLimit(
  name: RateLimitName,
  input: RateLimitInput = {},
  supabaseOverride?: SupabaseClient | null,
): Promise<RateLimitResult> {
  const supabase = supabaseOverride ?? getSupabaseServerClient()
  if (!supabase) return { ok: true } // not configured: nothing to protect yet, and the action itself says so

  const policy = RATE_LIMITS[name] as { ip: LimitRule; subject?: LimitRule; global?: LimitRule }
  const ip = input.ip ?? (await getClientIp())

  const checks: { dimension: 'ip' | 'subject' | 'global'; key: string; rule: LimitRule }[] = [
    { dimension: 'ip', key: bucketKey(name, 'ip', hashForBucket('ip', ip)), rule: policy.ip },
  ]
  const subject = input.subject?.trim().toLowerCase()
  if (policy.subject && subject) {
    checks.push({ dimension: 'subject', key: bucketKey(name, 'subject', hashForBucket('subject', subject)), rule: policy.subject })
  }
  if (policy.global) {
    checks.push({ dimension: 'global', key: bucketKey(name, 'global', 'all'), rule: policy.global })
  }

  const rows = await Promise.all(checks.map((check) => consume(supabase, check.key, check.rule)))

  let worst: RateLimitResult = { ok: true }
  rows.forEach((row, index) => {
    if (!row || row.allowed) return
    const check = checks[index]!
    if (worst.ok || row.retry_after_seconds > worst.retryAfterSeconds) {
      worst = { ok: false, retryAfterSeconds: row.retry_after_seconds, dimension: check.dimension, hits: row.hit_count, limit: check.rule.limit }
    }
  })
  return worst
}

/** Delete buckets whose window ended more than an hour ago. Called by the daily run; keeps the table the size of "who knocked recently". */
export async function purgeExpiredRateLimits(supabase: SupabaseClient): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('rate_limit_buckets').delete().lt('expires_at', cutoff).select('bucket_key')
  if (error) throw new Error(`rate limit purge failed: ${error.message}`)
  return { deleted: data?.length ?? 0 }
}
