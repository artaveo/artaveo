import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { writeAuditLog } from '@/lib/admin/audit'
import {
  CONSULTATION_DURATION_MINUTES,
  MAX_CANCEL_REASON_LENGTH,
  MAX_GOAL_LENGTH,
  MAX_MEETING_DETAILS_LENGTH,
  MAX_REQUESTS_PER_EMAIL_PER_DAY,
  MAX_REQUESTS_PER_IP_PER_HOUR,
  MAX_RESCHEDULE_REQUESTS,
  MIN_FORM_FILL_MS,
  MIN_GOAL_LENGTH,
} from '@/lib/consultation/config'
import { loadConsultationById, loadConsultationByToken } from '@/lib/consultation/queries'
import { generateConsultationToken } from '@/lib/consultation/token'
import { canMarkCompleted, canOwnerConfirm, canTransition, isTerminal, linkExpired, resolveWindows } from '@/lib/consultation/windows'
import {
  enqueueConsultationCancelled,
  enqueueConsultationClientUpdate,
  enqueueConsultationConfirmed,
  enqueueConsultationRequested,
  type ConsultationContext,
} from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import type {
  AdminActionResult,
  AdminConsultation,
  ClientActionResult,
  ConsultationRequestInput,
  ConsultationRequestMeta,
  ConsultationRequestResult,
  ConsultationWindow,
  WindowInput,
} from '@/types/consultation'
import type { Locale } from '@/types/content'

/**
 * Phase 20 — everything that changes a consultation, in one place.
 *
 * The public and admin Server Actions (`app/actions/consultations.ts`,
 * `app/actions/consultation-admin.ts`) do the caller-specific work — anti-spam,
 * the token, the admin session — and then call these. Each function takes the
 * Supabase client and the clock as arguments, so the same code can be run
 * against a real PostgreSQL + PostgREST in the phase's verification.
 *
 * Rules that hold throughout:
 *  - A state change is ONE conditional `update … where status = <what I read>`
 *    (and, where the calendar sequence matters, `and sequence = <what I read>`).
 *    If two people act at once, one update matches no row and gets `conflict`
 *    or `not-allowed` — never a silent overwrite. The database trigger
 *    (`0019`) is the second guard behind this.
 *  - The record of what happened (`inquiry_events`, `audit_log`) and the
 *    notifications are written AFTER the real state change and are
 *    best-effort — the same pattern as the Brief Builder: a failed e-mail can
 *    never undo or mask a saved change, and the outbox makes sure it is not
 *    lost (Phase 19).
 *  - A client's own actions (cancel, reschedule) are recorded with the actor
 *    `client`, an owner's with the admin's user id, so the lead's SLA — which
 *    counts the first action by someone other than the system or the client —
 *    measures the owner's response, not the client's own click.
 */

export type ServiceDeps = {
  supabase: SupabaseClient
  now?: () => Date
}

const clock = (deps: ServiceDeps) => (deps.now ? deps.now() : new Date())

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function contextOf(consultation: AdminConsultation): ConsultationContext {
  return {
    consultationId: consultation.id,
    inquiryId: consultation.inquiryId,
    token: consultation.token,
    locale: consultation.locale,
    timezone: consultation.timezone,
    clientName: consultation.inquiry.name,
    clientEmail: consultation.inquiry.email,
  }
}

const confirmedRangeOf = (consultation: AdminConsultation): ConsultationWindow | null =>
  consultation.confirmedStart && consultation.confirmedEnd
    ? { start: consultation.confirmedStart, end: consultation.confirmedEnd }
    : null

/** Send now, without ever throwing into the caller's own write path. */
async function deliver(
  supabase: SupabaseClient,
  label: string,
  enqueue: () => Promise<{ id: string }[]>,
): Promise<void> {
  try {
    const rows = await enqueue()
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
  } catch (err) {
    console.error(`${label} notification failed (the change itself was saved):`, err)
  }
}

async function recordEvent(
  supabase: SupabaseClient,
  inquiryId: string,
  type: string,
  actor: string,
  meta: Record<string, unknown>,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('inquiry_events')
    .insert({ inquiry_id: inquiryId, type, actor, meta, note: note ?? null })
  if (error) console.error(`inquiry_events insert failed (${type}; the change itself was saved):`, error)
}

