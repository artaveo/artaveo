import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_STATUSES,
  type NotificationAttemptRow,
  type NotificationAttemptView,
  type NotificationFilters,
  type NotificationOutboxRow,
  type NotificationStatus,
  type NotificationSummary,
  type NotificationView,
} from '@/types/notifications'
import { captureError } from '@/lib/observability/store'

/**
 * Phase 19 — reads for `/admin/notifications`. Owner-only at the page and
 * action level (`canAccessNotifications`); the service-role client is never
 * reachable from the browser, so these functions are the only door.
 */

export const NOTIFICATIONS_PAGE_SIZE = 25

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isNotificationId(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function parseStatusFilter(value: string | undefined): NotificationStatus | undefined {
  return (NOTIFICATION_STATUSES as readonly string[]).includes(value ?? '') ? (value as NotificationStatus) : undefined
}

export function parseKindFilter(value: string | undefined): NotificationView['kind'] | undefined {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value ?? '') ? (value as NotificationView['kind']) : undefined
}

function mapRow(row: NotificationOutboxRow): NotificationView {
  return {
    id: row.id,
    createdAt: row.created_at,
    kind: row.kind,
    status: row.status,
    recipientEmail: row.recipient_email,
    replyTo: row.reply_to,
    locale: row.locale,
    subject: row.subject,
    bodyText: row.body_text,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    lastProvider: row.last_provider,
    lastAttemptAt: row.last_attempt_at,
    nextAttemptAt: row.next_attempt_at,
    sentAt: row.sent_at,
    inquiryId: row.inquiry_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    attachmentNames: Array.isArray(row.attachments) ? row.attachments.map((attachment) => attachment.filename) : [],
    requestId: row.request_id ?? null,
  }
}

function mapAttempt(row: NotificationAttemptRow): NotificationAttemptView {
  return {
    id: row.id,
    attemptNo: row.attempt_no,
    at: row.at,
    provider: row.provider,
    ok: row.ok,
    retryable: row.retryable,
    error: row.error,
    providerMessageId: row.provider_message_id,
    durationMs: row.duration_ms,
  }
}

/** `null` = Supabase is not configured (the page says so); `[]` with a total of 0 = a real empty result or a failed query (logged). */
export async function listNotifications(
  filters: NotificationFilters,
): Promise<{ notifications: NotificationView[]; total: number } | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? NOTIFICATIONS_PAGE_SIZE

  let query = supabase.from('notification_outbox').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.kind) query = query.eq('kind', filters.kind)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error || !data) {
    await captureError(error, { event: 'admin.list_notifications_failed', source: 'database' })
    return { notifications: [], total: 0 }
  }
  return { notifications: (data as NotificationOutboxRow[]).map(mapRow), total: count ?? data.length }
}

export async function getNotification(
  id: string,
): Promise<{ notification: NotificationView; attempts: NotificationAttemptView[] } | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase || !isNotificationId(id)) return null

  const [rowResult, attemptsResult] = await Promise.all([
    supabase.from('notification_outbox').select('*').eq('id', id).maybeSingle(),
    supabase.from('notification_attempts').select('*').eq('outbox_id', id).order('attempt_no', { ascending: true }),
  ])
  if (rowResult.error || !rowResult.data) return null

  return {
    notification: mapRow(rowResult.data as NotificationOutboxRow),
    attempts: ((attemptsResult.data ?? []) as NotificationAttemptRow[]).map(mapAttempt),
  }
}

/** Cheap enough for the dashboard: one head-only count. `null` when it cannot be read. */
export async function countExhaustedNotifications(): Promise<number | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { count, error } = await supabase
    .from('notification_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'exhausted')
  if (error) return null
  return count ?? 0
}

export async function getNotificationSummary(now: Date = new Date()): Promise<NotificationSummary | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const nowIso = now.toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [statusCounts, overdue, oldest, recentInquiries] = await Promise.all([
    Promise.all(
      NOTIFICATION_STATUSES.map((status) =>
        supabase.from('notification_outbox').select('id', { count: 'exact', head: true }).eq('status', status),
      ),
    ),
    supabase
      .from('notification_outbox')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', nowIso),
    supabase
      .from('notification_outbox')
      .select('next_attempt_at')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', nowIso)
      .order('next_attempt_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('inquiries').select('id').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(200),
  ])

  const counts = Object.fromEntries(
    NOTIFICATION_STATUSES.map((status, index) => [status, statusCounts[index]?.count ?? 0]),
  ) as Record<NotificationStatus, number>

  // An enqueue that never landed leaves an inquiry with no outbox row at all.
  // Two reads and a set difference, because PostgREST has no anti-join.
  let withoutNotifications = 0
  const inquiryIds = ((recentInquiries.data ?? []) as { id: string }[]).map((row) => row.id)
  if (inquiryIds.length > 0) {
    const { data: covered } = await supabase.from('notification_outbox').select('inquiry_id').in('inquiry_id', inquiryIds)
    const coveredIds = new Set(((covered ?? []) as { inquiry_id: string }[]).map((row) => row.inquiry_id))
    withoutNotifications = inquiryIds.filter((id) => !coveredIds.has(id)).length
  }

  return {
    counts,
    overdue: overdue.count ?? 0,
    oldestOverdueAt: (oldest.data as { next_attempt_at: string } | null)?.next_attempt_at ?? null,
    recentInquiriesWithoutNotifications: withoutNotifications,
  }
}
