import { runWithRequestId } from '@/lib/observability/context'
import { newRequestId } from '@/lib/observability/request-id'
import { NextResponse } from 'next/server'

import { buildConsultationIcs, consultationUid } from '@/lib/consultation/ics'
import { loadConsultationByToken } from '@/lib/consultation/queries'
import { linkExpired, looksLikeToken } from '@/lib/consultation/windows'
import { consultationSummary } from '@/lib/notifications/consultation-templates'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { siteConfig } from '@/lib/site'
import { absoluteUrl } from '@/lib/site-url'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * "Add to calendar" for a confirmed call — a plain download (`METHOD:PUBLISH`,
 * no attendee, nothing to respond to), so it works from the client's private
 * page with no JavaScript and in any calendar app. The invitation e-mailed at
 * confirmation is the interactive one (`METHOD:REQUEST`); both carry the same
 * UID, so importing this after accepting that one updates rather than
 * duplicates.
 *
 * The token is the access control, exactly as on the page itself. Nothing is
 * served unless a time is currently confirmed (`confirmed`, or `rescheduled`
 * while the old time stands), and the file is never cached or indexed.
 */
export const dynamic = 'force-dynamic'

const NOT_FOUND = () =>
  new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

export function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  // Phase 24: outside proxy.ts's matcher, so the route makes its own correlation id.
  return runWithRequestId(newRequestId(), () => handle(context))
}

async function handle({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!looksLikeToken(token)) return NOT_FOUND()

  const supabase = getSupabaseServerClient()
  if (!supabase) return NOT_FOUND()

  // Phase 23: a public GET that costs a database lookup per call.
  const attempts = await checkRateLimit('token.calendar', { subject: token })
  if (!attempts.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(Math.max(1, attempts.retryAfterSeconds)), 'X-Robots-Tag': 'noindex' },
    })
  }

  const consultation = await loadConsultationByToken(supabase, token)
  if (!consultation || linkExpired(consultation, new Date())) return NOT_FOUND()

  const standing =
    (consultation.status === 'confirmed' || consultation.status === 'rescheduled') &&
    consultation.confirmedStart &&
    consultation.confirmedEnd
  if (!standing || !consultation.confirmedStart || !consultation.confirmedEnd) return NOT_FOUND()

  const manageUrl = absoluteUrl(`/${consultation.locale}/consultation/${token}`)
  const details = consultation.meetingDetails?.trim() ?? ''
  const ics = buildConsultationIcs({
    method: 'PUBLISH',
    uid: consultationUid(consultation.id),
    // The latest invitation e-mailed carried `sequence - 1` (the column holds the next one to use).
    sequence: Math.max(0, consultation.sequence - 1),
    start: new Date(consultation.confirmedStart),
    end: new Date(consultation.confirmedEnd),
    summary: consultationSummary(consultation.locale),
    description: `${details}\n${manageUrl}`.trim(),
    location: details,
    url: manageUrl,
    organizer: { email: siteConfig.email, name: 'Zakir Naseri' },
    now: new Date(),
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="artaveo-intro-call.ics"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