const sanitizeText = (value: string, max: number) => value.replace(/\r\n?/g, '\n').trim().slice(0, max)

// ---------------------------------------------------------------------------
// The client's request
// ---------------------------------------------------------------------------

export type CreateRequestContext = {
  locale: Locale
  ipHash: string
}

/**
 * The inquiry that carries this request plus the consultation itself.
 * Idempotent on the form's key: a second submit with the same key returns the
 * same private link and queues nothing new.
 */
export async function createConsultationRequest(
  deps: ServiceDeps,
  input: ConsultationRequestInput,
  meta: ConsultationRequestMeta,
  ctx: CreateRequestContext,
): Promise<ConsultationRequestResult> {
  const { supabase } = deps
  const now = clock(deps)

  // Anti-spam: the same two checks, with the same single generic code, as the
  // Brief Builder — a caller must never learn which one tripped.
  if (meta.honeypot.trim().length > 0) return { ok: false, code: 'rejected' }
  if (now.getTime() - meta.formRenderedAt < MIN_FORM_FILL_MS) return { ok: false, code: 'rejected' }

  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const goal = sanitizeText(input.goal, MAX_GOAL_LENGTH)
  if (
    !name ||
    name.length > 200 ||
    !EMAIL_PATTERN.test(email) ||
    email.length > 320 ||
    phone.length > 60 ||
    goal.length < MIN_GOAL_LENGTH ||
    !input.consent ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meta.idempotencyKey)
  ) {
    return { ok: false, code: 'invalid' }
  }

  const resolved = resolveWindows(input.timezone, input.windows, now)
  if (!resolved.ok) return { ok: false, code: resolved.code }

  // 1. Replay: this exact submission already persisted.
  const existingInquiry = await findInquiryByKey(supabase, meta.idempotencyKey)
  if (existingInquiry) {
    const consultation = await latestConsultationOfInquiry(supabase, existingInquiry)
    if (consultation) {
      await notifyRequest(supabase, consultation)
      return { ok: true, token: consultation.token, replay: true }
    }
    // The inquiry was saved but the consultation was not (a crash between the
    // two inserts): finish the job for the same inquiry.
    return insertConsultation(deps, existingInquiry, resolved, ctx)
  }

  // 2. Rate limits, backed by the same table (a request IS an inquiry).
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const [byIp, byEmail] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('submitter_ip_hash', ctx.ipHash)
      .gte('created_at', oneHourAgo),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', oneDayAgo),
  ])
  if ((byIp.count ?? 0) >= MAX_REQUESTS_PER_IP_PER_HOUR || (byEmail.count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_DAY) {
    return { ok: false, code: 'rejected' }
  }

  // 3. The inquiry. A consultation is always linked to one (§ 20).
  const { data: inserted, error } = await supabase
    .from('inquiries')
    .insert({
      idempotency_key: meta.idempotencyKey,
      goal,
      name,
      email,
      phone,
      preferred_locale: ctx.locale,
      preferred_channel: phone ? 'whatsapp' : 'email',
      consent: true,
      source_channel: 'consultation',
      source_referrer: meta.sourceReferrer ?? null,
      submitter_ip_hash: ctx.ipHash,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    if (error?.code === '23505') {
      // Another request with this key won the race between step 1 and here.
      // It may not have created the consultation yet — so, unlike the Brief
      // Builder (where the inquiry is all there is), this side finishes the job
      // too: the one-live-consultation-per-inquiry index makes whichever insert
      // comes second fall back to the first one's row, and both callers get the
      // same private link.
      const raced = await findInquiryByKey(supabase, meta.idempotencyKey)
      if (raced) {
        const consultation = await latestConsultationOfInquiry(supabase, raced)
        if (consultation) return { ok: true, token: consultation.token, replay: true }
        return insertConsultation(deps, raced, resolved, ctx)
      }
    }
    return { ok: false, code: 'error' }
  }

  const inquiryId = inserted.id as string
  const { error: eventError } = await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'created',
    actor: 'system',
    note: 'Inquiry created by a consultation request (/consultation).',
  })
  if (eventError) console.error('inquiry_events insert failed (the inquiry itself was saved):', eventError)

  return insertConsultation(deps, inquiryId, resolved, ctx)
}

