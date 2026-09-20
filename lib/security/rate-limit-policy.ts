/**
 * The rate-limit policy, in one place (Phase 23). Every public mutation — and
 * admin sign-in — appears here with what it is limited by and how much. Nothing
 * in this file touches the network, so the policy can be read, reviewed and
 * unit-tested on its own; `lib/security/rate-limit.ts` applies it.
 *
 * These count ATTEMPTS, not successes (a request that fails validation still
 * costs a token), and they sit in front of the older limits that count stored
 * records (per-IP and per-e-mail caps on inquiries and consultation requests),
 * which stay: those answer "how many briefs may one person leave", these answer
 * "how fast may anyone knock".
 *
 * Numbers are deliberately generous for people (a shared office or campus
 * network is one address) and tight for scripts. A window is fixed, not
 * sliding: a caller can spend one window's allowance at its end and the next
 * window's at its start — at most twice the limit across a boundary. That is
 * accepted for what a fixed window buys: one atomic statement in the database.
 */

export type LimitRule = { limit: number; windowSeconds: number }

export type RateLimitPolicy = {
  /** Per client address. */
  ip: LimitRule
  /** Per second dimension the caller supplies (an e-mail address, a link token, a user id). */
  subject?: LimitRule
  /** Across every caller — a ceiling that still holds if addresses are spoofed or spread over many hosts. */
  global?: LimitRule
}

const HOUR = 3600
const QUARTER_HOUR = 900

export const RATE_LIMITS = {
  'inquiry.submit': { ip: { limit: 15, windowSeconds: HOUR }, global: { limit: 300, windowSeconds: HOUR } },
  'inquiry.upload': { ip: { limit: 20, windowSeconds: HOUR }, global: { limit: 400, windowSeconds: HOUR } },
  'inquiry.upload-remove': { ip: { limit: 40, windowSeconds: HOUR } },
  'consultation.request': { ip: { limit: 15, windowSeconds: HOUR }, global: { limit: 300, windowSeconds: HOUR } },
  'consultation.client-action': {
    ip: { limit: 40, windowSeconds: HOUR },
    subject: { limit: 20, windowSeconds: HOUR },
  },
  'recommendation.submit': {
    ip: { limit: 30, windowSeconds: HOUR },
    subject: { limit: 15, windowSeconds: HOUR },
    global: { limit: 300, windowSeconds: HOUR },
  },
  'token.calendar': { ip: { limit: 120, windowSeconds: HOUR }, subject: { limit: 60, windowSeconds: HOUR } },
  'admin.sign-in': {
    ip: { limit: 20, windowSeconds: QUARTER_HOUR },
    subject: { limit: 10, windowSeconds: QUARTER_HOUR },
    global: { limit: 300, windowSeconds: QUARTER_HOUR },
  },
  'admin.mfa': { ip: { limit: 20, windowSeconds: QUARTER_HOUR }, subject: { limit: 10, windowSeconds: QUARTER_HOUR } },
} as const satisfies Record<string, RateLimitPolicy>

export type RateLimitName = keyof typeof RATE_LIMITS

/** A bucket key never contains what it counts: only the scope, the dimension and a salted hash. */
export function bucketKey(name: string, dimension: 'ip' | 'subject' | 'global', hashedValue: string): string {
  return `${name}:${dimension}:${hashedValue}`
}
