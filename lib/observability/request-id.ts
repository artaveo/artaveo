/**
 * The correlation id (Phase 24): one UUID per request, made by `proxy.ts`,
 * carried in the `x-request-id` header, and written next to everything that
 * request produces — its log lines, the inquiry row, the inquiry's timeline, the
 * e-mails it queued (`notification_outbox.request_id`) and the audit row
 * (`audit_log.correlation_id`). Paste one id into `/admin/observability` and
 * every one of those comes back.
 *
 * It is a UUID (not a shorter token) because `audit_log.correlation_id` has been
 * a `uuid` column since migration 0008.
 *
 * Runtime-neutral on purpose (no Node imports): `proxy.ts` uses it too.
 * The per-request context that lets deep code read the id without passing it
 * around is in `context.ts`, which is Node-only.
 */

export const REQUEST_ID_HEADER = 'x-request-id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function newRequestId(): string {
  return crypto.randomUUID()
}

/**
 * The id a request already carries, or `undefined`. A value that is not a UUID
 * is ignored rather than trusted: the header can be set by anyone who talks to
 * the site directly, and an id ends up in logs and in a `uuid` column.
 * (`proxy.ts` overwrites the header on every request it sees; this is the
 * second line of defence for the routes it does not run on.)
 */
export function requestIdFrom(get: (name: string) => string | null | undefined): string | undefined {
  const value = get(REQUEST_ID_HEADER)?.trim()
  return isRequestId(value) ? value.toLowerCase() : undefined
}
