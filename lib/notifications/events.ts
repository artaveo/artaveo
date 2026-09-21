import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Locale } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import type { EmailAttachment, NotificationKind } from '@/types/notifications'
import { buildConsultationIcs, consultationUid, icsAttachment } from '@/lib/consultation/ics'
import { DEFAULT_MAX_ATTEMPTS } from '@/lib/notifications/backoff'
import {
  buildConsultationCancelledEmail,
  buildConsultationClientUpdateEmail,
  buildConsultationConfirmedEmail,
  buildConsultationReceivedEmail,
  buildConsultationRequestedEmail,
  consultationSummary,
} from '@/lib/notifications/consultation-templates'
import {
  buildClientConfirmationEmail,
  buildContentPublishedEmail,
  buildEvidenceSubmittedEmail,
  buildOpsAlertEmail,
  buildOwnerAlertEmail,
  buildRecommendationChangesEmail,
  buildRecommendationRequestEmail,
  buildSystemAlertEmail,
  type PublishedEntity,
} from '@/lib/notifications/templates'
import { getRequestId } from '@/lib/observability/context'
import { captureError } from '@/lib/observability/store'
import type { Alert } from '@/lib/observability/alert-rules'
import { siteConfig } from '@/lib/site'
import { absoluteUrl } from '@/lib/site-url'
import { getAllServices, getEngagementModels } from '@/lib/services-content'
import type { ConsultationWindow } from '@/types/consultation'

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
 * The consultation events (Phase 20) live at the end of this file: the
 * request alert and the client's acknowledgement, the confirmation with its
 * calendar invitation, the cancellation with its calendar update, and the
 * owner's notice that the client changed something.
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
  /** Phase 20: the calendar invitation that goes with a confirmation or cancellation. */
  attachments?: EmailAttachment[]
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

  // Phase 24: the message remembers which request produced it, so an owner who finds an
  // odd e-mail can be taken back to that request's log lines (and the reverse).
  const requestId = await getRequestId()

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
        ...(requestId ? { request_id: requestId } : {}),
        // Only present when there is a file, so every older message keeps its exact stored shape.
        ...(spec.attachments && spec.attachments.length > 0 ? { attachments: spec.attachments } : {}),
      })),
      { onConflict: 'dedupe_key', ignoreDuplicates: true },
    )
    .select('id, kind')

  if (error || !data) {
    await captureError(error ?? new Error('no rows returned'), {
      event: 'notification.enqueue_failed',
      source: 'notification',
      level: 'error',
      fields: { kinds: specs.map((spec) => spec.kind), consequence: 'the event itself was saved' },
      supabase,
    })
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

/**
 * Phase 24 — an alert rule is firing (`lib/observability/alerts.ts`). The day is part
 * of the key, so one problem produces one e-mail per day however often the check
 * runs; if it is still firing tomorrow, tomorrow's e-mail says so again.
 */
export async function enqueueOpsAlert(
  supabase: SupabaseClient,
  input: { alert: Alert; day: string; text: { title: string; what: string; action: string } },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildOpsAlertEmail({
    title: input.text.title,
    what: input.text.what,
    action: input.text.action,
    count: input.alert.count,
    detail: input.alert.detail,
    adminUrl: absoluteUrl('/en/admin/observability'),
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'system-alert',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: email.subject,
      bodyText: email.text,
      dedupeKey: `ops-alert:${input.alert.id}:${input.day}`,
      entityType: 'ops-alert',
      entityId: input.alert.id,
    },
  ])
}

// ---------------------------------------------------------------------------
// Phase 20 — consultation events
// ---------------------------------------------------------------------------

/** Everything every consultation message needs to know about who and where. */
export type ConsultationContext = {
  consultationId: string
  inquiryId: string
  /** The client's private link token. */
  token: string
  /** The client's language for their own e-mails. */
  locale: Locale
  /** The client's IANA zone — the zone every time is shown in. */
  timezone: string
  clientName: string
  clientEmail: string
}

