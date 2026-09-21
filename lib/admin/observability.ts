import 'server-only'

import { evaluateAlerts } from '@/lib/observability/alerts'
import type { Alert, AlertFacts } from '@/lib/observability/alert-rules'
import { checkDatabase, type CheckResult } from '@/lib/observability/health'
import { isRequestId } from '@/lib/observability/request-id'
import { captureError } from '@/lib/observability/store'
import { checkSecurityConfig, type ConfigFinding } from '@/lib/security/config-check'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Phase 24 — reads for `/admin/observability`. Owner-only at the page and the
 * action (`canAccessNotifications`, the same rule as the notification log: the
 * page shows request references and error text that can point at leads).
 * Everything here reads only what was stored already scrubbed.
 */

export const ERROR_GROUP_STATUSES = ['open', 'resolved', 'ignored'] as const
export type ErrorGroupStatus = (typeof ERROR_GROUP_STATUSES)[number]

export type ErrorGroupView = {
  fingerprint: string
  source: string
  event: string
  name: string
  message: string
  route: string | null
  digest: string | null
  firstSeenAt: string
  lastSeenAt: string
  eventCount: number
  windowCount: number
  status: ErrorGroupStatus
  lastRequestId: string | null
}

export type OpsEventView = {
  id: string
  occurredAt: string
  level: 'info' | 'warn' | 'error'
  name: string
  requestId: string | null
  subjectType: string | null
  subjectId: string | null
}

/** The business events the funnel table counts, in display order. */
export const FUNNEL_EVENTS = ['inquiry.submitted', 'consultation.requested', 'evidence.submitted', 'content.published'] as const
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]
export type FunnelRow = { name: FunnelEvent; last24h: number; last7d: number; last30d: number }

export type ObservabilityOverview = {
  now: string
  alerts: Alert[]
  facts: AlertFacts
  database: CheckResult
  configFindings: ConfigFinding[]
  cronSecretConfigured: boolean
  funnel: FunnelRow[]
  groups: ErrorGroupView[]
  openGroupCount: number
  events: OpsEventView[]
}

type GroupRow = {
  fingerprint: string
  source: string
  event: string
  name: string
  message: string
  route: string | null
  digest: string | null
  first_seen_at: string
  last_seen_at: string
  event_count: number | string
  window_count: number
  status: ErrorGroupStatus
  last_request_id: string | null
}

type EventRow = {
  id: string
  occurred_at: string
  level: 'info' | 'warn' | 'error'
  name: string
  request_id: string | null
  subject_type: string | null
  subject_id: string | null
}

const mapGroup = (row: GroupRow): ErrorGroupView => ({
  fingerprint: row.fingerprint,
  source: row.source,
  event: row.event,
  name: row.name,
  message: row.message,
  route: row.route,
  digest: row.digest,
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  eventCount: Number(row.event_count),
  windowCount: row.window_count,
  status: row.status,
  lastRequestId: row.last_request_id,
})

const mapEvent = (row: EventRow): OpsEventView => ({
  id: row.id,
  occurredAt: row.occurred_at,
  level: row.level,
  name: row.name,
  requestId: row.request_id,
  subjectType: row.subject_type,
  subjectId: row.subject_id,
})

const DAY_MS = 24 * 60 * 60 * 1000

export function parseGroupStatus(value: string | undefined): ErrorGroupStatus | undefined {
  return (ERROR_GROUP_STATUSES as readonly string[]).includes(value ?? '') ? (value as ErrorGroupStatus) : undefined
}

/**
 * `null` = Supabase is not configured (the page says so). Throws when a query fails —
 * the page catches it and says "could not read", because an overview that shows
 * zeros when it could not look is a lie.
 */
export async function getObservabilityOverview(now: Date = new Date()): Promise<ObservabilityOverview | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const since = (ms: number) => new Date(now.getTime() - ms).toISOString()
  const funnelCount = async (name: string, ms: number) => {
    const { count, error } = await supabase.from('ops_events').select('id', { count: 'exact', head: true }).eq('name', name).gte('occurred_at', since(ms))
    if (error) throw new Error(`funnel ${name}: ${error.message}`)
    return count ?? 0
  }

  const [database, evaluated, funnel, groups, openCount, events] = await Promise.all([
    checkDatabase(supabase),
    evaluateAlerts(supabase, now),
    Promise.all(
      FUNNEL_EVENTS.map(async (name): Promise<FunnelRow> => ({
        name,
        last24h: await funnelCount(name, DAY_MS),
        last7d: await funnelCount(name, 7 * DAY_MS),
        last30d: await funnelCount(name, 30 * DAY_MS),
      })),
    ),
    supabase.from('error_groups').select('*').order('status', { ascending: true }).order('last_seen_at', { ascending: false }).limit(200),
    supabase.from('error_groups').select('fingerprint', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('ops_events').select('id, occurred_at, level, name, request_id, subject_type, subject_id').order('occurred_at', { ascending: false }).limit(40),
  ])
  if (groups.error) throw new Error(`error groups: ${groups.error.message}`)
  if (events.error) throw new Error(`events: ${events.error.message}`)

  // `status` sorts open < resolved < ignored alphabetically only by luck; make it explicit and keep recency inside each.
  const rank: Record<string, number> = { open: 0, ignored: 2, resolved: 1 }
  const sorted = ((groups.data ?? []) as GroupRow[]).map(mapGroup).sort((a, b) => rank[a.status]! - rank[b.status]! || b.lastSeenAt.localeCompare(a.lastSeenAt))

  return {
    now: now.toISOString(),
    alerts: evaluated.alerts,
    facts: evaluated.facts,
    database,
    configFindings: checkSecurityConfig(process.env),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    funnel,
    groups: sorted.slice(0, 50),
    openGroupCount: openCount.count ?? 0,
    events: ((events.data ?? []) as EventRow[]).map(mapEvent),
  }
}

