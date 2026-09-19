'use server'

import { canAccessNotifications, getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { isNotificationId } from '@/lib/admin/notifications'
import { requireSupabase } from '@/lib/admin/pipeline'
import { processOutboxBatch, requeueNotification } from '@/lib/notifications/outbox'
import type { NotificationStatus } from '@/types/notifications'

/**
 * Phase 19 Server Actions for `/admin/notifications`. Same shape as
 * `app/actions/pipeline.ts`: each action re-checks its own session (signed in,
 * MFA-satisfied, owner) rather than trusting the page, and writes an
 * `audit_log` row for every real change.
 */

type NotificationActionError = { ok: false; code: 'forbidden' | 'not-configured' | 'not-found' | 'not-retryable' | 'error' }

export type RetryNotificationResult = NotificationActionError | { ok: true; finalStatus: NotificationStatus | null }

export type SendDueResult = NotificationActionError | { ok: true; attempted: number; sent: number; failed: number }

async function requireOwnerSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session) || !canAccessNotifications(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

/**
 * "Retry now" on one message. A `failed` or `exhausted` message is requeued
 * (more attempts allowed, due immediately) and sent straight away; a `pending`
 * one that is already due is just sent. `finalStatus` is what the message
 * actually ended up as, so the admin sees the truth rather than "queued".
 */
export async function retryNotification(id: string): Promise<RetryNotificationResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isNotificationId(id)) return { ok: false, code: 'not-found' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: current } = await supabase.from('notification_outbox').select('status').eq('id', id).maybeSingle()
  if (!current) return { ok: false, code: 'not-found' }

  if (current.status === 'failed' || current.status === 'exhausted') {
    const requeued = await requeueNotification(supabase, id)
    if (requeued === 'not-found') return { ok: false, code: 'not-found' }
    if (requeued === 'not-retryable') return { ok: false, code: 'not-retryable' }
    if (requeued === 'error') return { ok: false, code: 'error' }
  } else if (current.status !== 'pending') {
    // `sent` is never sent twice on purpose; `sending` is already in flight.
    return { ok: false, code: 'not-retryable' }
  }

  await processOutboxBatch(supabase, { ids: [id], deadlineMs: 15_000 })

  const { data: after } = await supabase.from('notification_outbox').select('status').eq('id', id).maybeSingle()

  await writeAuditLog({
    actor: auth.userId,
    action: 'notification.retried',
    entity: 'notification',
    entityId: id,
    before: { status: current.status },
    after: { status: after?.status ?? null },
  })

  return { ok: true, finalStatus: (after?.status as NotificationStatus | undefined) ?? null }
}

/** "Send due messages now" — the same sweep the cron runs, on demand. */
export async function sendDueNotifications(): Promise<SendDueResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const result = await processOutboxBatch(supabase, { limit: 50, deadlineMs: 20_000 })

  await writeAuditLog({
    actor: auth.userId,
    action: 'notification.sweep_manual',
    entity: 'notification',
    after: { attempted: result.attempted, sent: result.sent, failed: result.failed },
  })

  return { ok: true, attempted: result.attempted, sent: result.sent, failed: result.failed }
}
