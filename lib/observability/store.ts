import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { currentRequestId } from '@/lib/observability/context'
import { log, type LogFields, type LogLevel } from '@/lib/observability/logger'
import { EVENT_NAME, fingerprintOf, redactFields, redactPath, serializeError } from '@/lib/observability/redact'
import { isRequestId } from '@/lib/observability/request-id'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Persistence for the two things worth finding tomorrow (Phase 24):
 *
 *  - `track()` — a business or reliability EVENT → `ops_events`
 *  - `captureError()` — a FAILURE → a log line and a row in `error_groups`
 *
 * Both are best-effort and never throw: a diagnostic that can break the request
 * it describes is worse than no diagnostic. Both write the log line FIRST, so the
 * record exists even when the database is the thing that is broken — and if the
 * database write fails, that is one warning line, never another `captureError`
 * (a failing store reporting to itself would loop).
 *
 * They are `async` because a serverless function may be frozen the moment the
 * response is sent; callers that can `await` them do.
 */

export type ErrorSource = 'server' | 'action' | 'route' | 'cron' | 'render' | 'client' | 'csp' | 'notification' | 'database' | 'other'

export type CaptureContext = {
  /** `area.what_failed`, e.g. `inquiry.persist_failed`. Part of the fingerprint: keep it stable. */
  event: string
  source?: ErrorSource
  /** A route pattern (`/[locale]/work/[slug]`) or a path — either way it is redacted before it is stored. */
  route?: string
  /** Next.js's digest for a server render error: the number the visitor's error page shows. */
  digest?: string
  requestId?: string
  /** Log level of the line. `warn` for failures the request survived deliberately (a swallowed best-effort write). Default `error`. */
  level?: 'warn' | 'error'
  /** Small context. Redacted (private keys replaced, strings scrubbed) before it is logged or stored. */
  fields?: Record<string, unknown>
  /** Tests inject one; `null` means "log only". Omit to use the server client. */
  supabase?: SupabaseClient | null
}

function clientFor(explicit: SupabaseClient | null | undefined): SupabaseClient | null {
  return explicit === undefined ? getSupabaseServerClient() : explicit
}

const DATA_LIMIT = 3500

function boundedData(fields: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!fields) return {}
  const redacted = redactFields(fields) as Record<string, unknown>
  return JSON.stringify(redacted).length <= DATA_LIMIT ? redacted : { truncated: true }
}

export async function captureError(err: unknown, ctx: CaptureContext): Promise<void> {
  const requestId = ctx.requestId ?? currentRequestId()
  const route = ctx.route ? redactPath(ctx.route) : undefined
  const line: LogFields = { err, requestId, ...(route ? { route } : {}), ...(ctx.digest ? { digest: ctx.digest } : {}), ...ctx.fields }
  if (ctx.level === 'warn') log.warn(ctx.event, line)
  else log.error(ctx.event, line)

  if (!EVENT_NAME.test(ctx.event)) return
  const supabase = clientFor(ctx.supabase)
  if (!supabase) return

  try {
    const serialized = serializeError(err)
    const fingerprint = fingerprintOf({ event: ctx.event, name: serialized.name, message: serialized.message, route: route ?? null })
    const { error } = await supabase.rpc('record_error_event', {
      p_fingerprint: fingerprint,
      p_source: ctx.source ?? 'server',
      p_event: ctx.event,
      p_name: serialized.name,
      p_message: serialized.message,
      p_stack: serialized.stack ?? null,
      p_route: route ?? null,
      p_digest: ctx.digest ? ctx.digest.slice(0, 100) : null,
      p_request_id: isRequestId(requestId) ? requestId : null,
      p_data: boundedData(ctx.fields),
    })
    if (error) log.warn('observability.persist_failed', { what: 'error_group', err: error })
  } catch (persistError) {
    log.warn('observability.persist_failed', { what: 'error_group', err: persistError })
  }
}

export type TrackOptions = {
  level?: LogLevel
  /** What the event is about: `{ type: 'inquiry', id }`. The id is stored as text; never put an address or a name here. */
  subject?: { type: string; id: string }
  data?: Record<string, unknown>
  /** Skip the write if the same event for the same subject was recorded within this many seconds. The log line is always written. */
  dedupeSeconds?: number
  requestId?: string
  supabase?: SupabaseClient | null
}

/** Records an event. Resolves to whether a row was written (false: not configured, de-duplicated, or the write failed). */
export async function track(name: string, options: TrackOptions = {}): Promise<boolean> {
  const level = options.level ?? 'info'
  const requestId = options.requestId ?? currentRequestId()
  const data = boundedData(options.data)
  log[level](name, { requestId, ...(options.subject ? { subjectType: options.subject.type, subjectId: options.subject.id } : {}), ...data })

  if (!EVENT_NAME.test(name)) return false
  const supabase = clientFor(options.supabase)
  if (!supabase) return false

  try {
    const { data: written, error } = await supabase.rpc('record_ops_event', {
      p_level: level,
      p_name: name,
      p_request_id: isRequestId(requestId) ? requestId : null,
      p_subject_type: options.subject?.type ?? null,
      p_subject_id: options.subject?.id ?? null,
      p_data: data,
      p_dedupe_seconds: options.dedupeSeconds ?? 0,
    })
    if (error) {
      log.warn('observability.persist_failed', { what: 'ops_event', event: name, err: error })
      return false
    }
    return written === true
  } catch (persistError) {
    log.warn('observability.persist_failed', { what: 'ops_event', event: name, err: persistError })
    return false
  }
}

/** The daily run's housekeeping: events and error groups older than 90 days. */
export async function purgeOpsData(supabase: SupabaseClient): Promise<{ eventsDeleted: number; groupsDeleted: number }> {
  const { data, error } = await supabase.rpc('purge_ops_data', { p_events_days: 90, p_groups_days: 90 })
  if (error || !Array.isArray(data) || data.length === 0) {
    throw new Error(`ops purge failed: ${error?.message ?? 'no row returned'}`)
  }
  const row = data[0] as { events_deleted: number | string; groups_deleted: number | string }
  return { eventsDeleted: Number(row.events_deleted), groupsDeleted: Number(row.groups_deleted) }
}
