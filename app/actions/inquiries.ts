'use server'

import { MAX_ATTACHMENTS_PER_INQUIRY } from '@/lib/media-upload'
import { bindRequestId, getRequestId } from '@/lib/observability/context'
import { log } from '@/lib/observability/logger'
import { captureError, track } from '@/lib/observability/store'
import { getClientIp, hashIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { validateAllSteps } from '@/lib/inquiry-validation'
import { enqueueInquiryNotifications } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import type { InquiryDraft, InquirySubmissionMeta, InquirySubmissionResult } from '@/types/inquiry'

/**
 * § 9.2 — Server handling & persistence.
 *
 * One schema shared by client and server: `validateAllSteps` /
 * `validateStep` (`lib/inquiry-validation.ts`) already have no browser
 * dependency, so this reuses them directly rather than duplicating rules
 * in a second schema library — the same "don't add a dependency a single
 * form doesn't need" reasoning § 9.1 used for not adopting zod.
 */

/** A real visitor cannot fill and review a multi-step form this fast. */
const MIN_FORM_FILL_MS = 3000

/** Deliberately generous — this guards against abuse, not normal reuse (a client resubmitting after fixing a typo, etc). */
const MAX_PER_IP_PER_HOUR = 5
const MAX_PER_EMAIL_PER_DAY = 3

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * § 9.3 / Phase 19 — enqueue the owner alert + client confirmation, then make
 * one bounded inline send attempt. Idempotent: the outbox rows carry a
 * per-inquiry dedupe key, so calling this again for an inquiry that already
 * has them inserts nothing. That is what makes the replay paths below safe —
 * a visitor whose first attempt saved the inquiry but failed to enqueue (or
 * whose response was lost) and who submits again gets the notifications they
 * were owed the first time, never a second pair.
 *
 * Best-effort in full: a failure here must never undo or mask the successful
 * inquiry insert, and the success the visitor sees reflects the inquiry's
 * persistence only, never e-mail delivery.
 */
async function notifyForInquiry(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  inquiryId: string,
  draft: InquiryDraft,
): Promise<void> {
  try {
    const rows = await enqueueInquiryNotifications(supabase, inquiryId, draft)
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
  } catch (err) {
    await captureError(err, { event: 'inquiry.notifications_failed', source: 'notification', fields: { inquiryId, consequence: 'the inquiry itself was saved' }, supabase })
  }
}

export async function submitInquiry(
  draft: InquiryDraft,
  meta: InquirySubmissionMeta,
): Promise<InquirySubmissionResult> {
  // Phase 24: from here on every log line, error record and database call of this request
  // carries its correlation id (lib/observability/context.ts).
  const requestId = await getRequestId()
  bindRequestId(requestId)

  // 0. Phase 23: every argument of a Server Action is untrusted, whatever its type says.
  if (!meta || typeof meta.idempotencyKey !== 'string' || meta.idempotencyKey.length < 8 || meta.idempotencyKey.length > 100 || typeof meta.honeypot !== 'string') {
    log.info('inquiry.rejected', { reason: 'malformed-meta' })
    return { ok: false, code: 'invalid' }
  }

  // 1. Server re-validates everything (§ 9.2) — the client already ran
  //    the same check, but nothing here trusts that alone.
  if (!validateAllSteps(draft)) {
    log.info('inquiry.rejected', { reason: 'invalid' })
    return { ok: false, code: 'invalid' }
  }

  // 2. Anti-spam: honeypot + minimum fill time (§ 9.2: "honeypot + …
  //    optional privacy-friendly challenge"). Both collapse to the same
  //    generic 'rejected' code — never signal which check tripped.
  if (meta.honeypot.trim().length > 0) {
    log.info('inquiry.rejected', { reason: 'honeypot' })
    return { ok: false, code: 'rejected' }
  }
  if (Date.now() - meta.formRenderedAt < MIN_FORM_FILL_MS) {
    log.info('inquiry.rejected', { reason: 'too-fast' })
    return { ok: false, code: 'rejected' }
  }

  // 3. D-10 gate: no live Supabase project/env configured yet. Honest
  //    "not configured" rather than a crash or a fabricated success.
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    log.error('inquiry.not_configured', { consequence: 'a visitor tried to send a brief and nothing was saved' })
    return { ok: false, code: 'not-configured' }
  }

  // Phase 23: the attempt limit comes before any query — a flood is turned away for the
  // price of one function call, not a lookup and a count. Same generic code as the
  // other refusals; the caller is never told which check tripped.
  const attempts = await checkRateLimit('inquiry.submit')
  if (!attempts.ok) {
    log.info('inquiry.rejected', { reason: 'rate-limited', dimension: attempts.dimension })
    return { ok: false, code: 'rejected' }
  }

  const ip = await getClientIp()
  const ipHash = hashIp(ip)
  const email = draft.email.trim().toLowerCase()

  // 4. Idempotency replay (§ 9.2: "prevent duplicates on double click or
  //    retry"): if this exact submission already persisted, that is a
  //    success, not a new insert.
  const { data: existing } = await supabase
    .from('inquiries')
    .select('id')
    .eq('idempotency_key', meta.idempotencyKey)
    .maybeSingle()

  if (existing) {
    log.info('inquiry.replayed', { inquiryId: existing.id as string })
    await notifyForInquiry(supabase, existing.id as string, draft)
    return { ok: true, id: existing.id as string, replay: true }
  }

  // 5. Rate limiting, backed by the same table — no extra dependency or
  //    external service, consistent with § 9.1/§ 9.2's "don't add a
  //    dependency without a reason."
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [ipCountResult, emailCountResult] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('submitter_ip_hash', ipHash)
      .gte('created_at', oneHourAgo),
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneDayAgo),
  ])

  if ((ipCountResult.count ?? 0) >= MAX_PER_IP_PER_HOUR || (emailCountResult.count ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
    log.info('inquiry.rejected', { reason: 'per-visitor-limit' })
    return { ok: false, code: 'rejected' }
  }

  // 6. Insert. The unique constraint on idempotency_key is the real guard
  //    against a race between step 4's check and this insert.
  const { data: inserted, error } = await supabase
    .from('inquiries')
    .insert({
      idempotency_key: meta.idempotencyKey,
      service_slug: draft.serviceSlug ?? null,
      package_id: draft.packageId ?? null,
      engagement_model_id: draft.engagementModelId ?? null,
      project_type: draft.projectType ?? null,
      goal: draft.goal.trim(),
      feature_tags: draft.featureTags,
      feature_other_note: draft.featureOtherNote.trim(),
      timeline: draft.timeline ?? null,
      budget_band: draft.budgetBand ?? null,
      links: draft.links.filter((link) => link.url.trim()).map((link) => ({ url: link.url.trim() })),
      name: draft.name.trim(),
      email,
      phone: draft.phone.trim(),
      preferred_locale: draft.preferredLocale,
      preferred_channel: draft.preferredChannel,
      consent: draft.consent,
      source_referrer: meta.sourceReferrer ?? null,
      source_utm_source: meta.sourceUtmSource ?? null,
      source_utm_medium: meta.sourceUtmMedium ?? null,
      source_utm_campaign: meta.sourceUtmCampaign ?? null,
      source_channel: meta.sourceChannel ?? null,
      submitter_ip_hash: ipHash,
      request_id: requestId ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    // Unique-violation race: another request inserted this idempotency
    // key between step 4 and here — look it up instead of erroring.
    if (error?.code === '23505') {
      const { data: raced } = await supabase
        .from('inquiries')
        .select('id')
        .eq('idempotency_key', meta.idempotencyKey)
        .maybeSingle()
      if (raced) {
        log.info('inquiry.replayed', { inquiryId: raced.id as string, via: 'insert-race' })
        await notifyForInquiry(supabase, raced.id as string, draft)
        return { ok: true, id: raced.id as string, replay: true }
      }
    }
    // Until Phase 24 this path returned the same code and wrote nothing anywhere: the visitor
    // saw an error, the owner saw nothing, and no record said why. It is now a tracked error.
    await captureError(error ?? new Error('insert returned no row'), {
      event: 'inquiry.persist_failed',
      source: 'action',
      route: '/[locale]/start',
      fields: { consequence: 'the brief was NOT saved', service: draft.serviceSlug ?? null },
      supabase,
    })
    return { ok: false, code: 'error' }
  }

  // 7. inquiry_events: append-only audit trail — the minimal Phase 12
  //    slice § 9.2 owns. Best-effort: a failure here must never undo or
  //    mask the successful insert above (the inquiry is already safe).
  const { error: eventError } = await supabase.from('inquiry_events').insert({
    inquiry_id: inserted.id,
    type: 'created',
    actor: 'system',
    note: 'Inquiry received via Brief Builder.',
    request_id: requestId ?? null,
  })
  if (eventError) {
    await captureError(eventError, { event: 'inquiry.timeline_write_failed', source: 'database', level: 'warn', fields: { inquiryId: inserted.id as string, consequence: 'the inquiry itself was saved' }, supabase })
  }

  // 7b. § 15's Brief Builder attachments: link whatever was already uploaded
  //     (via `uploadInquiryAttachment`) before this submit. Phase 23: only
  //     files that are still UNLINKED can be linked — a file already attached
  //     to another brief is left alone — and the cap is enforced here, never
  //     left to the client. Best-effort: never undoes the inquiry insert above.
  const fileIds = [...new Set(draft.attachmentMediaIds)].filter((id) => UUID.test(id)).slice(0, MAX_ATTACHMENTS_PER_INQUIRY)
  if (fileIds.length > 0) {
    const { error: attachmentError } = await supabase
      .from('inquiry_files')
      .update({ inquiry_id: inserted.id })
      .in('id', fileIds)
      .is('inquiry_id', null)
    if (attachmentError) {
      await captureError(attachmentError, { event: 'inquiry.attachments_link_failed', source: 'database', level: 'warn', fields: { inquiryId: inserted.id as string, consequence: 'the inquiry itself was saved' }, supabase })
    }
  }

  // 8. § 9.3 / Phase 19 — Notifications: outbox pattern ("persist first,
  //    send after"). See `notifyForInquiry` above.
  await notifyForInquiry(supabase, inserted.id as string, draft)

  // The funnel's top line: counted on the Observability page. Ids and labels only — never the
  // visitor's name, address or text.
  await track('inquiry.submitted', {
    subject: { type: 'inquiry', id: inserted.id as string },
    data: { service: draft.serviceSlug ?? null, locale: draft.preferredLocale, channel: meta.sourceChannel ?? null, attachments: fileIds.length },
    supabase,
  })

  return { ok: true, id: inserted.id as string }
}
