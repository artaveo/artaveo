'use server'

import { canAccessLeads, getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { getInquiry, listInquiriesForExport, requireSupabase } from '@/lib/admin/pipeline'
import { ALLOWED_STAGE_TRANSITIONS, type InquiryPriority, type InquiryStage, type PipelineFilters } from '@/types/pipeline'

/**
 * § 14 Server Actions. Every one re-checks its own precondition
 * (signed in, MFA-satisfied, `owner` role) independently — the same "never
 * trust a page-level gate" rule `app/actions/admin-auth.ts` already
 * follows — and writes an `audit_log` row for every real mutation.
 */

export type PipelineActionResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid-transition' | 'error' }
  | { ok: true }

async function requireOwnerSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session) || !canAccessLeads(session)) {
    return { code: 'forbidden' }
  }
  return { userId: session.userId }
}

export async function transitionInquiryStage(inquiryId: string, nextStage: InquiryStage): Promise<PipelineActionResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const current = await getInquiry(inquiryId)
  if (!current) return { ok: false, code: 'error' }

  // Same graph the database trigger enforces — checked here too so the
  // client gets an honest, specific `invalid-transition` code instead of
  // a generic Postgres error string.
  if (!ALLOWED_STAGE_TRANSITIONS[current.stage].includes(nextStage)) {
    return { ok: false, code: 'invalid-transition' }
  }

  const { error } = await supabase.from('inquiries').update({ stage: nextStage }).eq('id', inquiryId)
  if (error) {
    // The trigger itself rejected it (e.g. a race with another admin) —
    // still an honest invalid-transition, not a generic error.
    if (error.code === '23514') return { ok: false, code: 'invalid-transition' }
    return { ok: false, code: 'error' }
  }

  await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'stage-changed',
    actor: auth.userId,
    meta: { from: current.stage, to: nextStage },
  })

  await writeAuditLog({
    actor: auth.userId,
    action: 'pipeline.stage_changed',
    entity: 'inquiry',
    entityId: inquiryId,
    before: { stage: current.stage },
    after: { stage: nextStage },
  })

  return { ok: true }
}

export async function updateInquiryPriority(inquiryId: string, priority: InquiryPriority): Promise<PipelineActionResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const current = await getInquiry(inquiryId)
  if (!current) return { ok: false, code: 'error' }

  const { error } = await supabase.from('inquiries').update({ priority }).eq('id', inquiryId)
  if (error) return { ok: false, code: 'error' }

  await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'priority-changed',
    actor: auth.userId,
    meta: { from: current.priority, to: priority },
  })
  await writeAuditLog({
    actor: auth.userId,
    action: 'pipeline.priority_changed',
    entity: 'inquiry',
    entityId: inquiryId,
    before: { priority: current.priority },
    after: { priority },
  })

  return { ok: true }
}

/** `followUpAt` — ISO date string, or `null` to clear it. */
export async function updateInquiryFollowUp(inquiryId: string, followUpAt: string | null): Promise<PipelineActionResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('inquiries').update({ follow_up_at: followUpAt }).eq('id', inquiryId)
  if (error) return { ok: false, code: 'error' }

  await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'follow-up-set',
    actor: auth.userId,
    meta: { followUpAt },
  })
  await writeAuditLog({
    actor: auth.userId,
    action: 'pipeline.follow_up_set',
    entity: 'inquiry',
    entityId: inquiryId,
    after: { followUpAt },
  })

  return { ok: true }
}

export async function updateInquiryTags(inquiryId: string, tags: string[]): Promise<PipelineActionResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 32),
    ),
  ).slice(0, 20)

  const { error } = await supabase.from('inquiries').update({ tags: normalized }).eq('id', inquiryId)
  if (error) return { ok: false, code: 'error' }

  await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'tags-changed',
    actor: auth.userId,
    meta: { tags: normalized },
  })
  await writeAuditLog({
    actor: auth.userId,
    action: 'pipeline.tags_changed',
    entity: 'inquiry',
    entityId: inquiryId,
    after: { tags: normalized },
  })

  return { ok: true }
}

export async function addInquiryNote(inquiryId: string, note: string): Promise<PipelineActionResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const trimmed = note.trim()
  if (!trimmed) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'note-added',
    actor: auth.userId,
    note: trimmed,
  })
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'pipeline.note_added', entity: 'inquiry', entityId: inquiryId })

  return { ok: true }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const CSV_COLUMNS = [
  'id',
  'created_at',
  'name',
  'email',
  'phone',
  'stage',
  'priority',
  'follow_up_at',
  'tags',
  'service_slug',
  'package_id',
  'engagement_model_id',
  'source_channel',
  'preferred_channel',
  'goal',
] as const

export type CsvExportResult = { ok: false; code: 'forbidden' | 'not-configured' } | { ok: true; csv: string }

/** § 14: "CSV export; no fake dashboards or invented business metrics" — every column here is a real `inquiries` field, nothing computed or aggregated. */
export async function exportInquiriesCsv(filters: Omit<PipelineFilters, 'page' | 'pageSize'>): Promise<CsvExportResult> {
  const auth = await requireOwnerSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const rows = await listInquiriesForExport(filters)
  if (rows === null) return { ok: false, code: 'not-configured' }

  await writeAuditLog({ actor: auth.userId, action: 'pipeline.csv_exported', entity: 'inquiry' })

  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.createdAt,
        row.name,
        row.email,
        row.phone,
        row.stage,
        row.priority,
        row.followUpAt ?? '',
        row.tags.join(';'),
        row.serviceSlug ?? '',
        row.packageId ?? '',
        row.engagementModelId ?? '',
        row.sourceChannel ?? '',
        row.preferredChannel,
        row.goal,
      ]
        .map((value) => csvEscape(String(value)))
        .join(','),
    )
  }

  return { ok: true, csv: lines.join('\r\n') }
}
