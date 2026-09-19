import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { AuditEntry } from '@/lib/admin/audit'
import { writeAuditLog } from '@/lib/admin/audit'
import { failureOutcome, maxAttemptsAfterManualRetry, nextAttemptAt } from '@/lib/notifications/backoff'
import { enqueueSystemAlert } from '@/lib/notifications/events'
import { DEFAULT_SEND_TIMEOUT_MS, getEmailProvider, type EmailProvider } from '@/lib/notifications/provider'
import type { NotificationOutboxRow } from '@/types/notifications'

/**
 * § 9.3 / Phase 19 — the outbox worker.
 *
 * "Persist first, send after": `lib/notifications/events.ts` writes a row for
 * every notification BEFORE anything is sent, so an unavailable provider, a
 * crash, or (today) the console provider being a deliberate no-op can never
 * lose the fact that something needed to be sent. This file is the only thing
 * that ever attempts a send.
 *
 * How a row is processed:
 *  1. CLAIM — `claim_notification_outbox()` (0017) atomically flips due rows to
 *     `sending` with a lease. Two callers (the inline attempt and the cron
 *     sweep, or two overlapping sweeps) can never take the same row; a worker
 *     that dies mid-send leaves a lease that expires and the row is picked up
 *     again.
 *  2. SEND — through the `EmailProvider`, with a stable idempotency key per
 *     row so that a retry after a lost response cannot deliver twice.
 *  3. RECORD — the row's own state is updated first (guarded by the lease this
 *     worker holds, so it can never overwrite a newer owner), then the attempt
 *     is appended to `notification_attempts`. State is authoritative; the log
 *     is best-effort.
 *  4. On success the row is `sent`. On a failure that is worth retrying it is
 *     `failed` with a backoff (`backoff.ts`); on a permanent failure, or when
 *     `max_attempts` is reached, it is `exhausted` and the owner is alerted.
 *
 * The retry schedule is a set of minimum delays: something has to run a sweep
 * for a due row to be picked up. See `docs/phases/PHASE-19-README.md` for how
 * that works on the Hobby plan.
 */

/**
 * What `lib/recommendation-privacy.ts` writes over a finished recommender
 * message's address and text. A row carrying it can never be sent or retried.
 */
export const REDACTED_MARKER = '[removed]'

export type ProcessOutboxOptions = {
  /** Restrict to specific rows. Omit to sweep everything due. */
  ids?: string[]
  /** Most rows this call will attempt. Default 20. */
  limit?: number
  /** Rows claimed per round trip. Default 5 — small, so a deadline never strands claimed rows. */
  chunkSize?: number
  /** Per-send timeout. Default `DEFAULT_SEND_TIMEOUT_MS`. */
  sendTimeoutMs?: number
  /** Stop claiming new rows once this many ms have passed since the call began. */
  deadlineMs?: number
  /** `false` disables raising an alert for rows that exhaust in this call (used for the alert message itself). */
  alerts?: boolean
  /** Seams for tests. */
  provider?: EmailProvider
  audit?: (entry: AuditEntry) => Promise<void>
  now?: () => Date
}

export type ProcessOutboxResult = { attempted: number; sent: number; failed: number; exhausted: number }

const EMPTY_RESULT: ProcessOutboxResult = { attempted: 0, sent: 0, failed: 0, exhausted: 0 }

/** Lease length. A send is capped by `sendTimeoutMs`, so two minutes is generous. */
const LEASE_SECONDS = 120