async function findInquiryByKey(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await supabase.from('inquiries').select('id').eq('idempotency_key', key).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

async function latestConsultationOfInquiry(supabase: SupabaseClient, inquiryId: string): Promise<AdminConsultation | null> {
  const { data } = await supabase
    .from('consultations')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? loadConsultationById(supabase, data.id as string) : null
}

async function insertConsultation(
  deps: ServiceDeps,
  inquiryId: string,
  resolved: { timezone: string; windows: ConsultationWindow[] },
  ctx: CreateRequestContext,
): Promise<ConsultationRequestResult> {
  const { supabase } = deps
  const token = generateConsultationToken()

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      inquiry_id: inquiryId,
      requested_windows: resolved.windows,
      timezone: resolved.timezone,
      locale: ctx.locale,
      duration_minutes: CONSULTATION_DURATION_MINUTES,
      token,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      // One live consultation per inquiry: a concurrent replay created it first.
      const existing = await latestConsultationOfInquiry(supabase, inquiryId)
      if (existing) return { ok: true, token: existing.token, replay: true }
    }
    console.error('consultations insert failed:', error)
    return { ok: false, code: 'error' }
  }

  const consultation = await loadConsultationById(supabase, data.id as string)
  if (!consultation) return { ok: true, token }

  await recordEvent(supabase, inquiryId, 'consultation-requested', 'client', {
    consultationId: consultation.id,
    windows: resolved.windows.length,
    timezone: resolved.timezone,
  })
  await notifyRequest(supabase, consultation)
  return { ok: true, token }
}

async function notifyRequest(supabase: SupabaseClient, consultation: AdminConsultation): Promise<void> {
  await deliver(supabase, 'consultation request', () =>
    enqueueConsultationRequested(supabase, {
      ...contextOf(consultation),
      phone: consultation.inquiry.phone,
      goal: consultation.inquiry.goal,
      windows: consultation.windows,
    }),
  )
}

// ---------------------------------------------------------------------------
// The client's own changes, by private link
// ---------------------------------------------------------------------------

async function loadForClient(
  deps: ServiceDeps,
  token: string,
): Promise<{ ok: true; consultation: AdminConsultation } | { ok: false; code: 'not-found' | 'expired' }> {
  const consultation = await loadConsultationByToken(deps.supabase, token)
  if (!consultation) return { ok: false, code: 'not-found' }
  if (linkExpired(consultation, clock(deps))) return { ok: false, code: 'expired' }
  return { ok: true, consultation }
}

export async function cancelConsultationAsClient(
  deps: ServiceDeps,
  token: string,
  reason: string,
): Promise<ClientActionResult> {
  const { supabase } = deps
  const now = clock(deps)
  const loaded = await loadForClient(deps, token)
  if (!loaded.ok) return loaded
  const { consultation } = loaded

  if (isTerminal(consultation.status) || !canTransition(consultation.status, 'cancelled')) {
    return { ok: false, code: 'not-allowed' }
  }

  // A confirmed time — even one waiting to be moved — is in the client's
  // calendar, so it needs a calendar cancellation (which needs a sequence).
  const confirmedRange = confirmedRangeOf(consultation)
  const cleanReason = sanitizeText(reason, MAX_CANCEL_REASON_LENGTH) || null

  const { data, error } = await supabase
    .from('consultations')
    .update({
      status: 'cancelled',
      cancelled_by: 'client',
      cancel_reason: cleanReason,
      closed_at: now.toISOString(),
      sequence: confirmedRange ? consultation.sequence + 1 : consultation.sequence,
    })
    .eq('id', consultation.id)
    .eq('status', consultation.status)
    .eq('sequence', consultation.sequence)
    .select('id')
  if (error) return { ok: false, code: 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'not-allowed' }

  await recordEvent(
    supabase,
    consultation.inquiryId,
    'consultation-cancelled',
    'client',
    { consultationId: consultation.id, by: 'client', wasConfirmed: Boolean(confirmedRange) },
    cleanReason ?? undefined,
  )

  const ctx = contextOf(consultation)
  await deliver(supabase, 'consultation client cancel (owner)', () =>
    enqueueConsultationClientUpdate(supabase, ctx, { change: 'cancelled', reason: cleanReason, confirmedRange }),
  )
  await deliver(supabase, 'consultation client cancel (client)', () =>
    enqueueConsultationCancelled(supabase, ctx, {
      by: 'client',
      range: confirmedRange,
      reason: cleanReason,
      sequence: consultation.sequence,
      now,
    }),
  )
  return { ok: true }
}

