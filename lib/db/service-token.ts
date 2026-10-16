import 'server-only'
import { importPKCS8, SignJWT, type CryptoKey } from 'jose'

/**
 * The server's own identity towards the Neon Data API (migration from Supabase,
 * October 2026).
 *
 * Supabase handed the server a long-lived `service_role` key. Neon has no such
 * key for its Data API: every request carries a JWT from an issuer the project
 * trusts, and the `role` claim picks the Postgres role the query runs as. So the
 * server signs its own short-lived token (ES256) with `role: service_role` —
 * the role `db/neon/prelude.sql` creates with BYPASSRLS, i.e. exactly what the
 * Supabase key used to be. The matching public key is published as a JWKS in
 * the public `service-jwks` bucket, which is the URL the Data API is configured
 * to trust (`docs/runbooks/secrets-rotation.md` covers rotating it).
 *
 * The private key never leaves the server (`server-only`); a token lives five
 * minutes and is reused until one minute before it expires.
 */

const TOKEN_TTL_SECONDS = 5 * 60
const REFRESH_MARGIN_SECONDS = 60

let keyPromise: Promise<CryptoKey> | null = null
let cachedToken: { value: string; expiresAt: number } | null = null

export function serviceTokenConfigured(): boolean {
  return Boolean(process.env.NEON_SERVICE_JWT_PRIVATE_KEY && process.env.NEON_SERVICE_JWT_KID)
}

function privateKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    // Stored base64-encoded so the multi-line PEM survives env-var editors (Vercel, .env files).
    const pem = Buffer.from(process.env.NEON_SERVICE_JWT_PRIVATE_KEY ?? '', 'base64').toString('utf8')
    keyPromise = importPKCS8(pem, 'ES256')
    keyPromise.catch(() => {
      keyPromise = null
    })
  }
  return keyPromise
}

export async function serviceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_SECONDS > now) return cachedToken.value

  const expiresAt = now + TOKEN_TTL_SECONDS
  const value = await new SignJWT({ role: 'service_role' })
    .setProtectedHeader({ alg: 'ES256', kid: process.env.NEON_SERVICE_JWT_KID, typ: 'JWT' })
    .setSubject('artaveo-server')
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(await privateKey())
  cachedToken = { value, expiresAt }
  return value
}
