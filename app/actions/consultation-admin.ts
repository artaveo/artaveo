'use server'

import { canAccessLeads, getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { isConsultationId, loadConsultationById } from '@/lib/consultation/queries'
import { cancelConsultationAsOwner, completeConsultation, confirmConsultation } from '@/lib/consultation/service'
import { canonicalTimeZone, zonedWallTimeToUtc } from '@/lib/consultation/time'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { AdminActionResult } from '@/types/consultation'

/**
 * Phase 20 — the owner's Server Actions for consultations. Every one re-checks
 * its own precondition (signed in, MFA satisfied when enrolled, `owner` role) —
 * the same rule `app/actions/pipeline.ts` follows — because consultations are
 * lead data: an editor never reaches them (§ 13, "content only, no leads").
 */

async function requireOwner(): Promise<{ userId: string } | null> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session) || !canAccessLeads(session)) return null
  return { userId: session.userId }
}

/**
 * How the owner picks the time: one of the start times inside a window the
 * client offered (sent as the instant itself), or a time of their own, written
 * as wall-clock in a zone they choose.
 */
export type ConfirmChoice =
  | { kind: 'slot'; start: string }
  | { kind: 'custom'; date: string; time: string; timezone: string }

export async function confirmConsultationAction(
  consultationId: string,
  choice: ConfirmChoice,
  meetingDetails: string,
): Promise<AdminActionResult> {
  const auth = await requireOwner()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (typeof consultationId !== 'string' || !isConsultationId(consultationId)) return { ok: false, code: 'not-found' }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  let start: Date | null = null
  if (choice?.kind === 'slot' && typeof choice.start === 'string') {
    // A slot must be one the client actually offered — a tampered value is not a choice, it is a different request.
    const consultation = await loadConsultationById(supabase, consultationId)
    if (!consultation) return { ok: false, code: 'not-found' }
    const candidate = new Date(choice.start)
    const offered =
      !Number.isNaN(candidate.getTime()) &&
      consultation.windows.some(
        (window) =>
          candidate.getTime() >= new Date(window.start).getTime() &&
          candidate.getTime() + consultation.durationMinutes * 60_000 <= new Date(window.end).getTime(),
      )
    if (!offered) return { ok: false, code: 'invalid' }
    start = candidate
  } else if (choice?.kind === 'custom') {
    const zone = canonicalTimeZone(String(choice.timezone ?? ''))
    if (!zone) return { ok: false, code: 'invalid-timezone' }
    start = zonedWallTimeToUtc(String(choice.date ?? ''), String(choice.time ?? ''), zone)
    if (!start) return { ok: false, code: 'window-nonexistent' }
  }
  if (!start) return { ok: false, code: 'invalid' }

  return confirmConsultation(
    { supabase },
    { consultationId, actor: auth.userId, start, meetingDetails: String(meetingDetails ?? '') },
  )
}

export async function cancelConsultationAction(consultationId: string, reason: string): Promise<AdminActionResult> {
  const auth = await requireOwner()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (typeof consultationId !== 'string' || !isConsultationId(consultationId)) return { ok: false, code: 'not-found' }
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }
  return cancelConsultationAsOwner({ supabase }, { consultationId, actor: auth.userId, reason: String(reason ?? '') })
}

export async function completeConsultationAction(consultationId: string): Promise<AdminActionResult> {
  const auth = await requireOwner()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (typeof consultationId !== 'string' || !isConsultationId(consultationId)) return { ok: false, code: 'not-found' }
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }
  return completeConsultation({ supabase }, { consultationId, actor: auth.userId })
}
