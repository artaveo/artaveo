import {
  LINK_LINGER_DAYS,
  MAX_LEAD_DAYS,
  MAX_WINDOW_MINUTES,
  MAX_WINDOWS,
  MIN_LEAD_HOURS,
  MIN_WINDOW_MINUTES,
  TIME_STEP_MINUTES,
} from '@/lib/consultation/config'
import { canonicalTimeZone, minutesOfDay, zonedWallTimeToUtc } from '@/lib/consultation/time'
import { ALLOWED_CONSULTATION_TRANSITIONS, type ConsultationStatus, type ConsultationWindow, type WindowErrorCode, type WindowInput } from '@/types/consultation'

/**
 * Phase 20 — validating what a client proposes, and the small rules about what
 * may happen to a consultation in each state. Pure: the clock is a parameter.
 */

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/
const TIME_SHAPE = /^\d{2}:\d{2}$/

export type ResolveWindowsResult =
  | { ok: true; timezone: string; windows: ConsultationWindow[] }
  | { ok: false; code: WindowErrorCode; index?: number }

/**
 * Wall-clock windows in a zone → validated, sorted instants. The server runs
 * this on every request and reschedule; the form runs the same function to
 * preview and to explain, so the two cannot disagree.
 */
export function resolveWindows(timezone: string, inputs: WindowInput[], now: Date): ResolveWindowsResult {
  const zone = canonicalTimeZone(timezone)
  if (!zone) return { ok: false, code: 'invalid-timezone' }

  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > MAX_WINDOWS) {
    return { ok: false, code: 'window-count' }
  }

  const resolved: { window: ConsultationWindow; index: number }[] = []

  for (const [index, input] of inputs.entries()) {
    if (
      !input ||
      typeof input.date !== 'string' ||
      typeof input.from !== 'string' ||
      typeof input.to !== 'string' ||
      !DATE_SHAPE.test(input.date) ||
      !TIME_SHAPE.test(input.from) ||
      !TIME_SHAPE.test(input.to)
    ) {
      return { ok: false, code: 'window-invalid', index }
    }

    const fromMinutes = minutesOfDay(input.from)
    const toMinutes = minutesOfDay(input.to)
    if (
      !Number.isFinite(fromMinutes) ||
      !Number.isFinite(toMinutes) ||
      fromMinutes >= 24 * 60 ||
      toMinutes >= 24 * 60 ||
      fromMinutes % TIME_STEP_MINUTES !== 0 ||
      toMinutes % TIME_STEP_MINUTES !== 0
    ) {
      return { ok: false, code: 'window-invalid', index }
    }
    // One window is one afternoon, not an overnight span.
    if (toMinutes <= fromMinutes) return { ok: false, code: 'window-order', index }

    const start = zonedWallTimeToUtc(input.date, input.from, zone)
    const end = zonedWallTimeToUtc(input.date, input.to, zone)
    if (!start || !end) return { ok: false, code: 'window-nonexistent', index }

    const minutes = (end.getTime() - start.getTime()) / MS_PER_MINUTE
    if (minutes < MIN_WINDOW_MINUTES) return { ok: false, code: 'window-too-short', index }
    if (minutes > MAX_WINDOW_MINUTES) return { ok: false, code: 'window-too-long', index }

    if (start.getTime() < now.getTime() + MIN_LEAD_HOURS * MS_PER_HOUR) return { ok: false, code: 'window-too-soon', index }
    if (start.getTime() > now.getTime() + MAX_LEAD_DAYS * MS_PER_DAY) return { ok: false, code: 'window-too-far', index }

    resolved.push({ window: { start: start.toISOString(), end: end.toISOString() }, index })
  }

  resolved.sort((a, b) => a.window.start.localeCompare(b.window.start))
  for (let i = 1; i < resolved.length; i += 1) {
    if (resolved[i].window.start < resolved[i - 1].window.end) {
      return { ok: false, code: 'window-overlap', index: resolved[i].index }
    }
  }

  return { ok: true, timezone: zone, windows: resolved.map((entry) => entry.window) }
}

/** `true` when every window the client offered is already over — nothing left to confirm as proposed. */
export function allWindowsPassed(windows: ConsultationWindow[], now: Date): boolean {
  return windows.length > 0 && windows.every((window) => new Date(window.end).getTime() <= now.getTime())
}

export function isTerminal(status: ConsultationStatus): boolean {
  return status === 'cancelled' || status === 'completed'
}

/** Live consultations are the ones the database allows one of per inquiry. */
export function isActive(status: ConsultationStatus): boolean {
  return !isTerminal(status)
}

export function canTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  return ALLOWED_CONSULTATION_TRANSITIONS[from].includes(to)
}

/**
 * The owner can set (or change) the time while the consultation is live and
 * waiting on one, or already confirmed (moving a confirmed call).
 */
export function canOwnerConfirm(status: ConsultationStatus): boolean {
  return status === 'requested' || status === 'rescheduled' || status === 'confirmed'
}

/** "Completed" is only true of a call whose time has come. */
export function canMarkCompleted(
  consultation: { status: ConsultationStatus; confirmedStart: string | null },
  now: Date,
): boolean {
  return (
    consultation.status === 'confirmed' &&
    consultation.confirmedStart !== null &&
    new Date(consultation.confirmedStart).getTime() <= now.getTime()
  )
}

/**
 * How long a consultation's private link keeps working. Live consultations
 * always resolve; a finished one stays readable for `LINK_LINGER_DAYS` (so the
 * client can see "cancelled" or "completed" rather than a dead link), then
 * answers as expired.
 */
export function linkExpired(consultation: { closedAt: string | null }, now: Date): boolean {
  if (!consultation.closedAt) return false
  return now.getTime() - new Date(consultation.closedAt).getTime() > LINK_LINGER_DAYS * MS_PER_DAY
}

/** Tokens are 24 random bytes as base64url — 32 characters — but a backfilled one may be longer. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,128}$/

export function looksLikeToken(value: string): boolean {
  return TOKEN_SHAPE.test(value)
}
