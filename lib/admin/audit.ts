import 'server-only'

import { getRequestId } from '@/lib/observability/context'
import { log } from '@/lib/observability/logger'
import { track } from '@/lib/observability/store'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/** Matches `db/migrations/0008_admin_and_audit.sql`'s `audit_log` columns (roadmap § 12's table). */
export type AuditEntry = {
  /** Email for sign-in attempts (the user isn't authenticated yet, so no `userId`); user id once authenticated. */
  actor: string
  action: string
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
  correlationId?: string
}

/**
 * Roadmap § 13 — "auth event logging, audit log for every admin
 * mutation". Best-effort and non-throwing on purpose: a failed audit
 * insert must never block a sign-in, sign-out or MFA check for the
 * person it's about — those already return their own honest
 * success/failure to the caller regardless of whether this succeeds.
 *
 * Phase 24: every entry is also one structured log line (`audit.recorded`,
 * carrying the action and the request id, never the before/after payloads), and
 * the row's `correlation_id` is the request's id — so an audit row and the log
 * lines of the request that wrote it find each other. A dropped entry is no
 * longer only a console line: it is an `audit.write_failed` event, which the
 * alert rules treat as an error (the security trail lost something).
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const correlationId = entry.correlationId ?? (await getRequestId())
  log.info('audit.recorded', { action: entry.action, entity: entry.entity, entityId: entry.entityId, requestId: correlationId })

  const client = getSupabaseServerClient()
  if (!client) {
    log.error('audit.write_failed', { action: entry.action, reason: 'supabase-not-configured' })
    return
  }

  const { error } = await client.from('audit_log').insert({
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    correlation_id: correlationId ?? null,
  })

  if (error) {
    await track('audit.write_failed', {
      level: 'error',
      dedupeSeconds: 60,
      requestId: correlationId,
      data: { action: entry.action, entity: entry.entity, reason: error.message.slice(0, 200) },
      supabase: client,
    })
  }
}