const consultationManageUrl = (ctx: ConsultationContext) => absoluteUrl(`/${ctx.locale}/consultation/${ctx.token}`)
const consultationCalendarUrl = (ctx: ConsultationContext) => absoluteUrl(`/api/consultation/${ctx.token}/calendar`)
const adminConsultationUrl = (consultationId: string) => absoluteUrl(`/en/admin/consultations/${consultationId}`)

const ORGANIZER = { email: siteConfig.email, name: 'Zakir Naseri' }

/**
 * A new request: the owner's alert and the client's acknowledgement (with their
 * private link). Idempotent per consultation, so the replay path of the request
 * action can call it again and queue nothing new.
 */
export async function enqueueConsultationRequested(
  supabase: SupabaseClient,
  ctx: ConsultationContext & { phone: string; goal: string; windows: ConsultationWindow[] },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const clientEmail = ctx.clientEmail.trim().toLowerCase()
  const owner = buildConsultationRequestedEmail({
    name: ctx.clientName,
    email: clientEmail,
    phone: ctx.phone,
    goal: ctx.goal,
    locale: ctx.locale,
    timezone: ctx.timezone,
    windows: ctx.windows,
    adminUrl: adminConsultationUrl(ctx.consultationId),
  })
  const client = buildConsultationReceivedEmail({
    locale: ctx.locale,
    windows: ctx.windows,
    timezone: ctx.timezone,
    manageUrl: consultationManageUrl(ctx),
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'consultation-requested',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: owner.subject,
      bodyText: owner.text,
      replyTo: clientEmail,
      dedupeKey: `consultation:${ctx.consultationId}:requested`,
      entityType: 'consultation',
      entityId: ctx.consultationId,
      inquiryId: ctx.inquiryId,
    },
    {
      kind: 'consultation-received',
      recipientEmail: clientEmail,
      locale: ctx.locale,
      subject: client.subject,
      bodyText: client.text,
      replyTo: siteConfig.email,
      dedupeKey: `consultation:${ctx.consultationId}:received`,
      entityType: 'consultation',
      entityId: ctx.consultationId,
      inquiryId: ctx.inquiryId,
    },
  ])
}

/**
 * The owner confirmed a time (or moved a confirmed one). The message carries a
 * `METHOD:REQUEST` invitation; `sequence` is what makes a moved call UPDATE the
 * client's existing calendar entry instead of adding a second one, and it is
 * part of the dedupe key so each move is its own message.
 */
