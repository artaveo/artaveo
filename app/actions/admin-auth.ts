'use server'

import { bindRequestId, getRequestId } from '@/lib/observability/context'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getNeonAuth } from '@/lib/auth/server'
import { getAdminSession, mfaDestination, mfaSatisfied, resolveAdminSession, type AdminRole } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import {
  clearSessionVerified,
  decryptSecret,
  encryptSecret,
  generateSecret,
  markSessionVerified,
  otpauthUri,
  qrCodeDataUri,
  totpConfigured,
  verifyCode,
} from '@/lib/admin/totp'
import { getDbClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/security/rate-limit'

/**
 * Roadmap § 13 — Admin Authentication & Authorization. Every action here
 * re-verifies its own precondition independently (never trusts that a
 * page-level redirect already ran) and writes an audit_log entry for
 * every real auth event — sign-in attempts (success and failure),
 * sign-out, and every MFA state change. Generic error codes are returned
 * deliberately (`invalid-credentials` never distinguishes "no such user"
 * from "wrong password", `not-admin` is the same shape as
 * `invalid-credentials` to the caller) so a failed attempt can't be used
 * to enumerate which emails have accounts.
 *
 * Since the move to Neon: the password is checked by Managed Better Auth;
 * the optional second factor is the app's own TOTP (`lib/admin/totp.ts`),
 * because Managed Better Auth has none. The factor id the UI passes around is
 * always one of two fixed values — `totp` (the confirmed factor) or
 * `totp-pending` (an enrollment awaiting its first code) — since each admin
 * has at most one of each.
 */

const FACTOR_ID = 'totp'
const PENDING_FACTOR_ID = 'totp-pending'
const SESSION_TOKEN_COOKIE = '__Secure-neon-auth.session_token'
const SESSION_DATA_COOKIE = '__Secure-neon-auth.local.session_data'

export type SignInResult =
  | { ok: false; code: 'not-configured' | 'invalid-credentials' | 'rate-limited' }
  | { ok: true; next: 'mfa-challenge' | 'security' | 'dashboard' }

/**
 * A sign-in that succeeded at the auth service but belongs to no admin: end that
 * session at the service (with the token cookie the sign-in just set — it is not
 * on the incoming request) and drop the cookies, rather than leave a signed-in,
 * non-admin session sitting in the browser.
 */
async function discardFreshSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_TOKEN_COOKIE)?.value
  const baseUrl = process.env.NEON_AUTH_BASE_URL
  if (token && baseUrl) {
    const origin = (await headers()).get('origin') ?? ''
    await fetch(`${baseUrl.replace(/\/+$/, '')}/sign-out`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_TOKEN_COOKIE}=${token}`, Origin: origin, 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => undefined)
  }
  store.delete(SESSION_TOKEN_COOKIE)
  store.delete(SESSION_DATA_COOKIE)
}

export async function adminSignIn(formData: FormData): Promise<SignInResult> {
  bindRequestId(await getRequestId())
  const email = String(formData.get('email') ?? '').trim().slice(0, 254)
  const password = String(formData.get('password') ?? '').slice(0, 1024)

  const auth = getNeonAuth()
  if (!auth || !getDbClient()) {
    return { ok: false, code: 'not-configured' }
  }

  if (!email || !password) {
    return { ok: false, code: 'invalid-credentials' }
  }

  // Phase 23: attempts are limited per address, per e-mail and overall BEFORE the
  // password is checked, so a guessing run gets nothing back but this. Neon Auth
  // has its own limits too; ours also bound the audit rows an attacker can cause.
  // One audit row when a limit is first crossed — never one per refused attempt,
  // and never carrying the attacker's text.
  const attempts = await checkRateLimit('admin.sign-in', { subject: email })
  if (!attempts.ok) {
    if (attempts.hits === attempts.limit + 1) {
      await writeAuditLog({ actor: 'system', action: 'admin.sign_in_rate_limited', entity: 'admin_session', after: { dimension: attempts.dimension } })
    }
    return { ok: false, code: 'rate-limited' }
  }

  const { data: signedIn, error: signInError } = await auth.signIn.email({ email, password })
  const user = (signedIn as { user?: { id: string; email?: string | null } } | null)?.user
  if (signInError || !user?.id) {
    await writeAuditLog({ actor: email, action: 'admin.sign_in_failed', entity: 'admin_session' })
    return { ok: false, code: 'invalid-credentials' }
  }

  // A new session has no second-factor proof yet, whatever an old cookie says.
  await clearSessionVerified()

  // A real Neon Auth session now exists — but only a matching `admin_users`
  // row makes this a real admin. The new session's id is not needed here: a
  // session this fresh has not passed a code challenge in any case.
  const session = await resolveAdminSession({ user, session: { id: '' } })
  if (!session) {
    await discardFreshSession()
    await writeAuditLog({ actor: email, action: 'admin.sign_in_rejected_not_admin', entity: 'admin_session' })
    return { ok: false, code: 'invalid-credentials' }
  }

  await writeAuditLog({
    actor: session.userId,
    action: 'admin.sign_in_succeeded',
    entity: 'admin_session',
    after: { role: session.role },
  })

  if (!mfaSatisfied(session)) {
    return { ok: true, next: mfaDestination(session) }
  }

  return { ok: true, next: 'dashboard' }
}

type TotpRow = { totp_secret: string | null; totp_pending_secret: string | null; totp_enrolled_at: string | null; totp_last_step: number | null }

async function loadTotpRow(userId: string): Promise<TotpRow | null> {
  const db = getDbClient()
  if (!db) return null
  const { data } = await db
    .from('admin_users')
    .select('totp_secret, totp_pending_secret, totp_enrolled_at, totp_last_step')
    .eq('id', userId)
    .maybeSingle()
  return (data as TotpRow | null) ?? null
}

export type MfaChallengeResult =
  | { ok: false; code: 'not-configured' | 'no-factor' | 'invalid-code' | 'rate-limited' }
  | { ok: true }

/** For `/admin/mfa-challenge` — verifying a factor that's already enrolled from an earlier session. */
export async function verifyMfaChallenge(formData: FormData): Promise<MfaChallengeResult> {
  bindRequestId(await getRequestId())
  const code = String(formData.get('code') ?? '').trim()

  const db = getDbClient()
  if (!getNeonAuth() || !db || !totpConfigured()) {
    return { ok: false, code: 'not-configured' }
  }

  const session = await getAdminSession()
  // Phase 23: a six-digit code has a million values — the attempts are what protect it.
  // Limited per address and per signed-in user; the user id is the second dimension
  // (this step only exists for someone who already passed the password).
  const attempts = await checkRateLimit('admin.mfa', { subject: session?.userId ?? null })
  if (!attempts.ok) {
    return { ok: false, code: 'rate-limited' }
  }
  if (!session) {
    return { ok: false, code: 'no-factor' }
  }

  const row = await loadTotpRow(session.userId)
  const secret = row?.totp_enrolled_at && row.totp_secret ? decryptSecret(row.totp_secret) : null
  if (!secret) {
    return { ok: false, code: 'no-factor' }
  }

  const step = verifyCode(secret, code, row?.totp_last_step ?? null)
  if (step === null) {
    await writeAuditLog({ actor: session.userId, action: 'admin.mfa_challenge_failed', entity: 'admin_session' })
    return { ok: false, code: 'invalid-code' }
  }

  // Record the step first, conditionally: of two concurrent submissions of the same
  // code, only the one that moves `totp_last_step` forward gets the session upgraded.
  // One plain filter, chosen by what was read — not an `.or(…)` logic tree, which the
  // PostgREST the test stack runs (v12.2) turns into invalid SQL on an UPDATE ("column
  // … does not exist"). An enrolled factor always has a last step: enrolling sets it.
  const lastStep = row?.totp_last_step ?? null
  const claim = db.from('admin_users').update({ totp_last_step: step }).eq('id', session.userId)
  const { data: claimed } = await (lastStep === null
    ? claim.is('totp_last_step', null)
    : claim.lt('totp_last_step', step)
  ).select('id')
  if (!claimed || claimed.length === 0) {
    await writeAuditLog({ actor: session.userId, action: 'admin.mfa_challenge_failed', entity: 'admin_session' })
    return { ok: false, code: 'invalid-code' }
  }

  await markSessionVerified(session.userId, session.sessionId, session.sessionExpiresAt)
  await writeAuditLog({ actor: session.userId, action: 'admin.mfa_challenge_succeeded', entity: 'admin_session' })
  return { ok: true }
}

export type MfaEnrollStartResult =
  | { ok: false; code: 'not-configured' | 'forbidden' }
  | { ok: true; factorId: string; qrCodeSvg: string; secret: string }

/**
 * For `/admin/security` — starting TOTP enrollment. Open to both roles as long
 * as the caller is a real, currently-signed-in admin — `forbidden` covers
 * everything else (no session, not an admin). Replacing a factor that is
 * already confirmed requires this session to have passed it first, so a stolen
 * password alone cannot swap the second factor out.
 */
export async function enrollMfaStart(): Promise<MfaEnrollStartResult> {
  if (!getNeonAuth() || !totpConfigured()) {
    return { ok: false, code: 'not-configured' }
  }

  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) {
    return { ok: false, code: 'forbidden' }
  }

  const db = getDbClient()
  if (!db) {
    return { ok: false, code: 'not-configured' }
  }

  const secret = generateSecret()
  const { error } = await db
    .from('admin_users')
    .update({ totp_pending_secret: encryptSecret(secret) })
    .eq('id', session.userId)
  if (error) {
    return { ok: false, code: 'forbidden' }
  }

  const qrCodeSvg = await qrCodeDataUri(otpauthUri(session.email || session.userId, secret))
  return { ok: true, factorId: PENDING_FACTOR_ID, qrCodeSvg, secret }
}

export type MfaEnrollVerifyResult =
  | { ok: false; code: 'not-configured' | 'invalid-code' }
  | { ok: true }

export async function enrollMfaVerify(formData: FormData): Promise<MfaEnrollVerifyResult> {
  const code = String(formData.get('code') ?? '').trim()

  const db = getDbClient()
  if (!getNeonAuth() || !db || !totpConfigured()) {
    return { ok: false, code: 'not-configured' }
  }

  const session = await getAdminSession()
  const attempts = await checkRateLimit('admin.mfa', { subject: session?.userId ?? null })
  if (!attempts.ok || !session || !mfaSatisfied(session)) {
    return { ok: false, code: 'invalid-code' }
  }

  const row = await loadTotpRow(session.userId)
  const pending = row?.totp_pending_secret ? decryptSecret(row.totp_pending_secret) : null
  const step = pending ? verifyCode(pending, code, null) : null

  if (!pending || step === null) {
    await writeAuditLog({ actor: session.userId, action: 'admin.mfa_enroll_failed', entity: 'admin_session', entityId: FACTOR_ID })
    return { ok: false, code: 'invalid-code' }
  }

  const { error } = await db
    .from('admin_users')
    .update({
      totp_secret: row!.totp_pending_secret,
      totp_pending_secret: null,
      totp_enrolled_at: new Date().toISOString(),
      totp_last_step: step,
    })
    .eq('id', session.userId)
  if (error) {
    return { ok: false, code: 'invalid-code' }
  }

  // Confirming the factor with a valid code proves it for this session too.
  await markSessionVerified(session.userId, session.sessionId, session.sessionExpiresAt)
  await writeAuditLog({ actor: session.userId, action: 'admin.mfa_enrolled', entity: 'admin_session', entityId: FACTOR_ID })
  return { ok: true }
}

/**
 * Lets an admin abandon an enrollment they got stuck on (wrong app, lost the
 * QR, etc.) and try again, or remove their confirmed factor. Removing a
 * confirmed factor needs this session to have passed it.
 */
export async function unenrollMfaFactor(factorId: string): Promise<{ ok: boolean }> {
  const session = await getAdminSession()
  if (!session) return { ok: false }

  const db = getDbClient()
  if (!db) return { ok: false }

  if (factorId === PENDING_FACTOR_ID) {
    const { error } = await db.from('admin_users').update({ totp_pending_secret: null }).eq('id', session.userId)
    return { ok: !error }
  }

  if (factorId !== FACTOR_ID || !mfaSatisfied(session)) return { ok: false }

  const { error } = await db
    .from('admin_users')
    .update({ totp_secret: null, totp_pending_secret: null, totp_enrolled_at: null, totp_last_step: null })
    .eq('id', session.userId)
  if (error) return { ok: false }

  await clearSessionVerified()
  await writeAuditLog({
    actor: session.userId,
    action: 'admin.mfa_unenrolled',
    entity: 'admin_session',
    entityId: FACTOR_ID,
  })
  return { ok: true }
}

export async function adminSignOut(locale: string): Promise<void> {
  const auth = getNeonAuth()
  const session = await getAdminSession()

  if (auth) {
    await auth.signOut()
  }
  await clearSessionVerified()
  if (session) {
    await writeAuditLog({ actor: session.userId, action: 'admin.sign_out', entity: 'admin_session' })
  }

  redirect(`/${locale}/admin/login`)
}

/** Re-exported so pages can render "signed in as … (role)" without a second round-trip through a Server Action. */
export type { AdminRole }
