'use server'

import { redirect } from 'next/navigation'

import { createAuthServerClient } from '@/lib/supabase/server-auth'
import { getAdminSession, mfaDestination, mfaSatisfied, type AdminRole } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'

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
 */

export type SignInResult =
  | { ok: false; code: 'not-configured' | 'invalid-credentials' }
  | { ok: true; next: 'mfa-challenge' | 'security' | 'dashboard' }

export async function adminSignIn(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const authClient = await createAuthServerClient()
  if (!authClient) {
    return { ok: false, code: 'not-configured' }
  }

  if (!email || !password) {
    return { ok: false, code: 'invalid-credentials' }
  }

  const { error: signInError } = await authClient.auth.signInWithPassword({ email, password })
  if (signInError) {
    await writeAuditLog({ actor: email, action: 'admin.sign_in_failed', entity: 'admin_session' })
    return { ok: false, code: 'invalid-credentials' }
  }

  // A real Supabase Auth session now exists — but only a matching
  // `admin_users` row makes this a real admin. Reject and immediately
  // sign back out rather than leaving a signed-in, non-admin session
  // sitting in the browser's cookies.
  const session = await getAdminSession()
  if (!session) {
    await authClient.auth.signOut()
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

export type MfaChallengeResult =
  | { ok: false; code: 'not-configured' | 'no-factor' | 'invalid-code' }
  | { ok: true }

/** For `/admin/mfa-challenge` — verifying a factor that's already enrolled from an earlier session. */
export async function verifyMfaChallenge(formData: FormData): Promise<MfaChallengeResult> {
  const code = String(formData.get('code') ?? '').trim()

  const authClient = await createAuthServerClient()
  if (!authClient) {
    return { ok: false, code: 'not-configured' }
  }

  const { data: factorsData } = await authClient.auth.mfa.listFactors()
  const factor = factorsData?.totp?.[0]
  if (!factor) {
    return { ok: false, code: 'no-factor' }
  }

  const { error } = await authClient.auth.mfa.challengeAndVerify({ factorId: factor.id, code })

  const session = await getAdminSession()
  const actor = session?.userId ?? 'unknown'

  if (error) {
    await writeAuditLog({ actor, action: 'admin.mfa_challenge_failed', entity: 'admin_session' })
    return { ok: false, code: 'invalid-code' }
  }

  await writeAuditLog({ actor, action: 'admin.mfa_challenge_succeeded', entity: 'admin_session' })
  return { ok: true }
}

export type MfaEnrollStartResult =
  | { ok: false; code: 'not-configured' | 'forbidden' }
  | { ok: true; factorId: string; qrCodeSvg: string; secret: string }

/**
 * For `/admin/security` — starting TOTP enrollment. Open to both roles
 * (owner: mandatory per § 13; editor: optional, offered as good
 * practice) as long as the caller is a real, currently-signed-in admin —
 * `forbidden` covers everything else (no session, not an admin).
 */
export async function enrollMfaStart(): Promise<MfaEnrollStartResult> {
  const authClient = await createAuthServerClient()
  if (!authClient) {
    return { ok: false, code: 'not-configured' }
  }

  const session = await getAdminSession()
  if (!session) {
    return { ok: false, code: 'forbidden' }
  }

  const { data, error } = await authClient.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator app',
  })
  if (error || !data) {
    return { ok: false, code: 'forbidden' }
  }

  return { ok: true, factorId: data.id, qrCodeSvg: data.totp.qr_code, secret: data.totp.secret }
}

export type MfaEnrollVerifyResult =
  | { ok: false; code: 'not-configured' | 'invalid-code' }
  | { ok: true }

export async function enrollMfaVerify(formData: FormData): Promise<MfaEnrollVerifyResult> {
  const factorId = String(formData.get('factorId') ?? '')
  const code = String(formData.get('code') ?? '').trim()

  const authClient = await createAuthServerClient()
  if (!authClient) {
    return { ok: false, code: 'not-configured' }
  }

  const { error } = await authClient.auth.mfa.challengeAndVerify({ factorId, code })

  const session = await getAdminSession()
  const actor = session?.userId ?? 'unknown'

  if (error) {
    await writeAuditLog({ actor, action: 'admin.mfa_enroll_failed', entity: 'admin_session', entityId: factorId })
    return { ok: false, code: 'invalid-code' }
  }

  await writeAuditLog({ actor, action: 'admin.mfa_enrolled', entity: 'admin_session', entityId: factorId })
  return { ok: true }
}

/** Lets an owner abandon a factor they started enrolling but got stuck on (wrong app, lost the QR, etc.) and try again. */
export async function unenrollMfaFactor(factorId: string): Promise<{ ok: boolean }> {
  const authClient = await createAuthServerClient()
  if (!authClient) return { ok: false }

  const session = await getAdminSession()
  if (!session) return { ok: false }

  const { error } = await authClient.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false }

  await writeAuditLog({
    actor: session.userId,
    action: 'admin.mfa_unenrolled',
    entity: 'admin_session',
    entityId: factorId,
  })
  return { ok: true }
}

export async function adminSignOut(locale: string): Promise<void> {
  const authClient = await createAuthServerClient()
  const session = await getAdminSession()

  if (authClient) {
    await authClient.auth.signOut()
  }
  if (session) {
    await writeAuditLog({ actor: session.userId, action: 'admin.sign_out', entity: 'admin_session' })
  }

  redirect(`/${locale}/admin/login`)
}

/** Re-exported so pages can render "signed in as … (role)" without a second round-trip through a Server Action. */
export type { AdminRole }
