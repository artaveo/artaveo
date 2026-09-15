import type { InquiryLink } from '@/types/inquiry'

/**
 * Lead Pipeline types (roadmap § 14).
 *
 * `InquiryStage` and `ALLOWED_STAGE_TRANSITIONS` mirror
 * `db/migrations/0010_lead_pipeline.sql`'s check constraint and
 * `enforce_inquiry_stage_transition()` trigger exactly — this is the
 * client-side half of the same rule, used to only ever offer a valid next
 * stage in the UI. The database trigger is still the real guard (§ 14:
 * "transitions enforced in the database"); this map exists so the UI
 * doesn't need a round-trip to discover a transition is invalid, not as a
 * substitute for the server-side check `app/actions/pipeline.ts` also
 * performs.
 */
export type InquiryStage =
  | 'new'
  | 'reviewed'
  | 'qualified'
  | 'contacted'
  | 'discovery'
  | 'proposal'
  | 'won'
  | 'lost'
  | 'archived'

export const STAGE_ORDER: InquiryStage[] = [
  'new',
  'reviewed',
  'qualified',
  'contacted',
  'discovery',
  'proposal',
  'won',
  'lost',
  'archived',
]

/** Same graph as the migration's trigger function — keep both in sync. */
export const ALLOWED_STAGE_TRANSITIONS: Record<InquiryStage, InquiryStage[]> = {
  new: ['reviewed', 'lost'],
  reviewed: ['qualified', 'lost'],
  qualified: ['contacted', 'lost'],
  contacted: ['discovery', 'lost'],
  discovery: ['proposal', 'lost'],
  proposal: ['won', 'lost'],
  won: ['archived'],
  lost: ['archived'],
  archived: [],
}

/** Honest, closed vocabulary — matches `inquiries.priority`'s check constraint (0006). */
export type InquiryPriority = 'low' | 'normal' | 'high'
export const PRIORITY_ORDER: InquiryPriority[] = ['low', 'normal', 'high']

/** Matches `inquiry_events.type`'s check constraint (0010). */
export type InquiryEventType =
  | 'created'
  | 'stage-changed'
  | 'note-added'
  | 'priority-changed'
  | 'follow-up-set'
  | 'tags-changed'

export type InquiryEvent = {
  id: string
  createdAt: string
  type: InquiryEventType
  actor: string
  note: string | null
  meta: Record<string, unknown>
}

/** One row of `inquiries`, shaped for the admin pipeline list and detail views. */
export type PipelineInquiry = {
  id: string
  createdAt: string
  serviceSlug: string | null
  packageId: string | null
  engagementModelId: string | null
  projectType: string | null
  goal: string
  featureTags: string[]
  featureOtherNote: string
  timeline: string | null
  budgetBand: string | null
  links: InquiryLink[]
  name: string
  email: string
  phone: string
  preferredLocale: string
  preferredChannel: string
  sourceReferrer: string | null
  sourceUtmSource: string | null
  sourceUtmMedium: string | null
  sourceUtmCampaign: string | null
  sourceChannel: string | null
  stage: InquiryStage
  priority: InquiryPriority
  followUpAt: string | null
  tags: string[]
}

/** `q` matches name or email (case-insensitive substring). */
export type PipelineFilters = {
  stage?: InquiryStage
  priority?: InquiryPriority
  tag?: string
  q?: string
  page: number
  pageSize: number
}

export function emptyPipelineFilters(): PipelineFilters {
  return { page: 1, pageSize: 20 }
}

/**
 * SLA indicator (§ 14: "comparing time-to-first-reply with the published
 * response commitment"). `site_settings.response_commitment` is prose
 * ("Replies within a few hours, same day"), not a stored number of hours
 * — inventing a numeric SLA threshold the owner never set would violate
 * this project's own "no invented content/metrics" rule. This instead
 * operationalizes the one concrete, computable clause the stored text
 * actually makes — "same day" — against the site's configured timezone
 * (`site_settings.timezone`). It does not evaluate the "a few hours"
 * clause, since no stored field expresses that as a number; documented as
 * a known limitation in `docs/phases/PHASE-14-README.md`.
 *
 * There is no real outbound-reply log yet (that is Phase 19/20's scope) —
 * "first reply" is approximated here as the first `inquiry_events` row
 * after `created` (the first time an admin actually did something with
 * the lead: changed its stage, added a note, changed its tags or
 * priority), the closest honest proxy available today.
 */
export type SlaStatus = {
  /** `null` — no admin action recorded yet; the lead is still fully unactioned. */
  firstResponseAt: string | null
  /** `null` when `firstResponseAt` is `null`. */
  metSameDay: boolean | null
}
