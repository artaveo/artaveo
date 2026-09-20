import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ilikeAnyOf } from '@/lib/postgrest'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { LocalizedText } from '@/types/content'
import type { InquiryEvent, PipelineFilters, PipelineInquiry, SlaStatus } from '@/types/pipeline'

/** Maps a raw `inquiries` row (snake_case, from Supabase) to `PipelineInquiry`. */
function mapInquiryRow(row: Record<string, unknown>): PipelineInquiry {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    serviceSlug: (row.service_slug as string | null) ?? null,
    packageId: (row.package_id as string | null) ?? null,
    engagementModelId: (row.engagement_model_id as string | null) ?? null,
    projectType: (row.project_type as string | null) ?? null,
    goal: row.goal as string,
    featureTags: (row.feature_tags as string[] | null) ?? [],
    featureOtherNote: (row.feature_other_note as string | null) ?? '',
    timeline: (row.timeline as string | null) ?? null,
    budgetBand: (row.budget_band as string | null) ?? null,
    links: (row.links as { url: string }[] | null)?.map((link, index) => ({ id: String(index), url: link.url })) ?? [],
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? '',
    preferredLocale: row.preferred_locale as string,
    preferredChannel: row.preferred_channel as string,
    sourceReferrer: (row.source_referrer as string | null) ?? null,
    sourceUtmSource: (row.source_utm_source as string | null) ?? null,
    sourceUtmMedium: (row.source_utm_medium as string | null) ?? null,
    sourceUtmCampaign: (row.source_utm_campaign as string | null) ?? null,
    sourceChannel: (row.source_channel as string | null) ?? null,
    stage: row.stage as PipelineInquiry['stage'],
    priority: row.priority as PipelineInquiry['priority'],
    followUpAt: (row.follow_up_at as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
  }
}

function mapEventRow(row: Record<string, unknown>): InquiryEvent {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    type: row.type as InquiryEvent['type'],
    actor: row.actor as string,
    note: (row.note as string | null) ?? null,
    meta: (row.meta as Record<string, unknown> | null) ?? {},
  }
}

export type PipelineListResult = {
  inquiries: PipelineInquiry[]
  total: number
}

/**
 * Lists inquiries for the admin pipeline view. `null` means Supabase
 * isn't configured (D-10 not fully wired in this environment) — callers
 * show the same honest "not configured" state the rest of the admin
 * panel already uses rather than an empty list.
 */
export async function listInquiries(filters: PipelineFilters): Promise<PipelineListResult | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  let query = supabase.from('inquiries').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (filters.stage) {
    query = query.eq('stage', filters.stage)
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters.tag) {
    query = query.contains('tags', [filters.tag])
  }
  if (filters.q) {
    // Phase 23: the term is data, never filter syntax — see lib/postgrest.ts.
    const expression = ilikeAnyOf(['name', 'email'], filters.q)
    if (expression) query = query.or(expression)
  }

  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error || !data) {
    console.error('listInquiries failed:', error)
    return { inquiries: [], total: 0 }
  }

  return { inquiries: data.map(mapInquiryRow), total: count ?? data.length }
}

/**
 * Every inquiry matching `filters`, ignoring pagination — for CSV export
 * (§ 14: "CSV export"), which must reflect the same filtered set the
 * admin is looking at, not just the current page.
 */
export async function listInquiriesForExport(
  filters: Omit<PipelineFilters, 'page' | 'pageSize'>,
): Promise<PipelineInquiry[] | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  let query = supabase.from('inquiries').select('*').order('created_at', { ascending: false })

  if (filters.stage) query = query.eq('stage', filters.stage)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.tag) query = query.contains('tags', [filters.tag])
  if (filters.q) {
    const expression = ilikeAnyOf(['name', 'email'], filters.q)
    if (expression) query = query.or(expression)
  }

  const { data, error } = await query
  if (error || !data) {
    console.error('listInquiriesForExport failed:', error)
    return []
  }
  return data.map(mapInquiryRow)
}

export async function getInquiry(id: string): Promise<PipelineInquiry | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.from('inquiries').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapInquiryRow(data)
}

export async function getInquiryEvents(id: string): Promise<InquiryEvent[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('inquiry_events')
    .select('*')
    .eq('inquiry_id', id)
    .order('created_at', { ascending: true })

  if (error || !data) {
    console.error('getInquiryEvents failed:', error)
    return []
  }
  return data.map(mapEventRow)
}

/** § 14's response commitment source (D-08, `site_settings`). `null` when not configured or not seeded yet. */
export async function getResponseCommitment(): Promise<{ text: LocalizedText; timezone: string } | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.from('site_settings').select('response_commitment, timezone').maybeSingle()
  if (error || !data) return null
  return { text: data.response_commitment as LocalizedText, timezone: data.timezone as string }
}

/**
 * See `types/pipeline.ts#SlaStatus` for what this deliberately does and
 * does not measure. "First response" is the first event after `created`.
 */
export function computeSla(createdAt: string, events: InquiryEvent[], timezone: string): SlaStatus {
  const firstResponse = events.find(isOwnerAction)
  return computeSlaFromFirstResponse(createdAt, firstResponse?.createdAt ?? null, timezone)
}

/**
 * Phase 20: an event counts as the owner responding only when someone other than
 * the system or the client itself wrote it. A consultation request's automatic
 * events and the client's own cancel/reschedule are not a reply.
 */
export function isOwnerAction(event: Pick<InquiryEvent, 'type' | 'actor'>): boolean {
  return event.type !== 'created' && event.actor !== 'system' && event.actor !== 'client'
}

/** Same computation as `computeSla`, for callers that already resolved a first-response timestamp (e.g. the list page's batched `getFirstResponseTimes`). */
export function computeSlaFromFirstResponse(
  createdAt: string,
  firstResponseAt: string | null,
  timezone: string,
): SlaStatus {
  if (!firstResponseAt) {
    return { firstResponseAt: null, metSameDay: null }
  }

  const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC' })
  const createdDayKey = dayKeyFormatter.format(new Date(createdAt))
  const respondedDayKey = dayKeyFormatter.format(new Date(firstResponseAt))

  return { firstResponseAt, metSameDay: createdDayKey === respondedDayKey }
}

/**
 * First non-`created` event timestamp per inquiry id, for the list view's
 * SLA column — one query for the whole page instead of one per row.
 * Missing keys mean "no admin action recorded yet" (still pending), same
 * as `computeSla`'s `firstResponseAt: null`.
 */
export async function getFirstResponseTimes(inquiryIds: string[]): Promise<Record<string, string>> {
  if (inquiryIds.length === 0) return {}

  const supabase = getSupabaseServerClient()
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('inquiry_events')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .neq('type', 'created')
    .not('actor', 'in', '(system,client)')
    .order('created_at', { ascending: true })

  if (error || !data) return {}

  const firstByInquiry: Record<string, string> = {}
  for (const row of data as { inquiry_id: string; created_at: string }[]) {
    if (!(row.inquiry_id in firstByInquiry)) {
      firstByInquiry[row.inquiry_id] = row.created_at
    }
  }
  return firstByInquiry
}

/** Shared client accessor so `app/actions/pipeline.ts` doesn't import `lib/supabase/server.ts` directly for every mutation. */
export function requireSupabase(): SupabaseClient | null {
  return getSupabaseServerClient()
}
