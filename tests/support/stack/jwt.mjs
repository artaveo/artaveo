/**
 * Minimal HS256 JWT helpers for the test stack (no dependency). PostgREST
 * verifies these with the same secret; the fake auth service in gateway.mjs
 * mints and verifies the admin sessions with them.
 */
import crypto from 'node:crypto'

const b64url = (input) => Buffer.from(input).toString('base64url')

export function signJwt(claims, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify(claims))
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

/** Returns the claims, or `null` for a malformed, wrongly-signed or expired token. */
export function verifyJwt(token, secret) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  const given = Buffer.from(parts[2])
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

/** A long-lived role key, the shape of Supabase's `anon` / `service_role` keys. */
export function roleKey(role, secret) {
  return signJwt({ iss: 'artaveo-test-stack', role, iat: 1700000000, exp: 4102444800 }, secret)
}
