import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { linkExpired, looksLikeToken } from '@/lib/consultation/windows'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Locale } from '@/types/content'
import type {
  AdminConsultation,
  ConsultationStatus,
  ConsultationView,
  ConsultationWindow,
} from '@/types/consultation'
import { CONSULTATION_STATUSES } from '@/types/consultation'

/**
 * Phase 20 — every read of `consultations`.
 *
 * All of it goes through the service-role client (the table has RLS enabled and
 * no policy). The public reads are keyed by the private token — the token is
 * the access control, the same trust model as `lib/recommendations.ts` — and
 * return only what that client's own page needs: never another client's name or
 * e-mail, never the inquiry, and the owner's meeting details only while there is
 * a call to attend.
 */

type Row = Record<string, unknown>

const INQUIRY_COLUMNS = 'name, email, phone, goal, preferred_locale, preferred_channel, stage'

function asWindows(value: unknown): ConsultationWindow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const entry = item as { start?: unknown; end?: unknown }
    return typeof entry?.start === 'string' && typeof entry?.end === 'string'
      ? [{ start: entry.start, end: entry.end }]
      : []
  })
}

export function mapConsultationRow(row: Row): ConsultationView {
  return {
    id: row.id as string,
    inquiryId: row.inquiry_id as string,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? (row.created_at as string),
    status: row.status as ConsultationStatus,
    locale: (row.locale as Locale) ?? 'en',
    timezone: row.timezone as string,
    durationMinutes: (row.duration_minutes as number | null) ?? 30,
    windows: asWindows(row.requested_windows),
    confirmedStart: (row.confirmed_start as string | null) ?? null,
    confirmedEnd: (row.confirmed_end as string | null) ?? null,
    confirmedAt: (row.confirmed_at as string | null) ?? null,
    meetingDetails: (row.meeting_details as string | null) ?? null,
    rescheduleRequests: (row.reschedule_requests as number | null) ?? 0,
    cancelledBy: (row.cancelled_by as 'client' | 'owner' | null) ?? null,
    cancelReason: (row.cancel_reason as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    sequence: (row.sequence as number | null) ?? 0,
  }
}

type InquiryEmbed = {
  name: string
  email: string
  phone: string | null
  goal: string
  preferred_locale: string
  preferred_channel: string
  stage: string
}

function mapAdminRow(row: Row): AdminConsultation {
  const inquiry = (row.inquiry as InquiryEmbed | null) ?? {
    name: '',
    email: '',
    phone: '',
    goal: '',
    preferred_locale: 'en',
    preferred_channel: 'email',
    stage: 'new',
  }
  return {
    ...mapConsultationRow(row),
    token: row.token as string,
    inquiry: {
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone ?? '',
      goal: inquiry.goal,
      preferredLocale: inquiry.preferred_locale,
      preferredChannel: inquiry.preferred_channel,
      stage: inquiry.stage,
    },
  }
}

/** A consultation together with the client it belongs to — what the service layer works from. */
export async function loadConsultationByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<AdminConsultation | null> {
  if (!looksLikeToken(token)) return null
  const { data, error } = await supabase
    .from('consultations')
    .select(`*, inquiry:inquiries(${INQUIRY_COLUMNS})`)
    .eq('token', token)
    .maybeSingle()
  if (error) {
    console.error('loadConsultationByToken failed:', error)
    return null
  }
  return data ? mapAdminRow(data) : null
}

export async function loadConsultationById(supabase: SupabaseClient, id: string): Promise<AdminConsultation | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`*, inquiry:inquiries(${INQUIRY_COLUMNS})`)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('loadConsultationById failed:', error)
    return null
  }
  return data ? mapAdminRow(data) : null
}

/** What `/consultation/[token]` may show. Note what is missing: id, inquiry, sequence, the token itself. */
export type PublicConsultation = Pick<
  ConsultationView,
  | 'status'
  | 'locale'
  | 'timezone'
  | 'durationMinutes'
  | 'windows'
  | 'confirmedStart'
  | 'confirmedEnd'
  | 'meetingDetails'
  | 'rescheduleRequests'
  | 'cancelledBy'
  | 'closedAt'
>

export type ConsultationLinkState =
  | { state: 'not-found' }
  | { state: 'expired' }
  | { state: 'ok'; consultation: PublicConsultation }

/** Shapes a row for a client's page — the one place that decides what a client is allowed to see. */
export function toPublicConsultation(view: ConsultationView): PublicConsultation {
  const callStillStands = view.status === 'confirmed' || view.status === 'rescheduled'
  return {
    status: view.status,
    locale: view.locale,
    timezone: view.timezone,
    durationMinutes: view.durationMinutes,
    windows: view.windows,
    confirmedStart: view.status === 'completed' || view.status === 'cancelled' ? null : view.confirmedStart,
    confirmedEnd: view.status === 'completed' || view.status === 'cancelled' ? null : view.confirmedEnd,
    // How to join is only useful — and only shared — while there is a call to join.
    meetingDetails: callStillStands ? view.meetingDetails : null,
    rescheduleRequests: view.rescheduleRequests,
    cancelledBy: view.cancelledBy,
    closedAt: view.closedAt,
  }
}

export async function resolveConsultationToken(token: string, now: Date = new Date()): Promise<ConsultationLinkState> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return { state: 'not-found' }

  const row = await loadConsultationByToken(supabase, token)
  if (!row) return { state: 'not-found' }
  if (linkExpired(row, now)) return { state: 'expired' }
  return { state: 'ok', consultation: toPublicConsultation(row) }
}

// ── admin ────────────────────────────────────────────────────────────────

export const CONSULTATIONS_PAGE_SIZE = 20

export function parseConsultationStatus(value: string | undefined): ConsultationStatus | undefined {
  return (CONSULTATION_STATUSES as readonly string[]).includes(value ?? '') ? (value as ConsultationStatus) : undefined
}

export async function listConsultations(filters: {
  status?: ConsultationStatus
  page: number
  pageSize?: number
}): Promise<{ consultations: AdminConsultation[]; total: number } | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const pageSize = filters.pageSize ?? CONSULTATIONS_PAGE_SIZE
  let query = supabase
    .from('consultations')
    .select(`*, inquiry:inquiries(${INQUIRY_COLUMNS})`, { count: 'exact' })
    .order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)

  const from = (filters.page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error || !data) {
    console.error('listConsultations failed:', error)
    return { consultations: [], total: 0 }
  }
  return { consultations: data.map(mapAdminRow), total: count ?? data.length }
}

export async function getAdminConsultation(id: string): Promise<AdminConsultation | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  return loadConsultationById(supabase, id)
}

/** Every consultation for one inquiry, newest first — the lead detail page shows them. */
export async function listConsultationsForInquiry(inquiryId: string): Promise<AdminConsultation[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('consultations')
    .select(`*, inquiry:inquiries(${INQUIRY_COLUMNS})`)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })
  if (error || !data) {
    console.error('listConsultationsForInquiry failed:', error)
    return []
  }
  return data.map(mapAdminRow)
}

/** Requests waiting for the owner to confirm a time (new ones, and ones where the client asked for a new time). */
export async function countConsultationsAwaitingOwner(): Promise<number | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { count, error } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .in('status', ['requested', 'rescheduled'])
  if (error) {
    console.error('countConsultationsAwaitingOwner failed:', error)
    return null
  }
  return count ?? 0
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isConsultationId = (value: string) => UUID_PATTERN.test(value)
