'use server'

import { bindRequestId, getRequestId } from '@/lib/observability/context'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveRequestToken } from '@/lib/recommendations'
import { enqueueEvidenceSubmitted } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import type { Locale, LocalizedText } from '@/types/content'
import type { RecommendationSubmissionInput } from '@/types/cms'
import { captureError, track } from '@/lib/observability/store'

/**
 * § 16 — the public half of Verified Evidence: what happens when a
 * recommender opens `/recommend/[token]` and submits. Re-validates
 * everything server-side and applies the same honeypot + minimum
 * fill-time anti-spam check `app/actions/inquiries.ts` established for
 * the Brief Builder. Phase 23 added an attempt limit per address, per link
 * and overall (`recommendation.submit`) — see step 1b.
 */

// Every argument of a Server Action is untrusted input, whatever its TypeScript type says.
const MAX_NAME = 120
const MAX_STATEMENT = 3000
const MAX_URL = 500


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
  bindRequestId(await getRequestId())
  // 1. Anti-spam — same generic 'rejected' code either way, never
  //    signal which check tripped (matches app/actions/inquiries.ts).
  if (meta.honeypot.trim().length > 0) return { ok: false, code: 'rejected' }
  if (Date.now() - meta.formRenderedAt < MIN_FORM_FILL_MS) return { ok: false, code: 'rejected' }

  // 1b. Phase 23 — attempt limits, before any lookup. The token is the second
  //     dimension: one link cannot be hammered from many addresses either.
  //     (The old note here said no limit was needed because the token is
  //     unguessable — true for guessing, not for cost: every attempt with ANY
  //     string still cost a database lookup.)
  if (typeof token !== 'string' || token.length > 200) return { ok: false, code: 'closed' }
  const attempts = await checkRateLimit('recommendation.submit', { subject: token })
  if (!attempts.ok) return { ok: false, code: 'rejected' }

  if (
    !input ||
    [input.personName, input.relationship, input.statement, input.personTitle, input.company, input.profileUrl].some(
      (value) => typeof value !== 'string',
    )
  ) {
    return { ok: false, code: 'invalid' }
  }

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
  if (
    personName.length > MAX_NAME ||
    relationship.length > MAX_NAME ||
    personTitle.length > MAX_NAME ||
    company.length > MAX_NAME ||
    statement.length > MAX_STATEMENT ||
    profileUrl.length > MAX_URL
  ) {
    return { ok: false, code: 'invalid' }
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  // 3. Re-resolve the token server-side rather than trust anything the
  //    client sent about the request's state — the same "server
  //    re-validates" rule § 9.2 established for the Brief Builder.
  const resolved = await resolveRequestToken(token, locale)
  if (resolved.state !== 'open') return { ok: false, code: 'closed' }

  // 4. The request row this token belongs to.
  const { data: requestRow, error: requestError } = await supabase
    .from('recommendation_requests')
    .select('id, recommendation_id, suggested_related_project_id, suggested_related_service_id')
    .eq('id', resolved.requestId)
    .maybeSingle()
  if (requestError) await captureError(requestError, { event: 'recommendation.request_lookup_failed', source: 'action', route: '/[locale]/recommend/[token]', supabase })
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
    if (updateError) {
      await captureError(updateError, { event: 'recommendation.update_failed', source: 'action', route: '/[locale]/recommend/[token]', supabase })
      return { ok: false, code: 'error' }
    }

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

  if (insertError || !inserted) {
    await captureError(insertError ?? new Error('insert returned no row'), { event: 'recommendation.persist_failed', source: 'action', route: '/[locale]/recommend/[token]', fields: { consequence: 'the statement was NOT saved' }, supabase })
    return { ok: false, code: 'error' }
  }

  const { error: touchError } = await supabase
    .from('recommendation_requests')
    .update({ used_at: new Date().toISOString(), recommendation_id: inserted.id })
    .eq('id', requestRow.id)
  if (touchError) {
    await captureError(touchError, { event: 'recommendation.request_touch_failed', source: 'database', level: 'warn', fields: { consequence: 'the recommendation itself was saved' } })
  }

  await notifyOwner(supabase, inserted.id as string, {
    personName,
    relationship,
    company: company || null,
    locale,
    resubmission: false,
  })
  await track('evidence.submitted', { subject: { type: 'recommendation', id: inserted.id as string }, data: { locale, resubmission: false }, supabase })
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
    await captureError(err, { event: 'recommendation.owner_notice_failed', source: 'notification', fields: { consequence: 'the recommendation itself was saved' } })
  }
}
