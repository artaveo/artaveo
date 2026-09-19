import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { REDACTED_MARKER } from '@/lib/notifications/outbox'

/**
 * D-14 — how long a recommender's e-mail address is kept.
 *
 * The address exists only so the site can send that person their link and,
 * if the owner asks for one, a request to change their text. It is therefore
 * cleared as soon as the request is finished:
 *
 *  - the link is revoked;
 *  - its recommendation is approved or rejected (the moderation is done);
 *  - the link expired without ever being used;
 *  - the recommendation it produced no longer exists.
 *
 * Clearing has two halves, because the address also lives in the e-mails
 * themselves (`notification_outbox`):
 *  1. `recommendation_requests.recipient_email` (and locale) set to NULL;
 *  2. messages still waiting to go out for that request are deleted (never
 *     send a link that is now dead), and the finished ones have their address
 *     and text overwritten with `REDACTED_MARKER`.
 *
 * The actions do this the moment the event happens; the daily sweep
 * (`sweepRecommendationRecipients`) is the catch-all for whatever cannot be
 * hooked — an expiry, a deleted recommendation, a message that only became
 * finished later. One case is deliberately not covered and is disclosed in the
 * privacy policy: a link with no expiry that is never used or revoked keeps its
 * address until the owner revokes it.
 */

type RequestRow = {
  id: string
  recipient_email: string | null
  revoked_at: string | null
  expires_at: string | null
  used_at: string | null
  recommendation_id: string | null
  recommendations: { status: string } | { status: string }[] | null
}

function recommendationStatus(row: RequestRow): string | null {
  const rec = Array.isArray(row.recommendations) ? row.recommendations[0] : row.recommendations
  return rec?.status ?? null
}

/** Pure — whether a request's address should be gone by `now`. */
export function shouldClearRecipient(row: RequestRow, now: Date): boolean {
  if (!row.recipient_email) return false
  if (row.revoked_at) return true
  const status = recommendationStatus(row)
  if (status === 'approved' || status === 'rejected') return true
  if (row.used_at && !row.recommendation_id) return true
  if (!row.used_at && row.expires_at && new Date(row.expires_at).getTime() < now.getTime()) return true
  return false
}

/**
 * Deletes what has not gone out yet and redacts what has, for one request.
 * Returns how many rows were touched (for the sweep's report).
 */
export async function redactRequestNotifications(supabase: SupabaseClient, requestId: string): Promise<number> {
  let touched = 0

  const { data: deleted, error: deleteError } = await supabase
    .from('notification_outbox')
    .delete()
    .eq('entity_type', 'recommendation_request')
    .eq('entity_id', requestId)
    .in('status', ['pending', 'failed'])
    .select('id')
  if (deleteError) console.error('recommendation-privacy: could not delete unsent messages:', deleteError)
  touched += deleted?.length ?? 0

  const { data: redacted, error: redactError } = await supabase
    .from('notification_outbox')
    .update({ recipient_email: REDACTED_MARKER, body_text: REDACTED_MARKER, reply_to: null })
    .eq('entity_type', 'recommendation_request')
    .eq('entity_id', requestId)
    .in('status', ['sent', 'exhausted'])
    .neq('recipient_email', REDACTED_MARKER)
    .select('id')
  if (redactError) console.error('recommendation-privacy: could not redact finished messages:', redactError)
  touched += redacted?.length ?? 0

  return touched
}

/**
 * Clears one request's address and cleans up its e-mails; returns how many
 * e-mail rows were deleted or redacted. Best-effort: the caller's own change
 * has already happened.
 */
export async function clearRecipientForRequest(supabase: SupabaseClient, requestId: string): Promise<number> {
  try {
    const { error } = await supabase
      .from('recommendation_requests')
      .update({ recipient_email: null, recipient_locale: null })
      .eq('id', requestId)
    if (error) console.error('recommendation-privacy: could not clear the recipient address:', error)
    return await redactRequestNotifications(supabase, requestId)
  } catch (err) {
    console.error('recommendation-privacy: clearing failed:', err)
    return 0
  }
}

/**
 * The daily catch-all. Independent steps, each best-effort:
 *  1. clear the address of every request that is finished by now;
 *  2. redact the finished e-mails of every request whose address is already
 *     gone (a message that only reached a final state after its request did,
 *     or a request row that was deleted).
 */
export async function sweepRecommendationRecipients(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ cleared: number; redacted: number }> {
  let cleared = 0
  let redacted = 0

  const { data: candidates, error } = await supabase
    .from('recommendation_requests')
    .select(
      // Disambiguated: the two tables reference each other, so a bare
      // `recommendations(status)` fails with PGRST201 (see lib/admin/content.ts).
      'id, recipient_email, revoked_at, expires_at, used_at, recommendation_id, ' +
        'recommendations!recommendation_requests_recommendation_id_fkey(status)',
    )
    .not('recipient_email', 'is', null)
  if (error) {
    console.error('recommendation-privacy: sweep could not read requests:', error)
  } else {
    for (const row of (candidates ?? []) as unknown as RequestRow[]) {
      if (!shouldClearRecipient(row, now)) continue
      redacted += await clearRecipientForRequest(supabase, row.id)
      cleared += 1
    }
  }

  // Step 2: finished messages whose request no longer holds an address.
  const { data: leftovers } = await supabase
    .from('notification_outbox')
    .select('entity_id')
    .in('kind', ['recommendation-request', 'recommendation-changes'])
    .in('status', ['sent', 'exhausted'])
    .neq('recipient_email', REDACTED_MARKER)
    .limit(200)

  const requestIds = Array.from(new Set(((leftovers ?? []) as { entity_id: string }[]).map((row) => row.entity_id)))
  if (requestIds.length > 0) {
    const { data: stillHeld } = await supabase
      .from('recommendation_requests')
      .select('id')
      .in('id', requestIds)
      .not('recipient_email', 'is', null)
    const held = new Set(((stillHeld ?? []) as { id: string }[]).map((row) => row.id))
    for (const id of requestIds) {
      if (held.has(id)) continue
      redacted += await redactRequestNotifications(supabase, id)
    }
  }

  return { cleared, redacted }
}