/**
 * "These times don't work" — replaces the client's windows. From `requested` it
 * stays `requested`; from `confirmed` it becomes `rescheduled` (the confirmed
 * time still stands, in their calendar and on their page, until the owner
 * confirms a new one).
 */
export async function requestConsultationReschedule(
  deps: ServiceDeps,
  token: string,
  timezone: string,
  windows: WindowInput[],
): Promise<ClientActionResult> {
  const { supabase } = deps
  const now = clock(deps)
  const loaded = await loadForClient(deps, token)
  if (!loaded.ok) return loaded
  const { consultation } = loaded

  if (isTerminal(consultation.status)) return { ok: false, code: 'not-allowed' }
  if (consultation.rescheduleRequests >= MAX_RESCHEDULE_REQUESTS) return { ok: false, code: 'limit-reached' }

  const resolved = resolveWindows(timezone, windows, now)
  if (!resolved.ok) return { ok: false, code: resolved.code }

  const nextStatus = consultation.status === 'requested' ? 'requested' : 'rescheduled'
  const requestNumber = consultation.rescheduleRequests + 1

  const { data, error } = await supabase
    .from('consultations')
    .update({
      status: nextStatus,
      requested_windows: resolved.windows,
      timezone: resolved.timezone,
      reschedule_requests: requestNumber,
    })
    .eq('id', consultation.id)
    .eq('status', consultation.status)
    .eq('reschedule_requests', consultation.rescheduleRequests)
    .select('id')
  if (error) return { ok: false, code: 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'not-allowed' }

  await recordEvent(supabase, consultation.inquiryId, 'consultation-reschedule-requested', 'client', {
    consultationId: consultation.id,
    windows: resolved.windows.length,
    timezone: resolved.timezone,
    requestNumber,
  })

  await deliver(supabase, 'consultation reschedule request', () =>
    enqueueConsultationClientUpdate(
      supabase,
      { ...contextOf(consultation), timezone: resolved.timezone },
      {
        change: 'rescheduled',
        windows: resolved.windows,
        confirmedRange: confirmedRangeOf(consultation),
        requestNumber,
      },
    ),
  )
  return { ok: true }
}

// ---------------------------------------------------------------------------
// The owner's actions
// ---------------------------------------------------------------------------

/**
 * Confirm a time — or, on an already confirmed consultation, move it or change
 * how it happens. Sends the client a calendar invitation that updates their
 * existing entry (same UID, higher SEQUENCE).
 */
export async function confirmConsultation(
  deps: ServiceDeps,
  input: { consultationId: string; actor: string; start: Date; meetingDetails: string },
): Promise<AdminActionResult> {
  const { supabase } = deps
  const now = clock(deps)

  const consultation = await loadConsultationById(supabase, input.consultationId)
  if (!consultation) return { ok: false, code: 'not-found' }
  if (!canOwnerConfirm(consultation.status)) return { ok: false, code: 'invalid-transition' }

  const details = sanitizeText(input.meetingDetails, MAX_MEETING_DETAILS_LENGTH)
  if (!details || Number.isNaN(input.start.getTime())) return { ok: false, code: 'invalid' }
  if (input.start.getTime() <= now.getTime()) return { ok: false, code: 'in-the-past' }

  const end = new Date(input.start.getTime() + consultation.durationMinutes * 60_000)
  const range: ConsultationWindow = { start: input.start.toISOString(), end: end.toISOString() }
  const previous = confirmedRangeOf(consultation)

  const { data, error } = await supabase
    .from('consultations')
    .update({
      status: 'confirmed',
      confirmed_start: range.start,
      confirmed_end: range.end,
      confirmed_at: now.toISOString(),
      meeting_details: details,
      sequence: consultation.sequence + 1,
    })
    .eq('id', consultation.id)
    .eq('status', consultation.status)
    .eq('sequence', consultation.sequence)
    .select('id')
  if (error) {
    // 23514 — the database trigger refused the transition (a race with the client).
    return { ok: false, code: error.code === '23514' ? 'invalid-transition' : 'error' }
  }
  if (!data || data.length === 0) return { ok: false, code: 'conflict' }

  await recordEvent(supabase, consultation.inquiryId, 'consultation-confirmed', input.actor, {
    consultationId: consultation.id,
    start: range.start,
    moved: previous !== null && previous.start !== range.start,
  })
  await writeAuditLog({
    actor: input.actor,
    action: 'consultation.confirmed',
    entity: 'consultation',
    entityId: consultation.id,
    before: { status: consultation.status, start: previous?.start ?? null },
    after: { status: 'confirmed', start: range.start },
  })

  await deliver(supabase, 'consultation confirmation', () =>
    enqueueConsultationConfirmed(supabase, contextOf(consultation), {
      range,
      meetingDetails: details,
      // The sequence this invitation carries is the one that was current when
      // the row was read; the row now holds the next one.
      sequence: consultation.sequence,
      previous: previous && previous.start !== range.start ? previous : null,
      now,
    }),
  )
  return { ok: true }
}

