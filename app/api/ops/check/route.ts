import { NextResponse } from 'next/server'

import { evaluateAlerts, raiseAlerts } from '@/lib/observability/alerts'
import { runWithRequestId } from '@/lib/observability/context'
import { checkDatabase } from '@/lib/observability/health'
import { log } from '@/lib/observability/logger'
import { newRequestId } from '@/lib/observability/request-id'
import { track } from '@/lib/observability/store'
import { checkCronAuth } from '@/lib/security/cron-auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * The external check's endpoint (Phase 24): `Authorization: Bearer $CRON_SECRET`.
 * Called every 15 minutes by `.github/workflows/uptime.yml` — from OUTSIDE the site,
 * which is the point: a site cannot report its own outage.
 *
 * It does three things and says what it found:
 *  1. reads the database (if it cannot, the answer is `failing` — it never reports
 *     "all clear" because it could not look);
 *  2. records that the check ran (`monitor.checked`) — the `monitor.silent` alert is
 *     the absence of this row, so a switched-off schedule does not go unnoticed;
 *  3. evaluates the alert rules and e-mails the owner about any `error` alert not yet
 *     e-mailed today (`?raise=0` evaluates without e-mailing).
 *
 * `status`: `failing` = an error-level alert is firing or the database is
 * unreachable; `degraded` = only warnings; `ok`. The workflow fails on `failing`,
 * which is what makes GitHub e-mail the owner — a channel that works even while the
 * site's own e-mail (still log-only until D-01) does not.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export function GET(request: Request) {
  const requestId = newRequestId()
  return runWithRequestId(requestId, async () => {
    const response = await handle(request)
    response.headers.set('x-request-id', requestId)
    response.headers.set('Cache-Control', 'no-store')
    return response
  })
}

async function handle(request: Request): Promise<NextResponse> {
  const auth = checkCronAuth(request)
  if (auth === 'not-configured') {
    log.error('ops.check_secret_not_configured', { consequence: 'the external check cannot authenticate: set CRON_SECRET in Vercel and redeploy' })
    return NextResponse.json({ ok: false, status: 'failing', error: 'cron-secret-not-configured' }, { status: 401 })
  }
  if (auth === 'unauthorized') return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const supabase = getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ ok: false, status: 'failing', error: 'not-configured' }, { status: 503 })

  const url = new URL(request.url)
  const database = await checkDatabase(supabase)
  if (!database.ok) {
    log.error('ops.check_database_down', { ms: database.ms })
    return NextResponse.json({ ok: false, status: 'failing', database }, { status: 503 })
  }

  // Only a caller that names itself is a monitor; a person testing the URL by hand is not.
  const probe = url.searchParams.get('probe')
  if (probe && /^[a-z][a-z0-9-]{0,30}$/.test(probe)) {
    await track('monitor.checked', { data: { probe }, dedupeSeconds: 60, supabase })
  }

  const { facts, alerts } = await evaluateAlerts(supabase)
  const raised = url.searchParams.get('raise') === '0' ? { raised: [], alreadySent: [] } : await raiseAlerts(supabase, alerts)

  const status = alerts.some((alert) => alert.severity === 'error') ? 'failing' : alerts.length > 0 ? 'degraded' : 'ok'
  return NextResponse.json({
    ok: true,
    status,
    database,
    alerts: alerts.map((alert) => ({ id: alert.id, severity: alert.severity, count: alert.count })),
    raised: raised.raised,
    lastCronAt: facts.events.lastCronAt,
  })
}
