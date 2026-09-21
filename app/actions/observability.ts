'use server'

import { canAccessNotifications, getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { requireSupabase } from '@/lib/admin/pipeline'
import { ERROR_GROUP_STATUSES, type ErrorGroupStatus } from '@/lib/admin/observability'
import { captureError } from '@/lib/observability/store'

/**
 * Phase 24 — the one thing the Observability page changes: what the owner has
 * decided about an error group. `resolved` (fixed — if it comes back it reopens
 * itself, which is how a regression shows up), `ignored` (known, not worth acting
 * on; it keeps counting), or `open` again. Owner-only, session re-checked here like
 * every other admin action, and audited.
 */

export type SetErrorGroupStatusResult = { ok: true } | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid' | 'not-found' | 'error' }

async function requireOwnerSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session) || !canAccessNotifications(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

export async function setErrorGroupStatus(fingerprint: string, status: ErrorGroupStatus): Promise<SetErrorGroupStatusResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (typeof fingerprint !== 'string' || !/^[0-9a-f]{32}$|^overflow$/.test(fingerprint) || !(ERROR_GROUP_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, code: 'invalid' }
  }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('error_groups')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('fingerprint', fingerprint)
    .select('fingerprint, event')
  if (error) {
    await captureError(error, { event: 'admin.error_group_update_failed', source: 'action', supabase })
    return { ok: false, code: 'error' }
  }
  if (!data || data.length === 0) return { ok: false, code: 'not-found' }

  await writeAuditLog({ actor: auth.userId, action: 'observability.error_group_status', entity: 'error_group', entityId: fingerprint, after: { status, event: data[0]!.event } })
  return { ok: true }
}
