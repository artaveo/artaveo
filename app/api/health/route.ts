import { NextResponse } from 'next/server'

import { newRequestId } from '@/lib/observability/request-id'

/**
 * Liveness (Phase 24): "is the site's code answering?" — no database, no secrets,
 * nothing that can fail for a reason other than the deployment being down. The
 * uptime check calls it first so that "the site is down" and "the database is down"
 * are two different alarms.
 */
export const dynamic = 'force-dynamic'

const headers = () => ({ 'Cache-Control': 'no-store', 'x-request-id': newRequestId() })

export function GET() {
  return NextResponse.json({ ok: true }, { headers: headers() })
}

export function HEAD() {
  return new NextResponse(null, { status: 200, headers: headers() })
}
