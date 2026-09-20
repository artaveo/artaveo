/**
 * A consultation's private link token: 24 random bytes as base64url — 32
 * URL-safe characters, unguessable, no padding to strip. The same construction
 * as a recommendation request's token (`lib/recommendations.ts`): the token IS
 * the access control, so it comes from the platform's CSPRNG, never from
 * anything derivable (an id, a timestamp, the client's e-mail).
 */
export function generateConsultationToken(): string {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}
