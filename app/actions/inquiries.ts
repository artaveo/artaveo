'use server'

import { headers } from 'next/headers'
import crypto from 'node:crypto'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { validateAllSteps } from '@/lib/inquiry-validation'
import { enqueueInquiryNotifications, processOutboxBatch } from '@/lib/notifications/outbox'
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

function hashIp(ip: string): string {
  // Never store the raw IP (§ 9.2: "without extra personal data"). The
  // secret just stops someone from brute-forcing which hash corresponds
  // to a known IP; it is not meant to be a strong cryptographic key.
  const secret = process.env.INQUIRY_IP_HASH_SECRET ?? 'artaveo-dev-only-unset-secret'
  return crypto.createHash('sha256').update(`${ip}:${secret}`).digest('hex')
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  return h.get('x-real-ip') ?? '0.0.0.0'
}

export async function submitInquiry(
  draft: InquiryDraft,
  meta: InquirySubmissionMeta,
): Promise<InquirySubmissionResult> {
  // 1. Server re-validates everything (§ 9.2) — the client already ran
  //    the same check, but nothing here trusts that alone.
  if (!validateAllSteps(draft)) {
    return { ok: false, code: 'invalid' }
  }

  // 2. Anti-spam: honeypot + minimum fill time (§ 9.2: "honeypot + …
  //    optional privacy-friendly challenge"). Both collapse to the same
  //    generic 'rejected' code — never signal which check tripped.
  if (meta.honeypot.trim().length > 0) {
    return { ok: false, code: 'rejected' }
  }
  if (Date.now() - meta.formRenderedAt < MIN_FORM_FILL_MS) {
    return { ok: false, code: 'rejected' }
  }

  // 3. D-10 gate: no live Supabase project/env configured yet. Honest
  //    "not configured" rather than a crash or a fabricated success.
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return { ok: false, code: 'not-configured' }
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
        return { ok: true, id: raced.id as string, replay: true }
      }
    }
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
  })
  if (eventError) {
    console.error('inquiry_events insert failed (inquiry itself was saved):', eventError)
  }

  // 8. § 9.3 — Notifications: outbox pattern. Enqueue first (persisted
  //    regardless of whether sending works), then make one best-effort
  //    inline attempt so the common case sends immediately. Both steps
  //    are best-effort: a failure here must never undo or mask the
  //    successful inquiry insert above. The daily cron sweep
  //    (app/api/cron/notifications) retries anything left pending/failed.
  const outboxRows = await enqueueInquiryNotifications(supabase, inserted.id, draft)
  if (outboxRows.length) {
    try {
      await processOutboxBatch(supabase, { ids: outboxRows.map((row) => row.id) })
    } catch (notifyError) {
      console.error('notification send attempt failed (inquiry itself was saved):', notifyError)
    }
  }

  return { ok: true, id: inserted.id as string }
}
