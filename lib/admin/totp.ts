import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import QRCode from 'qrcode'

/**
 * Two-factor sign-in for the admin (roadmap § 13), built into the app since the
 * move to Neon: Managed Better Auth has no TOTP plugin, and Supabase's MFA went
 * with Supabase. It stays OPTIONAL per admin, exactly as before (see
 * `lib/admin/auth.ts#mfaSatisfied`).
 *
 * Three pieces:
 *
 *  - Codes: RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30-second steps) — what every
 *    authenticator app speaks. One step of clock drift is accepted either way,
 *    and a step that was already used is refused (`admin_users.totp_last_step`),
 *    so a code read over someone's shoulder cannot be replayed.
 *
 *  - The secret at rest: AES-256-GCM under MFA_ENCRYPTION_KEY (32 random bytes,
 *    base64), stored in `admin_users.totp_secret` / `totp_pending_secret`. A copy
 *    of the database alone does not produce working codes.
 *
 *  - "This session passed the second factor" (Supabase called it aal2): an
 *    httpOnly cookie that names the Better Auth session id and the user, with an
 *    expiry, signed with a key derived from MFA_ENCRYPTION_KEY. It is only valid
 *    together with the very session it names — signing out, or the session
 *    expiring, makes it worthless.
 */

const DIGITS = 6
const STEP_SECONDS = 30
const DRIFT_STEPS = 1
const ISSUER = 'Artaveo'

export const MFA_COOKIE = 'artaveo_mfa'
const MFA_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 3600

// ---------------------------------------------------------------------------
// keys

function masterKey(): Buffer | null {
  const raw = process.env.MFA_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  return key.length === 32 ? key : null
}

export function totpConfigured(): boolean {
  return masterKey() !== null
}

function subKey(purpose: string): Buffer {
  const key = masterKey()
  if (!key) throw new Error('MFA_ENCRYPTION_KEY is not set (32 random bytes, base64).')
  return crypto.createHmac('sha256', key).update(`artaveo:mfa:${purpose}:v1`).digest()
}

// ---------------------------------------------------------------------------
// the secret at rest

export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', subKey('secret'), iv)
  const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), body.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.')
}

export function decryptSecret(stored: string): string | null {
  const [version, iv, body, tag] = stored.split('.')
  if (version !== 'v1' || !iv || !body || !tag) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', subKey('secret'), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// codes (RFC 6238 / RFC 4226)

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(text: string): Buffer {
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    const index = BASE32.indexOf(char)
    if (index === -1) throw new Error('invalid base32')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** 160 random bits, base32 — the size RFC 4226 recommends for HMAC-SHA1. */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

export function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS)
}

/**
 * The step the code belongs to, or `null`. Only steps after `lastUsedStep` count,
 * so each code works once. Compared in constant time.
 */
export function verifyCode(secret: string, code: string, lastUsedStep: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const step = currentStep(now)
  let matched: number | null = null
  for (let candidate = step - DRIFT_STEPS; candidate <= step + DRIFT_STEPS; candidate++) {
    if (lastUsedStep !== null && candidate <= lastUsedStep) continue
    const expected = Buffer.from(codeAt(secret, candidate))
    if (crypto.timingSafeEqual(expected, Buffer.from(code)) && matched === null) matched = candidate
  }
  return matched
}

export function otpauthUri(accountName: string, secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${accountName}`)
  const params = new URLSearchParams({ secret, issuer: ISSUER, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** A `data:image/svg+xml` URI — rendered through `<img>`, never injected as markup. */
export async function qrCodeDataUri(uri: string): Promise<string> {
  const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// ---------------------------------------------------------------------------
// "this session passed the second factor"

function cookieSignature(userId: string, sessionId: string, expiresAt: number): string {
  return crypto.createHmac('sha256', subKey('session')).update(`${userId}.${sessionId}.${expiresAt}`).digest('base64url')
}

export async function markSessionVerified(userId: string, sessionId: string, sessionExpiresAt?: string | Date | null): Promise<void> {
  const sessionEnd = sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : Number.POSITIVE_INFINITY
  const expiresAt = Math.floor(Math.min(Date.now() + MFA_COOKIE_MAX_AGE_SECONDS * 1000, sessionEnd) / 1000)
  const value = `${sessionId}.${expiresAt}.${cookieSignature(userId, sessionId, expiresAt)}`
  const store = await cookies()
  store.set(MFA_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
  })
}

export async function isSessionVerified(userId: string, sessionId: string): Promise<boolean> {
  if (!totpConfigured()) return false
  const raw = (await cookies()).get(MFA_COOKIE)?.value
  if (!raw) return false
  const [cookieSessionId, expiresText, signature] = raw.split('.')
  const expiresAt = Number(expiresText)
  if (cookieSessionId !== sessionId || !Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now() || !signature) return false
  const expected = Buffer.from(cookieSignature(userId, sessionId, expiresAt))
  const given = Buffer.from(signature)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

export async function clearSessionVerified(): Promise<void> {
  try {
    ;(await cookies()).delete(MFA_COOKIE)
  } catch {
    // Called from a Server Component render — nothing to clear there.
  }
}
