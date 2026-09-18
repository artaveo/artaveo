import { NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { publishDueArticles } from '@/lib/insights-scheduler'
import { processOutboxBatch } from '@/lib/notifications/outbox'

/**
 * § 9.3 — Notifications: daily retry sweep (and, since Phase 17, the
 * daily scheduled-article publish sweep — see below).
 *
 * The inline best-effort attempt in `app/actions/inquiries.ts` covers the
 * common case (send succeeds immediately). This route is the safety net
 * for whatever that attempt missed — a transient provider outage, a cold
 * start, etc. — by re-running `processOutboxBatch` over everything still
 * due.
 *
 * Registered in `vercel.json` on a once-per-day schedule: Vercel's Hobby
 * plan caps cron cadence at once per day (any more frequent expression
 * fails at deploy time), so this is a real, documented limitation — a
 * failed send can sit for up to ~24h before an automatic retry — not an
 * oversight. It's an acceptable trade-off because (1) the inline attempt
 * already handles the normal case, and (2) no inquiry data is ever at
 * risk either way, only the notification's timeliness. Upgrading to Pro,
 * or pointing an external scheduler (e.g. cron-job.org) at this same
 * route, would remove the once-a-day ceiling without any code change —
 * the route itself accepts a request at any frequency; only Vercel's own
 * scheduler is capped.
 *
 * Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` for
 * its own scheduled invocations and auto-provisions `CRON_SECRET`; this
 * route rejects anything else so it can't be triggered by an outsider to
 * exhaust email-provider quota or spam the outbox with attempts.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET

  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 200 })
  }

  const result = await processOutboxBatch(supabase, { limit: 100 })

  // Phase 17: the same daily run also publishes journal articles whose
  // scheduled date has arrived (`lib/insights-scheduler.ts`). It shares this
  // route — not a second `vercel.json` cron entry — because the Hobby plan's
  // cron allowance is small and exceeding it fails the whole deploy. The
  // two sweeps are independent: a failure in one never blocks the other.
  const articles = await publishDueArticles(supabase)

  return NextResponse.json({ ok: true, ...result, articles })
}
