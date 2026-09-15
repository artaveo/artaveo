import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Locale } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import { siteConfig } from '@/lib/site'
import { getEmailProvider } from '@/lib/notifications/provider'
import { buildClientConfirmationEmail, buildOwnerAlertEmail } from '@/lib/notifications/templates'
import { getAllServices, getEngagementModels } from '@/lib/services-content'

/**
 * § 9.3 — Notifications: outbox pattern ("persist first, send after").
 *
 * `enqueueInquiryNotifications` writes both rows to
 * `notification_outbox` (0002_notification_outbox.sql) BEFORE anything is
 * sent — an unavailable provider, a crash, or (today) the console
 * provider being a deliberate no-op can never lose the fact that an
 * inquiry needed these two notifications. `processOutboxBatch` is the
 * only thing that ever attempts an actual send; it is called two ways:
 *
 *  1. Inline, best-effort, right after enqueueing (`app/actions/inquiries.ts`)
 *     — covers the normal case where sending succeeds immediately.
 *  2. From the daily retry sweep (`app/api/cron/notifications/route.ts`)
 *     — catches anything the inline attempt missed. Vercel's Hobby plan
 *     only allows a once-per-day cron cadence (documented trade-off,
 *     `docs/phases/PHASE-9.3-README.md`); this is acceptable because the
 *     inline attempt already covers the common case, and no inquiry data
 *     is ever at risk either way — only the notification's timeliness is.
 */

const NOTIFICATION_KINDS = ['owner-alert', 'client-confirmation'] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export type NotificationOutboxRow = {
  id: string
  inquiry_id: string
  kind: NotificationKind
  recipient_email: string
  locale: Locale
  subject: string
  body_text: string
  status: 'pending' | 'sent' | 'failed' | 'exhausted'
  attempts: number
  max_attempts: number
  next_attempt_at: string
}

/** Enqueues the owner alert + client confirmation for one inquiry. Best-effort: never throws into the caller's insert path. */
export async function enqueueInquiryNotifications(
  supabase: SupabaseClient,
  inquiryId: string,
  draft: InquiryDraft,
): Promise<{ id: string }[]> {
  // Phase 12.2 (roadmap § 12): services/engagement models are now
  // Supabase-backed — fetched here rather than threaded as parameters,
  // since this function is already server-only and async.
  const [services, engagementModels] = await Promise.all([getAllServices(), getEngagementModels()])
  const owner = buildOwnerAlertEmail(draft, inquiryId, services, engagementModels)
  const client = buildClientConfirmationEmail(draft, draft.preferredLocale, services, engagementModels)

  const { data, error } = await supabase
    .from('notification_outbox')
    .insert([
      {
        inquiry_id: inquiryId,
        kind: 'owner-alert' satisfies NotificationKind,
        recipient_email: siteConfig.email,
        locale: 'en',
        subject: owner.subject,
        body_text: owner.text,
      },
      {
        inquiry_id: inquiryId,
        kind: 'client-confirmation' satisfies NotificationKind,
        recipient_email: draft.email.trim().toLowerCase(),
        locale: draft.preferredLocale,
        subject: client.subject,
        body_text: client.text,
      },
    ])
    .select('id')

  if (error || !data) {
    console.error('notification_outbox insert failed (inquiry itself was saved):', error)
    return []
  }

  return data as { id: string }[]
}

/**
 * Backoff schedule by attempt number (1-indexed): 1min, 5min, 30min, 2h,
 * then the row's `max_attempts` (default 5) is reached and it becomes
 * 'exhausted' — a human needs to look at `last_error`.
 */
function backoffMsForAttempt(attempt: number): number {
  const schedule = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000]
  return schedule[Math.min(attempt - 1, schedule.length - 1)] ?? schedule[schedule.length - 1]!
}

export type ProcessOutboxOptions = {
  /** Restrict to specific rows (used for the inline best-effort attempt right after enqueueing). Omit to sweep everything due. */
  ids?: string[]
  limit?: number
}

/** Attempts to send every due row (or the given `ids`). Never throws — every row's own error is recorded on that row. */
export async function processOutboxBatch(
  supabase: SupabaseClient,
  options: ProcessOutboxOptions = {},
): Promise<{ attempted: number; sent: number; failed: number }> {
  const limit = options.limit ?? 20

  let query = supabase
    .from('notification_outbox')
    .select('id, inquiry_id, kind, recipient_email, locale, subject, body_text, status, attempts, max_attempts, next_attempt_at')
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (options.ids?.length) {
    query = query.in('id', options.ids)
  }

  const { data: rows, error } = await query

  if (error || !rows) {
    console.error('notification_outbox fetch failed:', error)
    return { attempted: 0, sent: 0, failed: 0 }
  }

  const provider = getEmailProvider()
  let sent = 0
  let failed = 0

  for (const row of rows as NotificationOutboxRow[]) {
    const result = await provider.send({
      to: row.recipient_email,
      subject: row.subject,
      text: row.body_text,
    })

    const attempts = row.attempts + 1

    if (result.ok) {
      sent += 1
      await supabase
        .from('notification_outbox')
        .update({
          status: 'sent',
          attempts,
          sent_at: new Date().toISOString(),
          last_provider: provider.id,
          last_error: null,
        })
        .eq('id', row.id)
      continue
    }

    failed += 1
    const exhausted = attempts >= row.max_attempts
    await supabase
      .from('notification_outbox')
      .update({
        status: exhausted ? 'exhausted' : 'failed',
        attempts,
        last_provider: provider.id,
        last_error: result.error.slice(0, 2000),
        next_attempt_at: new Date(Date.now() + backoffMsForAttempt(attempts)).toISOString(),
      })
      .eq('id', row.id)

    if (exhausted) {
      console.error(`notification_outbox row ${row.id} (${row.kind}) exhausted retries:`, result.error)
    }
  }

  return { attempted: rows.length, sent, failed }
}
