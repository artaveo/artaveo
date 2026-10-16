import 'server-only'
import { cache } from 'react'

import { getNeonAuth } from '@/lib/auth/server'
import { isSessionVerified } from '@/lib/admin/totp'
import { getDbClient } from '@/lib/db/server'

/** Fixed two-value set — see `db/migrations/0008_admin_and_audit.sql` for why this is a `check` constraint, not a `roles` table. */
export type AdminRole = 'owner' | 'editor'

export type AdminSession = {
  userId: string
  /** The Neon Auth (Better Auth) session this admin session rides on — what the second-factor cookie is bound to. */
  sessionId: string
  sessionExpiresAt: string | null
  email: string
  role: AdminRole
  aal: {
    current: 'aal1' | 'aal2'
    /** Higher than `current` only when a verified TOTP factor exists to step up to. */
    next: 'aal1' | 'aal2'
  }
}

type AuthIdentity = {
  user: { id: string; email?: string | null }
  session: { id: string; expiresAt?: string | Date | null }
}

/**
 * Turns a signed-in Neon Auth identity into an admin session, or `null` when
 * the user has no `admin_users` row. Shared by `getAdminSession` and the
 * sign-in action, which has the identity from the sign-in response itself (the
 * new session cookie is not on the request yet).
 */
export async function resolveAdminSession(identity: AuthIdentity): Promise<AdminSession | null> {
  const db = getDbClient()
  if (!db) return null

  const { data: adminRow } = await db
    .from('admin_users')
    .select('role, totp_enrolled_at')
    .eq('id', identity.user.id)
    .maybeSingle()
  if (!adminRow) return null

  const enrolled = Boolean(adminRow.totp_enrolled_at)
  const verified = enrolled && (await isSessionVerified(identity.user.id, identity.session.id))
  const expiresAt = identity.session.expiresAt

  return {
    userId: identity.user.id,
    sessionId: identity.session.id,
    sessionExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    email: identity.user.email ?? '',
    role: adminRow.role as AdminRole,
    aal: {
      current: verified ? 'aal2' : 'aal1',
      next: enrolled ? 'aal2' : 'aal1',
    },
  }
}

/**
 * Roadmap § 13 — "permissions checked server-side on every action". This
 * is the one authoritative check: a signed-in Neon Auth user is not an admin
 * by itself — only a matching row in `admin_users` (created by the owner
 * directly; there is no admin sign-up flow) makes them one, and only that
 * row's `role` says which. Every protected page and every admin Server
 * Action calls this itself rather than trusting a layout ran — `cache()`
 * (React, request-scoped) means calling it five times in one request still
 * only reaches the auth service and the database once.
 *
 * Returns `null` for: no session, an expired/invalid session, or a real
 * Neon Auth user with no `admin_users` row (an account that was never
 * provisioned as an admin). Callers can't tell these apart and don't need to
 * — the required response is identical (treat as signed out), and not
 * distinguishing them avoids leaking which case applies to anyone probing the
 * login flow.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const auth = getNeonAuth()
  if (!auth) return null

  const { data } = await auth.getSession()
  if (!data?.user || !data.session) return null

  return resolveAdminSession({ user: data.user, session: data.session })
})

/**
 * MFA is optional for both roles — this was mandatory for `owner` per
 * the original § 13 design, but the owner asked (16 September 2026) to
 * make it opt-in instead; see ROAD-MAP-ARTAVEO.md revision 27 for the
 * security trade-off that decision carries. `false` now only means "a
 * verified TOTP factor already exists (`admin_users.totp_enrolled_at`)
 * and this session has not yet passed the code challenge" (`aal.next === 'aal2'`, still
 * `aal1` this session) — real, working two-factor protection for anyone
 * who does enroll, without forcing anyone to. `mfaDestination` in that
 * case is always `/admin/mfa-challenge`; `/admin/security` remains
 * reachable on its own as the voluntary place to enroll or manage a
 * factor, not as something a caller is ever redirected to.
 */
export function mfaSatisfied(session: AdminSession): boolean {
  return session.aal.next !== 'aal2' || session.aal.current === 'aal2'
}

export function mfaDestination(session: AdminSession): 'mfa-challenge' | 'security' {
  return session.aal.next === 'aal2' ? 'mfa-challenge' : 'security'
}

/**
 * Roadmap § 13's own role definition: "roles: `owner`, `editor` (content
 * only, no leads)". Unlike every other admin area, the Lead Pipeline
 * (§ 14) is owner-only — editors get everything else Phase 15 onward
 * adds, but never `/admin/leads`. Every leads page and every pipeline
 * Server Action calls this itself, same "never trust a single gate"
 * pattern `getAdminSession` callers already follow.
 */
export function canAccessLeads(session: AdminSession): boolean {
  return session.role === 'owner'
}

/**
 * Phase 19 — the notification log holds the full text of every e-mail the
 * site produced, including each inquiry's brief and the client's address. That
 * is lead data, so it follows the Lead Pipeline's rule (§ 13: "editor: content
 * only, no leads") and is owner-only, checked by every page and action itself.
 */
export function canAccessNotifications(session: AdminSession): boolean {
  return session.role === 'owner'
}
