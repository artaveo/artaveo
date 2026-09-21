import { NextResponse } from 'next/server'

import { checkInquiryPath } from '@/lib/observability/health'
import { runWithRequestId } from '@/lib/observability/context'
import { newRequestId } from '@/lib/observability/request-id'

/**
 * "Is the inquiry endpoint up?" (Phase 24). See `lib/observability/health.ts` for what
 * that can honestly mean: everything a submission depends on, checked without
 * submitting one. 200 = a brief would be saved (`degraded: true` = something that
 * guards it is off); 503 = it would not.
 *
 * Public on purpose (the uptime check needs no secret) and therefore minimal: it
 * says which dependency failed by name and how long it took, nothing else — no
 * version, no configuration, no error text. Answers are reused for 15 seconds, so
 * hammering it costs at most one round of checks per instance per interval.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 15

async function respond(body: boolean): Promise<NextResponse> {
  const requestId = newRequestId()
  return runWithRequestId(requestId, async () => {
    const health = await checkInquiryPath()
    const headers = { 'Cache-Control': 'no-store', 'x-request-id': requestId }
    const status = health.ok ? 200 : 503
    return body ? NextResponse.json(health, { status, headers }) : new NextResponse(null, { status, headers })
  })
}

export const GET = () => respond(true)
export const HEAD = () => respond(false)
