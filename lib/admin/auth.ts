import 'server-only'
import { cache } from 'react'

import { createAuthServerClient } from '@/lib/supabase/server-auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/** Fixed two-value set — see `db/migrations/0008_admin_and_audit.sql` for why this is a `check` constraint, not a `roles` table. */
export type AdminRole = 'owner' | 'editor'

export type AdminSession = {
  userId: string
  email: string
  role: AdminRole
  aal: {
    current: 'aal1' | 'aal2'
    /** Higher than `current` only when a verified MFA factor exists to step up to. */
    next: 'aal1' | 'aal2'
  }
}

/**
 * Roadmap § 13 — "permissions checked server-side on every action". This
 * is the one authoritative check: an authenticated Supabase user is not
 * an admin by itself — only a matching row in `admin_users` (created by
 * the owner directly; there is no admin sign-up flow) makes them one, and
 * only that row's `role` says which. Every protected page and every admin
 * Server Action calls this itself rather than trusting a layout ran —
 * `cache()` (React, request-scoped) means calling it five times in one
 * request still only hits Supabase once.
 *
 * Returns `null` for: no session, an expired/invalid session, or a real
 * Supabase user with no `admin_users` row (someone with a Supabase Auth
 * account that was never provisioned as an admin). Callers can't tell
 * these apart and don't need to — the required response is identical
 * (treat as signed out), and not distinguishing them avoids leaking which
 * case applies to anyone probing the login flow.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const authClient = await createAuthServerClient()
  if (!authClient) return null

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const serviceClient = getSupabaseServerClient()
  if (!serviceClient) return null

  const { data: adminRow } = await serviceClient
    .from('admin_users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminRow) return null

  const { data: aalData } = await authClient.auth.mfa.getAuthenticatorAssuranceLevel()

  return {
    userId: user.id,
    email: user.email ?? '',
    role: adminRow.role as AdminRole,
    aal: {
      current: (aalData?.currentLevel as 'aal1' | 'aal2' | null) ?? 'aal1',
      next: (aalData?.nextLevel as 'aal1' | 'aal2' | null) ?? 'aal1',
    },
  }
})

/**
 * MFA is optional for both roles — this was mandatory for `owner` per
 * the original § 13 design, but the owner asked (16 September 2026) to
 * make it opt-in instead; see ROAD-MAP-ARTAVEO.md revision 27 for the
 * security trade-off that decision carries. `false` now only means "a
 * verified TOTP factor already exists and Supabase itself expects this
 * session to complete the aal2 challenge" (`aal.next === 'aal2'`, still
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