async function claim(
  supabase: SupabaseClient,
  ids: string[] | undefined,
  limit: number,
): Promise<NotificationOutboxRow[] | null> {
  const { data, error } = await supabase.rpc('claim_notification_outbox', {
    p_ids: ids && ids.length > 0 ? ids : null,
    p_limit: limit,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (error) {
    console.error('claim_notification_outbox failed (is migration 0017 applied?):', error)
    return null
  }
  return (data ?? []) as NotificationOutboxRow[]
}

/** Attempts to send every due row (or the given `ids`). Never throws — every row's own outcome is recorded on that row. */
export async function processOutboxBatch(
  supabase: SupabaseClient,
  options: ProcessOutboxOptions = {},
): Promise<ProcessOutboxResult> {
  const limit = options.limit ?? 20
  const chunkSize = Math.max(1, options.chunkSize ?? 5)
  const startedAt = Date.now()
  const total: ProcessOutboxResult = { ...EMPTY_RESULT }

  try {
    const provider = options.provider ?? getEmailProvider()

    while (total.attempted < limit) {
      if (options.deadlineMs !== undefined && Date.now() - startedAt >= options.deadlineMs) break

      const claimed = await claim(supabase, options.ids, Math.min(chunkSize, limit - total.attempted))
      if (!claimed || claimed.length === 0) break

      // Rows in one chunk are independent; sending them together keeps a
      // visitor's form submission from waiting for two sends in sequence.
      const outcomes = await Promise.all(claimed.map((row) => attemptOne(supabase, row, provider, options)))
      for (const outcome of outcomes) {
        total.attempted += 1
        if (outcome === 'sent') total.sent += 1
        else if (outcome === 'failed') total.failed += 1
        else if (outcome === 'exhausted') {
          total.failed += 1
          total.exhausted += 1
        }
        // 'lost-lease': someone else owns the row now; counted as attempted only.
      }
    }
  } catch (err) {
    // Belt and braces: nothing above is meant to throw, but a caller in the
    // middle of saving an inquiry must never see an exception from here.
    console.error('processOutboxBatch failed unexpectedly:', err)
  }

  return total
}

type AttemptOutcome = 'sent' | 'failed' | 'exhausted' | 'lost-lease'

async function attemptOne(
  supabase: SupabaseClient,
  row: NotificationOutboxRow,
  provider: EmailProvider,
  options: ProcessOutboxOptions,
): Promise<AttemptOutcome> {
  const attemptNo = row.attempts + 1
  const started = Date.now()

  let result: Awaited<ReturnType<EmailProvider['send']>>
  try {
    result = await provider.send(
      {
        to: row.recipient_email,
        subject: row.subject,
        text: row.body_text,
        replyTo: row.reply_to ?? undefined,
        idempotencyKey: `outbox-${row.id}`,
      },
      { timeoutMs: options.sendTimeoutMs ?? DEFAULT_SEND_TIMEOUT_MS },
    )
  } catch (err) {
    // A provider is supposed to return, not throw. If one throws it is a bug
    // in that provider, and the message is still worth another attempt.
    result = { ok: false, error: err instanceof Error ? err.message : String(err), retryable: true }
  }

  const durationMs = Date.now() - started
  const now = options.now ? options.now() : new Date()
  const attemptedAt = now.toISOString()

  // The update only applies while this worker still holds the lease it
  // claimed the row with.
  const guarded = (patch: Record<string, unknown>) =>
    supabase
      .from('notification_outbox')
      .update(patch)
      .eq('id', row.id)
      .eq('status', 'sending')
      .eq('locked_until', row.locked_until)
      .select('id')

  if (result.ok) {
    const { data, error } = await guarded({
      status: 'sent',
      attempts: attemptNo,
      sent_at: attemptedAt,
      last_attempt_at: attemptedAt,
      last_provider: provider.id,
      last_error: null,
      locked_until: null,
    })
    if (error || !data || data.length === 0) {
      console.error(`notification_outbox row ${row.id}: sent, but the row could not be marked sent`, error)
      return 'lost-lease'
    }
    await recordAttempt(supabase, row.id, attemptNo, attemptedAt, provider.id, {
      ok: true,
      providerMessageId: result.providerMessageId ?? null,
      durationMs,
    })
    return 'sent'
  }

  const outcome = failureOutcome({ attempt: attemptNo, maxAttempts: row.max_attempts, retryable: result.retryable })
  const exhausted = outcome === 'exhausted'
  const lastError = result.error.slice(0, 2000)

  const { data, error } = await guarded({
    status: exhausted ? 'exhausted' : 'failed',
    attempts: attemptNo,
    last_attempt_at: attemptedAt,
    last_provider: provider.id,
    last_error: lastError,
    locked_until: null,
    ...(exhausted ? {} : { next_attempt_at: nextAttemptAt(attemptNo, now) }),
  })
  if (error || !data || data.length === 0) {
    console.error(`notification_outbox row ${row.id}: attempt failed and the row could not be updated`, error)
    return 'lost-lease'
  }

  await recordAttempt(supabase, row.id, attemptNo, attemptedAt, provider.id, {
    ok: false,
    retryable: result.retryable,
    error: lastError,
    durationMs,
  })

  if (exhausted) {
    await raiseExhaustedAlert(supabase, row, attemptNo, lastError, !result.retryable, options)
    return 'exhausted'
  }
  return 'failed'
}

async function recordAttempt(
  supabase: SupabaseClient,
  outboxId: string,
  attemptNo: number,
  at: string,
  provider: string,
  detail:
    | { ok: true; providerMessageId: string | null; durationMs: number }
    | { ok: false; retryable: boolean; error: string; durationMs: number },
): Promise<void> {
  const { error } = await supabase.from('notification_attempts').insert({
    outbox_id: outboxId,
    attempt_no: attemptNo,
    at,
    provider,
    ok: detail.ok,
    retryable: detail.ok ? null : detail.retryable,
    error: detail.ok ? null : detail.error,
    provider_message_id: detail.ok ? detail.providerMessageId : null,
    duration_ms: detail.durationMs,
  })
  // Best-effort by design: the outbox row already carries the authoritative
  // state, and a missed log line must never turn a delivered message into a
  // failed one.
  if (error) console.error(`notification_attempts insert failed for ${outboxId} #${attemptNo}:`, error)
}

/**
 * "Alert when a message keeps failing." Runs once per exhaustion:
 *  - logs to the server console (Vercel function logs),
 *  - writes an `audit_log` row,
 *  - enqueues a `system-alert` to the owner and tries to send it straight away.
 *
 * The alert is itself a notification, so it can fail too — and it must never
 * raise an alert of its own (that would be a loop). A `system-alert` that
 * exhausts is only logged and audited; it is also the row the admin
 * notifications page and dashboard banner surface, which do not depend on
 * e-mail at all.
 */
async function raiseExhaustedAlert(
  supabase: SupabaseClient,
  row: NotificationOutboxRow,
  attempts: number,
  lastError: string,
  permanent: boolean,
  options: ProcessOutboxOptions,
): Promise<void> {
  console.error(
    `notification_outbox row ${row.id} (${row.kind}) exhausted after ${attempts} attempt(s)${permanent ? ' — permanent failure' : ''}:`,
    lastError,
  )

  const audit = options.audit ?? writeAuditLog
  await audit({
    actor: 'system:notifications',
    action: 'notification.exhausted',
    entity: 'notification',
    entityId: row.id,
    after: { kind: row.kind, attempts, permanent, error: lastError.slice(0, 300) },
  })

  if (row.kind === 'system-alert' || options.alerts === false) return

  const alertRows = await enqueueSystemAlert(supabase, {
    failedOutboxId: row.id,
    failedKind: row.kind,
    attempts,
    permanent,
    lastError,
  })
  if (alertRows.length === 0) return

  await processOutboxBatch(supabase, {
    ids: alertRows.map((alert) => alert.id),
    alerts: false,
    sendTimeoutMs: options.sendTimeoutMs,
    provider: options.provider,
    audit: options.audit,
    now: options.now,
  })
}

/**
 * What every caller that has just enqueued something wants: send it now, and
 * while we are here give any older due message another chance.
 *
 * The second step is what makes "retries with backoff" real between cron runs.
 * Vercel's Hobby plan runs the scheduled sweep once a day, so without it a
 * message that failed once would wait up to a day. Traffic on the site (an
 * inquiry, a recommendation) drives the retries instead, bounded so a visitor's
 * form never waits long: a 4 s send timeout and a 6 s overall budget.
 */
export async function processAfterEnqueue(supabase: SupabaseClient, ids: string[]): Promise<void> {
  try {
    if (ids.length > 0) {
      await processOutboxBatch(supabase, { ids, sendTimeoutMs: 4_000, deadlineMs: 6_000 })
    }
    await processOutboxBatch(supabase, { limit: 3, sendTimeoutMs: 4_000, deadlineMs: 3_000 })
  } catch (err) {
    console.error('notification send attempt failed (the event itself was saved):', err)
  }
}

export type RequeueResult = 'requeued' | 'not-found' | 'not-retryable' | 'error'

/**
 * The owner's "Retry". Only `failed` and `exhausted` messages can be requeued;
 * a `sent` message is never sent twice on purpose, and a `sending` one is in
 * flight. `attempts` is left alone — the delivery log stays a true history —
 * and the ceiling is raised so the message really gets more tries.
 */
export async function requeueNotification(
  supabase: SupabaseClient,
  id: string,
  now: Date = new Date(),
): Promise<RequeueResult> {
  const { data: row, error } = await supabase
    .from('notification_outbox')
    .select('id, status, attempts, max_attempts, recipient_email')
    .eq('id', id)
    .maybeSingle()
  if (error) return 'error'
  if (!row) return 'not-found'
  if (row.status !== 'failed' && row.status !== 'exhausted') return 'not-retryable'
  // Its address and text were redacted when the recommendation request
  // finished — there is nothing left to send.
  if (row.recipient_email === REDACTED_MARKER) return 'not-retryable'

  const { data: updated, error: updateError } = await supabase
    .from('notification_outbox')
    .update({
      status: 'pending',
      next_attempt_at: now.toISOString(),
      max_attempts: maxAttemptsAfterManualRetry(row.attempts as number, row.max_attempts as number),
      locked_until: null,
    })
    .eq('id', id)
    .in('status', ['failed', 'exhausted'])
    .select('id')
  if (updateError) return 'error'
  return updated && updated.length > 0 ? 'requeued' : 'not-retryable'
}
