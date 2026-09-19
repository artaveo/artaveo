/**
 * Phase 19 — retry policy, kept pure so it can be tested without a database.
 *
 * After the Nth failed attempt (1-indexed) the next attempt is scheduled
 * `BACKOFF_SCHEDULE_MS[N - 1]` later, clamped to the last step: 1 min → 5 min →
 * 30 min → 2 h → 2 h … A message is retried until `max_attempts` (default 5)
 * or until a failure is judged permanent (`retryable: false`), then it is
 * `exhausted` and the owner is alerted.
 *
 * These are MINIMUM delays. A row only becomes eligible once `next_attempt_at`
 * has passed; something must then actually run a sweep. On the Hobby plan that
 * is the once-a-day cron, plus the opportunistic sweep after each new
 * submission and the admin's "Retry now" — see `docs/phases/PHASE-19-README.md`.
 */

export const DEFAULT_MAX_ATTEMPTS = 5

/** Extra attempts granted when the owner presses "Retry" on an exhausted message. */
export const MANUAL_RETRY_EXTRA_ATTEMPTS = 3

export const BACKOFF_SCHEDULE_MS: readonly number[] = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000]

export function backoffMsForAttempt(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1) - 1, BACKOFF_SCHEDULE_MS.length - 1)
  return BACKOFF_SCHEDULE_MS[index]!
}

export function nextAttemptAt(attempt: number, now: Date = new Date()): string {
  return new Date(now.getTime() + backoffMsForAttempt(attempt)).toISOString()
}

/**
 * `attempts` is never reset (the delivery log keeps a true history), so a
 * manual retry raises the ceiling instead: it always allows at least
 * `MANUAL_RETRY_EXTRA_ATTEMPTS` more tries.
 */
export function maxAttemptsAfterManualRetry(attempts: number, maxAttempts: number): number {
  return Math.max(maxAttempts, attempts + MANUAL_RETRY_EXTRA_ATTEMPTS)
}

/** What to do with a row after a failed attempt. `attempt` is the attempt that just failed. */
export function failureOutcome(input: {
  attempt: number
  maxAttempts: number
  retryable: boolean
}): 'retry' | 'exhausted' {
  if (!input.retryable) return 'exhausted'
  return input.attempt >= input.maxAttempts ? 'exhausted' : 'retry'
}
