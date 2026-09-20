/**
 * Phase 20 — the rules of a consultation request, in one place so the form,
 * the server and the tests cannot drift apart.
 *
 * D-09 (default, awaiting the owner's sign-off): a free intro call of 20–30
 * minutes, request-based in v1. The call is booked for the upper end of that
 * range, so a client never blocks less time than the call might take.
 *
 * The limits below are engineering choices, not published policy: they keep a
 * request answerable (a reply takes hours, so nothing can start in the next
 * few) and stop a stale or absurd request from reaching the owner. Each is
 * checked on the server; the form only mirrors them.
 */
export const CONSULTATION_DURATION_MINUTES = 30

/** A window may not start sooner than this after the request is sent — the owner replies within hours, not minutes (D-08). */
export const MIN_LEAD_HOURS = 12

/** Nor later than this — a window months away is stale before it can be confirmed. */
export const MAX_LEAD_DAYS = 45

/** A window must be able to hold the call itself. */
export const MIN_WINDOW_MINUTES = CONSULTATION_DURATION_MINUTES

/** …and a single window longer than a working day is not a window. */
export const MAX_WINDOW_MINUTES = 8 * 60

export const MAX_WINDOWS = 3

/** Wall-clock times in the form come in steps of this many minutes. */
export const TIME_STEP_MINUTES = 30

/** How many times a client may replace their windows or ask for a new time. */
export const MAX_RESCHEDULE_REQUESTS = 3

/** A cancelled or completed consultation's link stays readable this long, then answers "expired". */
export const LINK_LINGER_DAYS = 14

/** Free-text limits, mirrored by the database `check`s where they exist. */
export const MAX_GOAL_LENGTH = 2000
export const MIN_GOAL_LENGTH = 10
export const MAX_MEETING_DETAILS_LENGTH = 2000
export const MAX_CANCEL_REASON_LENGTH = 1000

/** Same limits as the Brief Builder (`app/actions/inquiries.ts`) — a consultation request is an inquiry too. */
export const MAX_REQUESTS_PER_IP_PER_HOUR = 5
export const MAX_REQUESTS_PER_EMAIL_PER_DAY = 3

/** A person cannot fill in this form faster than this. */
export const MIN_FORM_FILL_MS = 3000
