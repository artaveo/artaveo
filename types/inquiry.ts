import type { Locale } from '@/types/content'

/**
 * Brief Builder / Inquiry types (roadmap § 9.1, "Start a Project").
 *
 * `InquiryDraft` mirrors the minimal slice of the future `inquiries` table
 * that § 9.2 will persist (principle 9, "typed content mirrors the future
 * database"): field names here are chosen to survive that move unchanged —
 * only the destination (local component state today, a Supabase insert
 * once § 9.2 ships) changes.
 *
 * This phase (9.1) owns the Brief Builder itself: the typed draft, the
 * step flow, per-step validation and the Brief Summary. It does not add a
 * server route, a database table or real persistence — that is § 9.2's
 * scope, gated by its own decisions (D-10, Supabase plan/region). See
 * `components/start/brief-builder.tsx` for how the submit step is wired
 * honestly in the meantime.
 */

/** Honest, closed vocabulary — never invent a value outside this set (§ 16.5). */
export type ProjectTypeId =
  | 'new-website'
  | 'web-app-or-mvp'
  | 'existing-product'
  | 'ongoing-care'
  | 'not-sure'

export type TimelineId = 'asap' | '1-3-months' | '3-6-months' | 'flexible' | 'not-sure'

/**
 * Self-reported budget bucket. Distinct from `Price` (types/content.ts):
 * these are bands the *client* declares about their own budget, not a
 * figure Artaveo publishes about a service — so unlike § 7.2's package
 * prices, this field does not depend on D-04 (pricing transparency)
 * resolving. Optional per § 9.1's own spec ("budget range (optional; ranges
 * per D-04)"); kept as a generic self-report bucket rather than tied to any
 * specific service's pricing, which is the part D-04 still gates.
 */
export type BudgetBandId = 'under-1k' | '1k-5k' | '5k-15k' | '15k-plus' | 'not-sure'

export type PreferredChannelId = 'email' | 'whatsapp'

/** Feature checklist (roadmap § 9.1 step 4, "key features"). */
export type FeatureTagId =
  | 'user-accounts'
  | 'payments'
  | 'admin-dashboard'
  | 'bilingual-rtl'
  | 'cms-content'
  | 'third-party-integrations'
  | 'realtime'
  | 'other'

export type InquiryLink = {
  id: string
  url: string
}

/** The Brief Builder's own draft state — one object, one source of truth for every step. */
export type InquiryDraft = {
  /** Prefilled from `?service=` / `?package=` (roadmap § 9.1). */
  serviceSlug?: string
  packageId?: string
  engagementModelId?: string
  projectType?: ProjectTypeId
  goal: string
  featureTags: FeatureTagId[]
  /** Required only when `featureTags` includes `'other'`. */
  featureOtherNote: string
  timeline?: TimelineId
  budgetBand?: BudgetBandId
  links: InquiryLink[]
  /** § 15's Brief Builder attachments — ids of `media_assets` rows already uploaded via `uploadInquiryAttachment` before submission; linked to the inquiry via `inquiry_attachments` once the inquiry itself is inserted. */
  attachmentMediaIds: string[]
  name: string
  email: string
  /** Optional — only meaningful when `preferredChannel` is `'whatsapp'`. */
  phone: string
  preferredLocale: Locale
  preferredChannel: PreferredChannelId
  consent: boolean
}

export function createEmptyInquiryDraft(locale: Locale): InquiryDraft {
  return {
    serviceSlug: undefined,
    packageId: undefined,
    engagementModelId: undefined,
    projectType: undefined,
    goal: '',
    featureTags: [],
    featureOtherNote: '',
    timeline: undefined,
    budgetBand: undefined,
    links: [],
    attachmentMediaIds: [],
    name: '',
    email: '',
    phone: '',
    preferredLocale: locale,
    preferredChannel: 'email',
    consent: false,
  }
}

/**
 * The Brief Builder's own UI/flow state machine (roadmap § 9.1, merged
 * from the previous revision's separate § 9.5). This is independent of
 * whether § 9.2's persistence exists yet — it is defined in full now so
 * nothing here needs to change shape once the real submit call is wired.
 *
 * `persisted-notification-pending` is reserved for § 9.2 (insert) / § 9.3
 * (outbox notification) — the client cannot honestly reach it before a
 * real insert path exists, so no code path in this phase produces it.
 */
export type BriefBuilderStatus =
  | 'idle'
  | 'editing'
  | 'step-error'
  | 'submitting'
  | 'persisted-notification-pending'
  | 'success'
  | 'server-error'
  | 'rate-limited'
  | 'offline'

export type StepId = 'service' | 'project' | 'scope' | 'timeline' | 'links' | 'contact' | 'review'

/**
 * § 9.2 — Server handling & persistence.
 *
 * Everything below is new in this phase. It is deliberately kept separate
 * from `InquiryDraft`: the draft mirrors the future `inquiries` row
 * (principle 9), while this metadata is submission-time-only (spam
 * signals, idempotency, source attribution) and is never itself a column
 * a visitor's draft would round-trip through.
 */

/**
 * Sent alongside the draft on submit. `honeypot` and `formRenderedAt` are
 * anti-spam signals (§ 9.2: "honeypot + rate limit … + optional
 * privacy-friendly challenge") — a real visitor never fills the honeypot
 * field and never submits faster than a human can read+fill the form.
 * `idempotencyKey` prevents duplicate rows on double-click or retry (§
 * 9.2). Source fields satisfy "source attribution … stored without extra
 * personal data" — referrer/UTM only, nothing about the visitor.
 */
export type InquirySubmissionMeta = {
  idempotencyKey: string
  /** Must be empty for a real submission — see `brief-builder.tsx`'s hidden field. */
  honeypot: string
  /** `Date.now()` when the form/component mounted, compared server-side against submit time. */
  formRenderedAt: number
  sourceReferrer?: string
  sourceUtmSource?: string
  sourceUtmMedium?: string
  sourceUtmCampaign?: string
  sourceChannel?: string
}

/**
 * `not-configured`: D-10 (Supabase plan/region) unresolved — no live
 * project/env vars yet. Distinct from `error` (a real, unexpected failure
 * against a live database) so the UI can be honest about which one
 * happened rather than collapsing both into one generic message.
 * `rejected` covers every anti-spam rejection (honeypot, too-fast, rate
 * limit) under one code on purpose — never tell a caller which specific
 * check tripped (that would help a bot adapt).
 * `invalid` means the server's own re-validation (`validateAllSteps`)
 * failed — the client should never be able to reach this in practice
 * since it validates the same way first, but the server never trusts
 * that alone (§ 9.2: "server re-validates everything").
 */
export type InquirySubmissionResult =
  | { ok: true; id: string; replay?: boolean }
  | { ok: false; code: 'not-configured' | 'rejected' | 'invalid' | 'error' }
