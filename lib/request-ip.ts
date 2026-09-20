import 'server-only'
import crypto from 'node:crypto'
import net from 'node:net'
import { headers } from 'next/headers'

/**
 * The caller's address, and the salted one-way hash of it that is stored
 * instead. Shared by every public flow (Brief Builder, consultation,
 * recommendations, uploads, admin sign-in) on purpose: a per-IP limit only
 * means something if all of them hash an address to the same value. The raw
 * address is never stored (§ 9.2, "without extra personal data").
 */

/**
 * The secret that salts every stored hash and every rate-limit key.
 *
 * `INQUIRY_IP_HASH_SECRET` when set. When it is not (Phase 23): a key derived,
 * one-way, from the service-role key — a server-only secret that must exist for
 * the site to work at all — instead of the constant this used to fall back to.
 * With a public constant, every stored IPv4 hash could be reversed by trying
 * all 2^32 addresses; with a derived key it cannot. Only when neither exists
 * (local development without a database) does the development constant apply.
 */
export function hashSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.INQUIRY_IP_HASH_SECRET) return env.INQUIRY_IP_HASH_SECRET
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    return crypto.createHmac('sha256', 'artaveo:hash-secret:v1').update(env.SUPABASE_SERVICE_ROLE_KEY).digest('hex')
  }
  return 'artaveo-dev-only-unset-secret'
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`${ip}:${hashSecret()}`).digest('hex')
}

const UNKNOWN_IP = '0.0.0.0'

function firstHop(value: string | null | undefined): string | null {
  const hop = value?.split(',')[0]?.trim()
  return hop && net.isIP(hop) ? hop : null
}

/**
 * Picks the client address out of the request headers — pure, so it can be
 * tested with any header set.
 *
 * On Vercel the platform sets `x-real-ip` / `x-vercel-forwarded-for` /
 * `x-forwarded-for` itself and does not forward values a client supplied, so
 * the platform's own headers come first there. Anywhere else (local
 * development, the test stack, a different host) `x-forwarded-for` is only as
 * trustworthy as whatever proxy sits in front, which is unknowable from here —
 * so the old order is kept. A value that is not an IP address at all is
 * ignored, and an unknown caller shares ONE bucket, which is the safe
 * direction for a limiter.
 */
export function pickClientIp(get: (name: string) => string | null, env: Record<string, string | undefined> = process.env): string {
  const candidates =
    env.VERCEL === '1' || env.VERCEL === 'true'
      ? [get('x-real-ip'), firstHop(get('x-vercel-forwarded-for')), firstHop(get('x-forwarded-for'))]
      : [firstHop(get('x-forwarded-for')), get('x-real-ip')]
  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value && net.isIP(value)) return value
  }
  return UNKNOWN_IP
}

export async function getClientIp(): Promise<string> {
  const h = await headers()
  return pickClientIp((name) => h.get(name))
}