export async function cancelConsultationAsOwner(
  deps: ServiceDeps,
  input: { consultationId: string; actor: string; reason: string },
): Promise<AdminActionResult> {
  const { supabase } = deps
  const now = clock(deps)

  const consultation = await loadConsultationById(supabase, input.consultationId)
  if (!consultation) return { ok: false, code: 'not-found' }
  if (!canTransition(consultation.status, 'cancelled')) return { ok: false, code: 'invalid-transition' }

  const confirmedRange = confirmedRangeOf(consultation)
  const reason = sanitizeText(input.reason, MAX_CANCEL_REASON_LENGTH) || null

  const { data, error } = await supabase
    .from('consultations')
    .update({
      status: 'cancelled',
      cancelled_by: 'owner',
      cancel_reason: reason,
      closed_at: now.toISOString(),
      sequence: confirmedRange ? consultation.sequence + 1 : consultation.sequence,
    })
    .eq('id', consultation.id)
    .eq('status', consultation.status)
    .eq('sequence', consultation.sequence)
    .select('id')
  if (error) return { ok: false, code: error.code === '23514' ? 'invalid-transition' : 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'conflict' }

  await recordEvent(
    supabase,
    consultation.inquiryId,
    'consultation-cancelled',
    input.actor,
    { consultationId: consultation.id, by: 'owner', wasConfirmed: Boolean(confirmedRange) },
    reason ?? undefined,
  )
  await writeAuditLog({
    actor: input.actor,
    action: 'consultation.cancelled',
    entity: 'consultation',
    entityId: consultation.id,
    before: { status: consultation.status },
    after: { status: 'cancelled', by: 'owner' },
  })

  await deliver(supabase, 'consultation cancellation', () =>
    enqueueConsultationCancelled(supabase, contextOf(consultation), {
      by: 'owner',
      range: confirmedRange,
      reason,
      sequence: consultation.sequence,
      now,
    }),
  )
  return { ok: true }
}

/** "It happened." Only a confirmed call whose time has come can be marked completed. */
export async function completeConsultation(
  deps: ServiceDeps,
  input: { consultationId: string; actor: string },
): Promise<AdminActionResult> {
  const { supabase } = deps
  const now = clock(deps)

  const consultation = await loadConsultationById(supabase, input.consultationId)
  if (!consultation) return { ok: false, code: 'not-found' }
  if (!canTransition(consultation.status, 'completed')) return { ok: false, code: 'invalid-transition' }
  if (!canMarkCompleted(consultation, now)) return { ok: false, code: 'not-finished' }

  const { data, error } = await supabase
    .from('consultations')
    .update({ status: 'completed', closed_at: now.toISOString() })
    .eq('id', consultation.id)
    .eq('status', 'confirmed')
    .select('id')
  if (error) return { ok: false, code: error.code === '23514' ? 'invalid-transition' : 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'conflict' }

  await recordEvent(supabase, consultation.inquiryId, 'consultation-completed', input.actor, {
    consultationId: consultation.id,
  })
  await writeAuditLog({
    actor: input.actor,
    action: 'consultation.completed',
    entity: 'consultation',
    entityId: consultation.id,
    before: { status: 'confirmed' },
    after: { status: 'completed' },
  })
  return { ok: true }
}