/** Cheap enough for the dashboard. `null` when it cannot be read (the dashboard then simply omits the banner). */
export async function countFiringAlerts(): Promise<{ errors: number; warnings: number } | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  try {
    const { alerts } = await evaluateAlerts(supabase)
    return { errors: alerts.filter((alert) => alert.severity === 'error').length, warnings: alerts.filter((alert) => alert.severity === 'warning').length }
  } catch (err) {
    await captureError(err, { event: 'admin.alert_count_failed', source: 'database', level: 'warn', supabase })
    return null
  }
}

export type ReferenceResult =
  | { kind: 'invalid' }
  | {
      kind: 'found'
      ref: string
      groups: ErrorGroupView[]
      events: OpsEventView[]
      audit: { id: string; at: string; action: string; entity: string }[]
      notifications: { id: string; createdAt: string; kind: string; status: string }[]
      inquiries: { id: string; createdAt: string }[]
      timeline: { id: string; inquiryId: string; createdAt: string; type: string }[]
    }

/**
 * "Paste a reference": a request id (a UUID — from a log line, an inquiry, an
 * e-mail's detail page) or a digest (the short number on a visitor's error page).
 * Returns everything that carries it. Both are looked up with equality on an indexed
 * column; nothing free-form reaches a filter.
 */
export async function lookupReference(input: string): Promise<ReferenceResult | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const ref = input.trim()
  const isId = isRequestId(ref)
  if (!isId && !/^[A-Za-z0-9_-]{1,40}$/.test(ref)) return { kind: 'invalid' }

  const groupsQuery = supabase.from('error_groups').select('*').limit(20)
  const groups = await (isId ? groupsQuery.eq('last_request_id', ref.toLowerCase()) : groupsQuery.eq('digest', ref))
  if (groups.error) throw new Error(`reference: ${groups.error.message}`)

  if (!isId) {
    return { kind: 'found', ref, groups: ((groups.data ?? []) as GroupRow[]).map(mapGroup), events: [], audit: [], notifications: [], inquiries: [], timeline: [] }
  }

  const id = ref.toLowerCase()
  const [events, audit, outbox, inquiries, timeline] = await Promise.all([
    supabase.from('ops_events').select('id, occurred_at, level, name, request_id, subject_type, subject_id').eq('request_id', id).order('occurred_at', { ascending: true }).limit(50),
    supabase.from('audit_log').select('id, at, action, entity').eq('correlation_id', id).order('at', { ascending: true }).limit(50),
    supabase.from('notification_outbox').select('id, created_at, kind, status').eq('request_id', id).limit(50),
    supabase.from('inquiries').select('id, created_at').eq('request_id', id).limit(20),
    supabase.from('inquiry_events').select('id, inquiry_id, created_at, type').eq('request_id', id).order('created_at', { ascending: true }).limit(50),
  ])
  for (const result of [events, audit, outbox, inquiries, timeline]) {
    if (result.error) throw new Error(`reference: ${result.error.message}`)
  }

  return {
    kind: 'found',
    ref,
    groups: ((groups.data ?? []) as GroupRow[]).map(mapGroup),
    events: ((events.data ?? []) as EventRow[]).map(mapEvent),
    audit: ((audit.data ?? []) as { id: string; at: string; action: string; entity: string }[]),
    notifications: ((outbox.data ?? []) as { id: string; created_at: string; kind: string; status: string }[]).map((row) => ({ id: row.id, createdAt: row.created_at, kind: row.kind, status: row.status })),
    inquiries: ((inquiries.data ?? []) as { id: string; created_at: string }[]).map((row) => ({ id: row.id, createdAt: row.created_at })),
    timeline: ((timeline.data ?? []) as { id: string; inquiry_id: string; created_at: string; type: string }[]).map((row) => ({ id: row.id, inquiryId: row.inquiry_id, createdAt: row.created_at, type: row.type })),
  }
}