export async function enqueueConsultationConfirmed(
  supabase: SupabaseClient,
  ctx: ConsultationContext,
  input: {
    range: ConsultationWindow
    meetingDetails: string
    sequence: number
    /** The time being replaced, when a confirmed call was moved. */
    previous: ConsultationWindow | null
    now?: Date
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email = buildConsultationConfirmedEmail({
    locale: ctx.locale,
    timezone: ctx.timezone,
    range: input.range,
    meetingDetails: input.meetingDetails,
    manageUrl: consultationManageUrl(ctx),
    calendarUrl: consultationCalendarUrl(ctx),
    previous: input.previous,
  })
  const ics = buildConsultationIcs({
    method: 'REQUEST',
    uid: consultationUid(ctx.consultationId),
    sequence: input.sequence,
    start: new Date(input.range.start),
    end: new Date(input.range.end),
    summary: consultationSummary(ctx.locale),
    description: `${input.meetingDetails.trim()}\n${consultationManageUrl(ctx)}`,
    location: input.meetingDetails.trim(),
    url: consultationManageUrl(ctx),
    organizer: ORGANIZER,
    attendee: { email: ctx.clientEmail, name: ctx.clientName },
    now: input.now ?? new Date(),
  })

  return enqueueNotifications(supabase, [
    {
      kind: 'consultation-confirmed',
      recipientEmail: ctx.clientEmail,
      locale: ctx.locale,
      subject: email.subject,
      bodyText: email.text,
      replyTo: siteConfig.email,
      dedupeKey: `consultation:${ctx.consultationId}:confirmed:${input.sequence}`,
      entityType: 'consultation',
      entityId: ctx.consultationId,
      inquiryId: ctx.inquiryId,
      attachments: [icsAttachment('REQUEST', ics)],
    },
  ])
}

/**
 * The call was cancelled. When `range` is set a time had been confirmed, so the
 * message carries a `METHOD:CANCEL` (with a higher `sequence`) that removes it
 * from the client's calendar. A client's own cancellation of a call that was
 * never confirmed has nothing to tell them — the page already showed it — so
 * nothing is queued in that one case; the owner's cancellation always is.
 */
export async function enqueueConsultationCancelled(
  supabase: SupabaseClient,
  ctx: ConsultationContext,
  input: {
    by: 'owner' | 'client'
    range: ConsultationWindow | null
    reason: string | null
    sequence: number
    now?: Date
  },
): Promise<{ id: string; kind: NotificationKind }[]> {
  if (input.by === 'client' && !input.range) return []

  const email = buildConsultationCancelledEmail({
    locale: ctx.locale,
    timezone: ctx.timezone,
    by: input.by,
    range: input.range,
    reason: input.reason,
    newRequestUrl: absoluteUrl(`/${ctx.locale}/consultation`),
  })
  const attachments = input.range
    ? [
        icsAttachment(
          'CANCEL',
          buildConsultationIcs({
            method: 'CANCEL',
            uid: consultationUid(ctx.consultationId),
            sequence: input.sequence,
            start: new Date(input.range.start),
            end: new Date(input.range.end),
            summary: consultationSummary(ctx.locale),
            organizer: ORGANIZER,
            attendee: { email: ctx.clientEmail, name: ctx.clientName },
            now: input.now ?? new Date(),
          }),
        ),
      ]
    : undefined

  return enqueueNotifications(supabase, [
    {
      kind: 'consultation-cancelled',
      recipientEmail: ctx.clientEmail,
      locale: ctx.locale,
      subject: email.subject,
      bodyText: email.text,
      replyTo: siteConfig.email,
      dedupeKey: `consultation:${ctx.consultationId}:cancelled`,
      entityType: 'consultation',
      entityId: ctx.consultationId,
      inquiryId: ctx.inquiryId,
      attachments,
    },
  ])
}

/** The client cancelled, or replaced their times, using their private link. Owner-only. */
export async function enqueueConsultationClientUpdate(
  supabase: SupabaseClient,
  ctx: ConsultationContext,
  input:
    | { change: 'cancelled'; reason: string | null; confirmedRange: ConsultationWindow | null }
    | {
        change: 'rescheduled'
        windows: ConsultationWindow[]
        confirmedRange: ConsultationWindow | null
        /** How many times the client has changed their times so far — makes each change its own message. */
        requestNumber: number
      },
): Promise<{ id: string; kind: NotificationKind }[]> {
  const email =
    input.change === 'cancelled'
      ? buildConsultationClientUpdateEmail({
          change: 'cancelled',
          name: ctx.clientName,
          reason: input.reason,
          confirmedRange: input.confirmedRange,
          timezone: ctx.timezone,
          adminUrl: adminConsultationUrl(ctx.consultationId),
        })
      : buildConsultationClientUpdateEmail({
          change: 'rescheduled',
          name: ctx.clientName,
          timezone: ctx.timezone,
          windows: input.windows,
          confirmedRange: input.confirmedRange,
          adminUrl: adminConsultationUrl(ctx.consultationId),
        })

  return enqueueNotifications(supabase, [
    {
      kind: 'consultation-client-update',
      recipientEmail: siteConfig.email,
      locale: 'en',
      subject: email.subject,
      bodyText: email.text,
      replyTo: ctx.clientEmail.trim().toLowerCase(),
      dedupeKey:
        input.change === 'cancelled'
          ? `consultation:${ctx.consultationId}:client-update:cancelled`
          : `consultation:${ctx.consultationId}:client-update:rescheduled:${input.requestNumber}`,
      entityType: 'consultation',
      entityId: ctx.consultationId,
      inquiryId: ctx.inquiryId,
    },
  ])
}
