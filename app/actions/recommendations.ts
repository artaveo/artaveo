'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveRequestToken } from '@/lib/recommendations'
import { enqueueEvidenceSubmitted } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import type { Locale, LocalizedText } from '@/types/content'
import type { RecommendationSubmissionInput } from '@/types/cms'

/**
 * § 16 — the public half of Verified Evidence: what happens when a
 * recommender opens `/recommend/[token]` and submits. Re-validates
 * everything server-side and applies the same honeypot + minimum
 * fill-time anti-spam check `app/actions/inquiries.ts` established for
 * the Brief Builder — but deliberately no per-IP rate limit (see the
 * comment at step 4 below for why one isn't needed here).
 */

const MIN_FORM_FILL_MS = 2000

export type RecommendationSubmissionResult =
  | { ok: true }
  | { ok: false; code: 'invalid' | 'rejected' | 'not-configured' | 'closed' | 'error' }

function isValidUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export async function submitRecommendation(
  token: string,
  locale: Locale,
  input: RecommendationSubmissionInput,
  meta: { honeypot: string; formRenderedAt: number },
): Promise<RecommendationSubmissionResult> {
  // 1. Anti-spam — same generic 'rejected' code either way, never
  //    signal which check tripped (matches app/actions/inquiries.ts).
  if (meta.honeypot.trim().length > 0) return { ok: false, code: 'rejected' }
  if (Date.now() - meta.formRenderedAt < MIN_FORM_FILL_MS) return { ok: false, code: 'rejected' }

  // 2. Server re-validates every required field — the client already
  //    ran the same checks, but nothing here trusts that alone.
  const personName = input.personName.trim()
  const relationship = input.relationship.trim()
  const statement = input.statement.trim()
  const personTitle = input.personTitle.trim()
  const company = input.company.trim()
  const profileUrl = input.profileUrl.trim()

  if (!personName || !relationship || !statement || !input.consentToPublish) {
    return { ok: false, code: 'invalid' }
  }
  if (!isValidUrl(profileUrl)) return { ok: false, code: 'invalid' }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  // 3. Re-resolve the token server-side rather than trust anything the
  //    client sent about the request's state — the same "server
  //    re-validates" rule § 9.2 established for the Brief Builder.
  const resolved = await resolveRequestToken(token, locale)
  if (resolved.state !== 'open') return { ok: false, code: 'closed' }

  // 4. No separate per-IP rate limit here, unlike the Brief Builder —
  //    deliberately, not an oversight. `/start` is a public, open
  //    endpoint anyone can hammer; this route only does anything once
  //    someone already holds a real, owner-issued, unguessable token
  //    (`generateRequestToken()` — 24 random bytes), and a token that
  //    isn't `'open'` (already used, revoked, expired) is rejected by
  //    `resolveRequestToken` above regardless of how many times it's
  //    tried. The honeypot/fill-time checks above still guard the one
  //    real repeat-submission path that exists — a "request change"
  //    reopening the same link for a genuine resubmission.
  const { data: requestRow, error: requestError } = await supabase
    .from('recommendation_requests')
    .select('id, recommendation_id, suggested_related_project_id, suggested_related_service_id')
    .eq('id', resolved.requestId)
    .maybeSingle()
  if (requestError || !requestRow) return { ok: false, code: 'error' }

  const isResubmission = Boolean(requestRow.recommendation_id)

  if (isResubmission) {
    // Merge into the existing statement so an admin's already-completed
    // translation of the *other* locale survives a resubmission that
    // only ever rewrites the visitor's own language (§ 16: "meaning is
    // never edited" applies to the admin's edits — a resubmission is the
    // recommender's own new wording, always allowed).
    const { data: existing } = await supabase
      .from('recommendations')
      .select('statement')
      .eq('id', requestRow.recommendation_id)
      .maybeSingle()
    const existingStatement = (existing?.statement as LocalizedText | undefined) ?? { en: '', fa: '' }
    const mergedStatement: LocalizedText = { ...existingStatement, [locale]: statement }

    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        person_name: personName,
        person_title: personTitle || null,
        company: company || null,
        relationship,
        statement: mergedStatement,
        source_url: profileUrl || null,
        consent_to_publish: input.consentToPublish,
        status: 'pending',
        moderation_note: null,
      })
      .eq('id', requestRow.recommendation_id)
    if (updateError) return { ok: false, code: 'error' }

    await notifyOwner(supabase, requestRow.recommendation_id as string, {
      personName,
      relationship,
      company: company || null,
      locale,
      resubmission: true,
    })
    return { ok: true }
  }

  const statementValue: LocalizedText = locale === 'en' ? { en: statement, fa: '' } : { en: '', fa: statement }

  const { data: inserted, error: insertError } = await supabase
    .from('recommendations')
    .insert({
      person_name: personName,
      person_title: personTitle || null,
      company: company || null,
      relationship,
      statement: statementValue,
      recommendation_date: new Date().toISOString().slice(0, 10),
      source_url: profileUrl || null,
      verification: 'verified-request',
      related_project_id: requestRow.suggested_related_project_id,
      related_service_id: requestRow.suggested_related_service_id,
      request_id: requestRow.id,
      consent_to_publish: input.consentToPublish,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted) return { ok: false, code: 'error' }

  const { error: touchError } = await supabase
    .from('recommendation_requests')
    .update({ used_at: new Date().toISOString(), recommendation_id: inserted.id })
    .eq('id', requestRow.id)
  if (touchError) {
    console.error('recommendation_requests touch failed (recommendation itself was saved):', touchError)
  }

  await notifyOwner(supabase, inserted.id as string, {
    personName,
    relationship,
    company: company || null,
    locale,
    resubmission: false,
  })
  return { ok: true }
}

/**
 * Phase 19 ("evidence submitted"): tell the owner something is waiting in the
 * moderation queue. Best-effort by the same rule as the Brief Builder's e-mail
 * — the submission is already saved, so a failure here is logged and never
 * changes what the recommender sees. The message carries who and how they know
 * the owner, plus a link; the statement itself stays in the admin, and nothing
 * becomes public without moderation.
 */
async function notifyOwner(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  recommendationId: string,
  input: { personName: string; relationship: string; company: string | null; locale: Locale; resubmission: boolean },
): Promise<void> {
  try {
    const rows = await enqueueEvidenceSubmitted(supabase, {
      recommendationId,
      personName: input.personName,
      relationship: input.relationship,
      company: input.company,
      submittedLocale: input.locale,
      resubmission: input.resubmission,
      submittedAt: new Date().toISOString(),
    })
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
  } catch (err) {
    console.error('evidence notification failed (the recommendation itself was saved):', err)
  }
}
