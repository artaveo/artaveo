import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ALERT_TEXT, deriveAlerts, THRESHOLDS, type Alert, type AlertFacts } from '@/lib/observability/alert-rules'
import { log } from '@/lib/observability/logger'
import { track } from '@/lib/observability/store'
import { enqueueOpsAlert } from '@/lib/notifications/events'
import { processOutboxBatch } from '@/lib/notifications/outbox'
import { checkSecurityConfig } from '@/lib/security/config-check'

/**
 * Reads the database, hands the numbers to the pure rules (`alert-rules.ts`),
 * and — for the callers that should — e-mails about what is firing.
 *
 * `gatherFacts` throws when a query fails: an alert check that quietly reports
 * "all clear" because it could not look is the worst thing it can do. The callers
 * decide what "could not look" means (the external check turns it into a failing
 * status; the admin page says so).
 */

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function ago(now: Date, ms: number): string {
  return new Date(now.getTime() - ms).toISOString()
}

async function count(query: PromiseLike<{ count: number | null; error: { message: string } | null }>, what: string): Promise<number> {
  const { count: n, error } = await query
  if (error) throw new Error(`alert facts: ${what}: ${error.message}`)
  return n ?? 0
}

/** Inquiries from the last 7 days, older than the grace period, that have no outbox row at all. */
export async function countInquiriesWithoutMessages(supabase: SupabaseClient, now: Date): Promise<number> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('id')
    .gte('created_at', ago(now, 7 * DAY_MS))
    .lte('created_at', ago(now, THRESHOLDS.uncoveredGraceMinutes * 60 * 1000))
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`alert facts: recent inquiries: ${error.message}`)
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id)
  if (ids.length === 0) return 0

  const { data: covered, error: coveredError } = await supabase.from('notification_outbox').select('inquiry_id').in('inquiry_id', ids)
  if (coveredError) throw new Error(`alert facts: covered inquiries: ${coveredError.message}`)
  const coveredIds = new Set(((covered ?? []) as { inquiry_id: string }[]).map((row) => row.inquiry_id))
  return ids.filter((id) => !coveredIds.has(id)).length
}

async function latestEventAt(supabase: SupabaseClient, name: string): Promise<string | null> {
  const { data, error } = await supabase.from('ops_events').select('occurred_at').eq('name', name).order('occurred_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`alert facts: latest ${name}: ${error.message}`)
  return (data as { occurred_at: string } | null)?.occurred_at ?? null
}

export async function gatherFacts(supabase: SupabaseClient, now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): Promise<AlertFacts> {
  const [
    failedAttempts,
    exhausted,
    stuck,
    uncovered,
    spikes,
    newOpen,
    limiterDown,
    auditFailed,
    signInCrossings,
    lastCronAt,
    lastMonitorAt,
  ] = await Promise.all([
    count(supabase.from('notification_attempts').select('id', { count: 'exact', head: true }).eq('ok', false).gte('at', ago(now, HOUR_MS)), 'failed attempts'),
    count(supabase.from('notification_outbox').select('id', { count: 'exact', head: true }).eq('status', 'exhausted').gte('last_attempt_at', ago(now, DAY_MS)), 'exhausted messages'),
    count(
      supabase
        .from('notification_outbox')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'failed'])
        .lte('next_attempt_at', ago(now, THRESHOLDS.stuckMessageHours * HOUR_MS)),
      'stuck messages',
    ),
    countInquiriesWithoutMessages(supabase, now),
    (async () => {
      // Client and CSP reports come from the public and can be forged: they are listed on the admin page, never alarming.
      const { data, error } = await supabase
        .from('error_groups')
        .select('event, window_count')
        .eq('status', 'open')
        .not('source', 'in', '(client,csp)')
        .gte('window_started_at', ago(now, HOUR_MS))
        .gte('window_count', THRESHOLDS.errorSpikePerHour)
        .limit(20)
      if (error) throw new Error(`alert facts: error spikes: ${error.message}`)
      return ((data ?? []) as { event: string; window_count: number }[]).map((row) => ({ event: row.event, windowCount: row.window_count }))
    })(),
    count(
      supabase
        .from('error_groups')
        .select('fingerprint', { count: 'exact', head: true })
        .eq('status', 'open')
        .not('source', 'in', '(client,csp)')
        .gte('first_seen_at', ago(now, DAY_MS)),
      'new error groups',
    ),
    count(supabase.from('ops_events').select('id', { count: 'exact', head: true }).eq('name', 'rate_limit.unavailable').gte('occurred_at', ago(now, HOUR_MS)), 'limiter events'),
    count(supabase.from('ops_events').select('id', { count: 'exact', head: true }).eq('name', 'audit.write_failed').gte('occurred_at', ago(now, DAY_MS)), 'audit failures'),
    count(supabase.from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'admin.sign_in_rate_limited').gte('at', ago(now, DAY_MS)), 'sign-in limit crossings'),
    latestEventAt(supabase, 'cron.completed'),
    latestEventAt(supabase, 'monitor.checked'),
  ])

  return {
    now,
    notifications: {
      failedAttemptsLastHour: failedAttempts,
      exhaustedLast24h: exhausted,
      stuckMessages: stuck,
      inquiriesWithoutMessages: uncovered,
    },
    errors: { spikes, newOpenLast24h: newOpen },
    events: {
      limiterUnavailableLastHour: limiterDown,
      auditWriteFailedLast24h: auditFailed,
      lastCronAt,
      lastMonitorAt,
      signInLimitCrossingsLast24h: signInCrossings,
    },
    configErrors: checkSecurityConfig(env)
      .filter((finding) => finding.severity === 'error')
      .map((finding) => finding.id),
  }
}

export async function evaluateAlerts(supabase: SupabaseClient, now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): Promise<{ facts: AlertFacts; alerts: Alert[] }> {
  const facts = await gatherFacts(supabase, now, env)
  return { facts, alerts: deriveAlerts(facts) }
}

/** The day an alert e-mail belongs to. One problem, one e-mail a day. */
export function alertDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

export type RaiseResult = { raised: string[]; alreadySent: string[] }

/**
 * E-mails the owner about every `error` alert that has not already been e-mailed
 * today, and records each as an `alert.raised` event. Warnings are never e-mailed.
 *
 * The message goes through the same outbox as every other e-mail, so if e-mail is
 * the thing that is broken this row fails like the others — which is why an alert
 * is also visible on the admin page and in the external check's result, neither
 * of which depends on e-mail.
 */
export async function raiseAlerts(supabase: SupabaseClient, alerts: Alert[], now: Date = new Date()): Promise<RaiseResult> {
  const result: RaiseResult = { raised: [], alreadySent: [] }
  const day = alertDay(now)
  const outboxIds: string[] = []

  for (const alert of alerts) {
    if (alert.severity !== 'error') continue
    const rows = await enqueueOpsAlert(supabase, { alert, day, text: ALERT_TEXT[alert.id] })
    if (rows.length === 0) {
      result.alreadySent.push(alert.id)
      continue
    }
    result.raised.push(alert.id)
    outboxIds.push(...rows.map((row) => row.id))
    await track('alert.raised', { level: 'warn', subject: { type: 'alert', id: alert.id }, data: { count: alert.count, severity: alert.severity }, supabase })
  }

  if (outboxIds.length > 0) {
    try {
      // `alerts: false`: an alert e-mail that fails must not raise an alert about itself.
      await processOutboxBatch(supabase, { ids: outboxIds, alerts: false, sendTimeoutMs: 4_000, deadlineMs: 8_000 })
    } catch (err) {
      log.warn('alerts.send_failed', { err })
    }
  }
  return result
}
