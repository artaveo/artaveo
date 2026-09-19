import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Locale } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import type { NotificationKind } from '@/types/notifications'
import { DEFAULT_MAX_ATTEMPTS } from '@/lib/notifications/backoff'
import {
  buildClientConfirmationEmail,
  buildContentPublishedEmail,
  buildEvidenceSubmittedEmail,
  buildOwnerAlertEmail,
  buildRecommendationChangesEmail,
  buildRecommendationRequestEmail,
  buildSystemAlertEmail,
  type PublishedEntity,
} from '@/lib/notifications/templates'
import { siteConfig } from '@/lib/site'
import { absoluteUrl } from '@/lib/site-url'
import { getAllServices, getEngagementModels } from '@/lib/services-content'

/**
 * Phase 19 — the events that produce notifications.
 *
 * One function per event. Each renders its own message (subject and body are
 * stored in the outbox exactly as they will be sent), picks a `dedupeKey`, and
 * hands the rows to `enqueueNotifications`. Nothing here sends anything —
 * `lib/notifications/outbox.ts` does that, so an outage can never lose the
 * fact that an event happened.
 *
 * Every function is best-effort in the same sense § 9.3 established: it never
 * throws into the caller's own write path. A failed enqueue is logged and
 * returns `[]`; the thing that triggered it (an inquiry, a recommendation, a
 * published article) is already saved.
 *
 * The consultation events the roadmap lists (request / confirmation) belong to
 * Phase 20, which owns the data they are about; adding them is one entry in
 * `NOTIFICATION_KINDS`, one template, one migration widening the check
 * constraint, and one function here.
 */

export type EnqueueSpec = {
  kind: NotificationKind
  recipientEmail: string
  locale: Locale
  subject: string
  bodyText: string
  replyTo?: string | null
  /** Enqueueing the same key twice inserts one row. */
  dedupeKey: string
  entityType: string
  entityId: string
  inquiryId?: string | null
}

const EMAIL_SHAPE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/

/** A `reply_to` the provider would reject would fail the whole message — so an unusable one is dropped, not sent. */
export function usableReplyTo(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return EMAIL_SHAPE.test(trimmed) ? trimmed : null
}

/**
 * Inserts the rows, skipping any whose `dedupe_key` already exists
 * (`ON CONFLICT (dedupe_key) DO NOTHING`), and returns only the rows that
 * were actually created — a duplicate event yields `[]`, which is correct:
 * there is nothing new to send.
 */
export async function enqueueNotifications(
  supabase: SupabaseClient,
  specs: EnqueueSpec[],
): Promise<{ id: string; kind: NotificationKind }[]> {
  if (specs.length === 0) return []

  const { data, error } = await supabase
    .from('notification_outbox')
    .upsert(
      specs.map((spec) => ({
        kind: spec.kind,
        recipient_email: spec.recipientEmail.trim().toLowerCase(),
        reply_to: usableReplyTo(spec.replyTo),
        locale: spec.locale,
        subject: spec.subject,
        body_text: spec.bodyText,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        dedupe_key: spec.dedupeKey,
        entity_type: spec.entityType,
        entity_id: spec.entityId,
        inquiry_id: spec.inquiryId ?? null,
      })),
      { onConflict: 'dedupe_key', ignoreDuplicates: true },
    )
    .select('id, kind')

  if (error || !data) {
    console.error('notification_outbox insert failed (the event itself was saved):', error)
    return []
  }
  return data as { id: string; kind: NotificationKind }[]
}

function adminNotificationUrl(id: string): string {
  return absoluteUrl(`/en/admin/notifications/${id}`)
}

/** § 9.3 — the owner alert and the client's confirmation for one inquiry. */
export async function enqueueInquiryNotifications(
  supabase: SupabaseClient,
  inquiryId: string,
  draft: InquiryDraft,
): Promise<{ id: string; kind: NotificationKind }[]> {
  // Phase 12.2 (roadmap § 12): services/engagement models are Supabase-backed
  // — fetched here rather than threaded as parameters, since this function is
  // already server-only and async.
  const [services, engagementModels] = await Promise.all([getAllServices(), getEngagementModels()])
  const clientEmail = draft.email.trim().toLowerCase()
  const owner = buildOwnerAlertEmail(
    draft,
    inquiryId,
    services,
    engagementModels,
    absoluteUrl(`/en/admin/leads/${inquiryId}`),
  )
  const client = buildClientConfirmationEmail(draft, draft.preferredLocale, services, engagementModels)

  return enqueueNotifications(supabase, [
    {
      kind: 'owner-alert',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: owner.subject,
      bodyText: owner.text,
      // The owner presses Reply and is talking to the client.
      replyTo: clientEmail,
      dedupeKey: `inquiry:${inquiryId}:owner-alert`,
      entityType: 'inquiry',
      entityId: inquiryId,
      inquiryId,
    },
    {
      kind: 'client-confirmation',
      recipientEmail: clientEmail,
      locale: draft.preferredLocale,
      subject: client.subject,
      bodyText: client.text,
      // The confirmation says "just reply to this email" — make that true.
      replyTo: siteConfig.email,
      dedupeKey: `inquiry:${inquiryId}:client-confirmation`,
      entityType: 'inquiry',
      entityId: inquiryId,
      inquiryId,
    },
  ])
}

