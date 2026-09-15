import 'server-only'

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
 * success/failure to the caller regardless of whether this succeeds. A
 * dropped audit entry is logged to the server console so it isn't
 * silently invisible; turning that into a real alert is Phase 24
 * (Observability)'s scope, not this one's — recorded as known debt in
 * the phase document rather than solved here.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const client = getSupabaseServerClient()
  if (!client) {
    console.error(`[audit] Supabase not configured — dropped entry: ${entry.action}`)
    return
  }

  const { error } = await client.from('audit_log').insert({
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    correlation_id: entry.correlationId ?? null,
  })

  if (error) {
    console.error(`[audit] insert failed for "${entry.action}": ${error.message}`)
  }
}
