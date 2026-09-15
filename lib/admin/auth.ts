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
 * Owner role requires MFA (roadmap § 13); editor does not. `false` means
 * the caller should route to whichever of `/admin/mfa-challenge` (a
 * verified factor exists — needs verifying this session) or
 * `/admin/security` (no factor enrolled yet) `mfaDestination` names —
 * both require the same aal1 session this function already assumes, just
 * not the full aal2 a real admin action needs.
 */
export function mfaSatisfied(session: AdminSession): boolean {
  return session.role !== 'owner' || session.aal.current === 'aal2'
}

export function mfaDestination(session: AdminSession): 'mfa-challenge' | 'security' {
  return session.aal.next === 'aal2' ? 'mfa-challenge' : 'security'
}