/** § 16 — a recommender submitted (or re-submitted) a statement. Owner-only; nothing is public until moderation. */
export async function enqueueEvidenceSubmitted(
  supabase: SupabaseClient,
  input: {
    recommendationId: string
    personName: string
    relationship: string
    company: string | null
    submittedLocale: Locale
    resubmission: boolean
    /** Identifies this submission — a resubmission gets its own notification. */
    submittedAt: string
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildEvidenceSubmittedEmail({
    personName: input.personName,
    relationship: input.relationship,
    company: input.company,
    submittedLocale: input.submittedLocale,
    resubmission: input.resubmission,
    reviewUrl: absoluteUrl('/en/admin/content/recommendations'),
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'evidence-submitted',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: email.subject,
      bodyText: email.text,
      dedupeKey: `evidence:${input.recommendationId}:${input.submittedAt}`,
      entityType: 'recommendation',
      entityId: input.recommendationId,
    },
  ])
}

const PUBLIC_PATH: Record<PublishedEntity, string> = {
  article: '/en/insights',
  project: '/en/work',
  service: '/en/services',
}

/**
 * Something went live. `scheduled` is Phase 17's daily-run publish, seen from
 * the owner's side (nobody was watching); `manual` is somebody pressing
 * Publish in the admin — the owner asked for that notice too (19 Sep 2026).
 * The moment is part of the dedupe key, so a piece that is unpublished and
 * published again later is a new publish and gets a new notice, while the
 * same publish can never queue two.
 */
export async function enqueueContentPublished(
  supabase: SupabaseClient,
  input: {
    entity: PublishedEntity
    id: string
    slug: string
    titleEn: string
    how: { via: 'scheduled'; scheduledFor: string } | { via: 'manual'; by: string; at: string }
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildContentPublishedEmail({
    entity: input.entity,
    title: input.titleEn || input.slug,
    url: absoluteUrl(`${PUBLIC_PATH[input.entity]}/${input.slug}`),
    how: input.how.via === 'scheduled' ? input.how : { via: 'manual', by: input.how.by },
  })
  const moment = input.how.via === 'scheduled' ? input.how.scheduledFor : input.how.at

  return enqueueNotifications(supabase, [
    {
      kind: 'content-published',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: email.subject,
      bodyText: email.text,
      dedupeKey: `content-published:${input.entity}:${input.id}:${input.how.via}:${moment}`,
      entityType: input.entity,
      entityId: input.id,
    },
  ])
}

/**
 * D-14 — the owner gives a request an e-mail address; this sends the link.
 * The message is stored with the recommender's address (that is the point), so
 * `lib/recommendation-privacy.ts` redacts it once the request is finished.
 */
export async function enqueueRecommendationRequest(
  supabase: SupabaseClient,
  input: { requestId: string; token: string; recipientEmail: string; locale: Locale; expiresAt: string | null },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildRecommendationRequestEmail({
    locale: input.locale,
    url: absoluteUrl(`/${input.locale}/recommend/${input.token}`),
    expiresAt: input.expiresAt,
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'recommendation-request',
      recipientEmail: input.recipientEmail,
      locale: input.locale,
      subject: email.subject,
      bodyText: email.text,
      // The recommender may reply to reach the owner directly, as the text says.
      replyTo: siteConfig.email,
      dedupeKey: `recommendation-request:${input.requestId}`,
      entityType: 'recommendation_request',
      entityId: input.requestId,
    },
  ])
}

/** D-14 — the owner asked for a change while moderating; `moderatedAt` makes each ask its own message. */
export async function enqueueRecommendationChanges(
  supabase: SupabaseClient,
  input: {
    requestId: string
    token: string
    recipientEmail: string
    locale: Locale
    note: string
    moderatedAt: string
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildRecommendationChangesEmail({
    locale: input.locale,
    url: absoluteUrl(`/${input.locale}/recommend/${input.token}`),
    note: input.note,
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'recommendation-changes',
      recipientEmail: input.recipientEmail,
      locale: input.locale,
      subject: email.subject,
      bodyText: email.text,
      replyTo: siteConfig.email,
      dedupeKey: `recommendation-changes:${input.requestId}:${input.moderatedAt}`,
      entityType: 'recommendation_request',
      entityId: input.requestId,
    },
  ])
}

/**
 * "A message keeps failing" — raised by `outbox.ts` when a row is exhausted.
 * The attempt count is part of the key so that a message the owner retried
 * and that failed again raises a fresh alert, while the same exhaustion can
 * never raise two.
 */
export async function enqueueSystemAlert(
  supabase: SupabaseClient,
  input: {
    failedOutboxId: string
    failedKind: NotificationKind
    attempts: number
    permanent: boolean
    lastError: string
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildSystemAlertEmail({
    failedKind: input.failedKind,
    attempts: input.attempts,
    permanent: input.permanent,
    lastError: input.lastError,
    adminUrl: adminNotificationUrl(input.failedOutboxId),
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'system-alert',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: email.subject,
      bodyText: email.text,
      dedupeKey: `system-alert:${input.failedOutboxId}:${input.attempts}`,
      entityType: 'notification',
      entityId: input.failedOutboxId,
    },
  ])
}
