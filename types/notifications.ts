import type { Locale } from '@/types/content'

/**
 * Phase 19 — Notifications & Outbox.
 *
 * `NOTIFICATION_KINDS` is a closed set (§ 16.5, "never invent a value"): the
 * same values `db/migrations/0017_notifications_outbox_v2.sql` and
 * `0018_recommender_email.sql` allow in the `check` constraint. A new event means a new entry here, a new template
 * in `lib/notifications/templates.ts`, and a new migration widening that
 * constraint — never a free-form string.
 */
export const NOTIFICATION_KINDS = [
  'owner-alert', // a new inquiry reached the Brief Builder (§ 9.3)
  'client-confirmation', // the client's copy of their own brief (§ 9.3)
  'evidence-submitted', // a recommender submitted or re-submitted a statement (§ 16)
  'content-published', // content went live: a scheduled article (daily run) or a manual publish in the admin
  'system-alert', // another notification could not be delivered
  'recommendation-request', // the owner sends a recommender their single-use link (D-14)
  'recommendation-changes', // the owner asks a recommender to change their statement (D-14)
] as const

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const NOTIFICATION_STATUSES = ['pending', 'sending', 'sent', 'failed', 'exhausted'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/**
 * Who the message is addressed to. `client` and `recommender` messages go to
 * someone outside the studio and are the only ones written in the recipient's
 * language (en/fa); everything addressed to the owner is English.
 */
export type NotificationAudience = 'owner' | 'client' | 'recommender'

export const NOTIFICATION_AUDIENCE: Record<NotificationKind, NotificationAudience> = {
  'owner-alert': 'owner',
  'client-confirmation': 'client',
  'evidence-submitted': 'owner',
  'content-published': 'owner',
  'system-alert': 'owner',
  'recommendation-request': 'recommender',
  'recommendation-changes': 'recommender',
}

/** `notification_outbox` as PostgREST returns it. */
export type NotificationOutboxRow = {
  id: string
  created_at: string
  inquiry_id: string | null
  entity_type: string | null
  entity_id: string | null
  dedupe_key: string | null
  kind: NotificationKind
  recipient_email: string
  reply_to: string | null
  locale: Locale
  subject: string
  body_text: string
  status: NotificationStatus
  attempts: number
  max_attempts: number
  last_error: string | null
  last_provider: string | null
  last_attempt_at: string | null
  next_attempt_at: string
  locked_until: string | null
  sent_at: string | null
}

/** `notification_attempts` as PostgREST returns it. */
export type NotificationAttemptRow = {
  id: string
  outbox_id: string
  attempt_no: number
  at: string
  provider: string
  ok: boolean
  retryable: boolean | null
  error: string | null
  provider_message_id: string | null
  duration_ms: number | null
}

/** Admin-facing shapes (camelCase, like `types/pipeline.ts`). */
export type NotificationView = {
  id: string
  createdAt: string
  kind: NotificationKind
  status: NotificationStatus
  recipientEmail: string
  replyTo: string | null
  locale: Locale
  subject: string
  bodyText: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  lastProvider: string | null
  lastAttemptAt: string | null
  nextAttemptAt: string
  sentAt: string | null
  inquiryId: string | null
  entityType: string | null
  entityId: string | null
}

export type NotificationAttemptView = {
  id: string
  attemptNo: number
  at: string
  provider: string
  ok: boolean
  retryable: boolean | null
  error: string | null
  providerMessageId: string | null
  durationMs: number | null
}

export type NotificationFilters = {
  status?: NotificationStatus
  kind?: NotificationKind
  page?: number
  pageSize?: number
}

export type NotificationSummary = {
  counts: Record<NotificationStatus, number>
  /** `pending`/`failed` rows whose `next_attempt_at` has passed — waiting for a sweep. */
  overdue: number
  /** Oldest overdue row's `next_attempt_at`, or `null` when nothing is overdue. */
  oldestOverdueAt: string | null
  /** Inquiries from the last 7 days that have no outbox row at all (an enqueue that never landed). */
  recentInquiriesWithoutNotifications: number
}

export type EmailProviderInfo = {
  /** The provider actually in use. */
  id: 'console' | 'resend'
  /** `true` only when a real provider will really deliver mail. */
  deliversRealEmail: boolean
  /** What `EMAIL_PROVIDER` asked for, or `'console'` when unset. */
  requested: string
  /** `true` when `resend` was asked for but the key or from-address is missing, so the console provider is used instead. */
  misconfigured: boolean
}
