import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { LocalizedText } from '@/types/content'

/**
 * Shared between the public `/recommend/[token]` page and
 * `app/actions/recommendations.ts#submitRecommendation` — the one place
 * that resolves a raw token to a real request row. Reached with the
 * service-role client, never through a public RLS policy (§ 16's own
 * migration note: `recommendation_requests` has no public `select`
 * policy at all — the token itself, an unguessable random value, is
 * the access control, the same trust model
 * `app/actions/inquiry-attachments.ts` already uses for its IP-hash
 * check).
 */

export type RequestLinkState =
  | { state: 'not-found' }
  | { state: 'revoked' }
  | { state: 'expired' }
  /** Already submitted and not sent back for changes — nothing left for this visitor to do here. */
  | { state: 'closed' }
  | {
      state: 'open'
      requestId: string
      /** Set only when re-opened via "request change" — the recommender's own previous statement, so they aren't asked to retype it from scratch. */
      priorSubmission: {
        personName: string
        personTitle: string
        company: string
        relationship: string
        /** Whichever locale was non-empty last time — the visitor's current locale is used if neither was. */
        statement: string
        sourceUrl: string
      } | null
      moderationNote: string | null
      suggestedRelatedProjectTitle: LocalizedText | null
      suggestedRelatedServiceTitle: LocalizedText | null
    }

export async function resolveRequestToken(token: string, locale: 'en' | 'fa'): Promise<RequestLinkState> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return { state: 'not-found' }

  const { data: requestRow, error } = await supabase
    .from('recommendation_requests')
    .select(
      'id, expires_at, revoked_at, recommendation_id, ' +
        'suggested_project:projects!recommendation_requests_suggested_related_project_id_fkey(title), ' +
        'suggested_service:services!recommendation_requests_suggested_related_service_id_fkey(title)',
    )
    .eq('token', token)
    .maybeSingle()

  if (error || !requestRow) return { state: 'not-found' }
  const request = requestRow as any

  if (request.revoked_at) return { state: 'revoked' }
  if (request.expires_at && new Date(request.expires_at).getTime() < Date.now()) return { state: 'expired' }

  if (!request.recommendation_id) {
    return {
      state: 'open',
      requestId: request.id,
      priorSubmission: null,
      moderationNote: null,
      suggestedRelatedProjectTitle: request.suggested_project?.title ?? null,
      suggestedRelatedServiceTitle: request.suggested_service?.title ?? null,
    }
  }

  const { data: recRow } = await supabase
    .from('recommendations')
    .select('person_name, person_title, company, relationship, statement, source_url, status, moderation_note')
    .eq('id', request.recommendation_id)
    .maybeSingle()
  const rec = recRow as any

  if (!rec) {
    // Data inconsistency (the linked row was deleted) — treat like an unused link rather than crash the page.
    return {
      state: 'open',
      requestId: request.id,
      priorSubmission: null,
      moderationNote: null,
      suggestedRelatedProjectTitle: request.suggested_project?.title ?? null,
      suggestedRelatedServiceTitle: request.suggested_service?.title ?? null,
    }
  }

  if (rec.status !== 'changes-requested') return { state: 'closed' }

  const statement: LocalizedText = rec.statement
  return {
    state: 'open',
    requestId: request.id,
    priorSubmission: {
      personName: rec.person_name ?? '',
      personTitle: rec.person_title ?? '',
      company: rec.company ?? '',
      relationship: rec.relationship ?? '',
      statement: statement?.[locale] || statement?.en || statement?.fa || '',
      sourceUrl: rec.source_url ?? '',
    },
    moderationNote: rec.moderation_note ?? null,
    suggestedRelatedProjectTitle: request.suggested_project?.title ?? null,
    suggestedRelatedServiceTitle: request.suggested_service?.title ?? null,
  }
}

export function generateRequestToken(): string {
  // 24 random bytes as base64url — unguessable, URL-safe, no padding to strip.
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}
