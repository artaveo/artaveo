import { NextResponse } from 'next/server'

import { runWithRequestId } from '@/lib/observability/context'
import { log } from '@/lib/observability/logger'
import { newRequestId } from '@/lib/observability/request-id'
import { track } from '@/lib/observability/store'
import { checkCronAuth } from '@/lib/security/cron-auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Phase 25 — where the backup workflow (`.github/workflows/backup.yml`) reports what it
 * did, the same way `.github/workflows/uptime.yml` reports to `/api/ops/check`: a request
 * from OUTSIDE Vercel, authenticated with `Authorization: Bearer $CRON_SECRET` (the same
 * secret the daily run and the uptime check already use — no new server secret).
 *
 * WHY A REPORT ROUTE AND NOT A DIRECT DATABASE WRITE FROM THE WORKFLOW. The workflow needs
 * the Supabase service-role key anyway (to export Storage objects), but writing `ops_events`
 * straight from Actions would mean the *shape* of that table's row is decided in two places
 * (this app and a YAML file) and would skip every check this route enforces (rate limit,
 * length caps, that the event name is one of the four this phase defines). One authenticated
 * POST keeps "what a backup run looked like" defined in one place, same as every other event.
 *
 * WHAT IT DOES NOT DO: it never receives the backup itself, a password, or a connection
 * string — only small, already-redacted facts about a run that happened elsewhere
 * (`docs/runbooks/backup-restore.md`). A forged report (someone else with the secret) could
 * only make the *Backup* health row say something untrue, not touch a backup or the database
 * this app talks to.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const EVENTS = new Set(['completed', 'failed', 'restore_verified', 'restore_failed'])
const STEPS = new Set(['dump', 'storage_export', 'encrypt', 'upload', 'restore', 'row_count_check'])

function str(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined
}

function nonNegativeInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined
}

export function POST(request: Request) {
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
    log.error('ops.backup_report_secret_not_configured', { consequence: 'the backup workflow cannot report in: set CRON_SECRET in Vercel and redeploy' })
    return NextResponse.json({ ok: false, error: 'cron-secret-not-configured' }, { status: 401 })
  }
  if (auth === 'unauthorized') return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 })
  const record = body as Record<string, unknown>

  const event = str(record.event, 30)
  if (!event || !EVENTS.has(event)) return NextResponse.json({ ok: false, error: 'unknown-event' }, { status: 400 })

  const supabase = getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 })

  const step = str(record.step, 30)
  const data: Record<string, unknown> = {
    sizeBytes: nonNegativeInt(record.sizeBytes),
    durationMs: nonNegativeInt(record.durationMs),
    tables: nonNegativeInt(record.tables),
    rowCountsMatch: typeof record.rowCountsMatch === 'boolean' ? record.rowCountsMatch : undefined,
    // A workflow step name only ('dump', 'upload', ...) — never a raw error message, which
    // could echo something from the database this route has no reason to see.
    step: step && STEPS.has(step) ? step : undefined,
  }
  for (const key of Object.keys(data)) if (data[key] === undefined) delete data[key]

  const written = await track(`backup.${event}`, {
    level: event === 'failed' || event === 'restore_failed' ? 'error' : 'info',
    data,
    supabase,
  })

  return NextResponse.json({ ok: true, recorded: written })
}
