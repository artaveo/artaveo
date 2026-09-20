import 'server-only'
import crypto from 'node:crypto'
import { headers } from 'next/headers'

/**
 * The caller's address, and the salted one-way hash of it that is stored
 * instead. Shared by the Brief Builder (`app/actions/inquiries.ts`) and the
 * consultation request (`app/actions/consultations.ts`) on purpose: a
 * consultation request IS an inquiry, and the per-IP rate limit only means
 * something if both flows hash an address to the same value. The raw address
 * is never stored (§ 9.2, "without extra personal data").
 */
export function hashIp(ip: string): string {
  // The secret just stops someone from brute-forcing which hash corresponds
  // to a known IP; it is not meant to be a strong cryptographic key.
  const secret = process.env.INQUIRY_IP_HASH_SECRET ?? 'artaveo-dev-only-unset-secret'
  return crypto.createHash('sha256').update(`${ip}:${secret}`).digest('hex')
}

export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  return h.get('x-real-ip') ?? '0.0.0.0'
}
