import type { Locale } from '@/types/content'

/**
 * Phase 20 — Consultation.
 *
 * `CONSULTATION_STATUSES` and `ALLOWED_CONSULTATION_TRANSITIONS` mirror
 * `db/migrations/0019_consultations.sql` (the `status` check from 0006 and
 * `enforce_consultation_status_transition()`) exactly — the same arrangement
 * the lead pipeline uses in `types/pipeline.ts`. The database trigger is the
 * real guard; this map only lets the UI offer valid actions without a round
 * trip, and the server actions check it too so a caller gets a specific code
 * rather than a Postgres error string.
 */
export const CONSULTATION_STATUSES = ['requested', 'confirmed', 'rescheduled', 'cancelled', 'completed'] as const
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]

export const ALLOWED_CONSULTATION_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['rescheduled', 'cancelled', 'completed'],
  rescheduled: ['confirmed', 'cancelled'],
  cancelled: [],
  completed: [],
}

/** A time range the client offered, or a stored one: two instants, ISO 8601 in UTC. */
export type ConsultationWindow = { start: string; end: string }

/**
 * What the form sends: wall-clock values in the client's own time zone. The
 * server converts them to instants itself (`lib/consultation/windows.ts`) — it
 * never trusts an instant computed in the browser.
 */
export type WindowInput = {
  /** `YYYY-MM-DD` in `timezone`. */
  date: string
  /** `HH:mm` (24 h) in `timezone`. */
  from: string
  /** `HH:mm` (24 h) in `timezone`, later than `from` on the same date. */
  to: string
}

export type ConsultationRequestInput = {
  name: string
  email: string
  /** Optional. When present the request's preferred channel is WhatsApp. */
  phone: string
  /** What the client wants to talk about — becomes the inquiry's `goal`. */
  goal: string
  /** IANA zone the windows are written in. */
  timezone: string
  windows: WindowInput[]
  consent: boolean
}

export type ConsultationRequestMeta = {
  honeypot: string
  formRenderedAt: number
  /** A UUID generated when the form is rendered — the inquiry's idempotency key. */
  idempotencyKey: string
  sourceReferrer?: string | null
}

export type ConsultationRequestErrorCode =
  | 'invalid'
  | 'rejected'
  | 'not-configured'
  | 'error'
  | WindowErrorCode

export type ConsultationRequestResult =
  | { ok: true; token: string; replay?: boolean }
  | { ok: false; code: ConsultationRequestErrorCode }

export type WindowErrorCode =
  | 'invalid-timezone'
  | 'window-count'
  | 'window-invalid'
  | 'window-order'
  | 'window-too-short'
  | 'window-too-long'
  | 'window-too-soon'
  | 'window-too-far'
  | 'window-overlap'
  | 'window-nonexistent'

/** What a `/consultation/[token]` page (and the owner's admin) shows about one consultation. */
export type ConsultationView = {
  id: string
  inquiryId: string
  createdAt: string
  updatedAt: string
  status: ConsultationStatus
  locale: Locale
  timezone: string
  durationMinutes: number
  windows: ConsultationWindow[]
  confirmedStart: string | null
  confirmedEnd: string | null
  confirmedAt: string | null
  meetingDetails: string | null
  rescheduleRequests: number
  cancelledBy: 'client' | 'owner' | null
  cancelReason: string | null
  closedAt: string | null
  sequence: number
}

/** `ConsultationView` plus the client's own details, for the admin. */
export type AdminConsultation = ConsultationView & {
  token: string
  inquiry: {
    name: string
    email: string
    phone: string
    goal: string
    preferredLocale: string
    preferredChannel: string
    stage: string
  }
}

export type ClientActionCode =
  | 'not-found'
  | 'expired'
  | 'not-configured'
  | 'not-allowed'
  | 'limit-reached'
  | 'invalid'
  | 'rejected'
  | 'error'
  | WindowErrorCode

export type ClientActionResult = { ok: true } | { ok: false; code: ClientActionCode }

export type AdminActionCode =
  | 'forbidden'
  | 'not-configured'
  | 'not-found'
  | 'invalid-transition'
  | 'invalid'
  | 'in-the-past'
  | 'not-finished'
  | 'conflict'
  | 'error'
  | WindowErrorCode

export type AdminActionResult = { ok: true } | { ok: false; code: AdminActionCode }
