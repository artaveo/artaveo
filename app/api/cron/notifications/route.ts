import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { publishDueArticles } from '@/lib/insights-scheduler'
import { enqueueContentPublished } from '@/lib/notifications/events'
import { processOutboxBatch } from '@/lib/notifications/outbox'
import { sweepRecommendationRecipients } from '@/lib/recommendation-privacy'
import { sweepUnlinkedInquiryFiles } from '@/lib/inquiry-files'
import { purgeExpiredRateLimits } from '@/lib/security/rate-limit'

/**
 * The daily run: the notification retry sweep (§ 9.3, Phase 19), the
 * scheduled-article publish sweep (Phase 17), the owner's notices for whatever
 * that publish sweep just made public (Phase 19), and the clean-up of finished
 * recommendation requests' e-mail addresses (D-14).
 *
 * Both sweeps share this one route — not two `vercel.json` cron entries —
 * because the Hobby plan's cron allowance is small and exceeding it fails the
 * whole deploy. They are independent: a failure in one never blocks the other.
 *
 * SECURITY (changed in Phase 19). This route now FAILS CLOSED: without
 * `CRON_SECRET` set in the Vercel project it answers 401 and does nothing.
 * Phase 9.3's comment said Vercel auto-provisions the secret; it does not —
 * Vercel sends `Authorization: Bearer $CRON_SECRET` only when *you* add an
 * environment variable of that name (Vercel's "Securing cron jobs" docs). The
 * old check ("if a secret is set, require it") therefore left the route open
 * to anyone who knew the URL whenever the variable was missing. Set
 * `CRON_SECRET` (a random string of at least 16 characters) in Vercel and
 * redeploy — until then the daily run, including scheduled publishing, does
 * not run. See `docs/runbooks/notifications.md`.
 *
 * Cadence: Vercel's Hobby plan caps cron at once per day (`vercel.json`). This
 * route accepts a request at any frequency, so an external scheduler
 * (cron-job.org, GitHub Actions) sending the same `Authorization` header every
 * few minutes gives real backoff timing with no code change. Without one,
 * retries also happen after every new submission
 * (`processAfterEnqueue`) and on the admin's "Retry now".
 */

// A 50-message sweep at a few hundred ms each is far inside this; the value is
// the ceiling Hobby allows, so a slow provider degrades into a partial sweep
// (the deadline below) rather than a killed function.
export const maxDuration = 60

const SWEEP_DEADLINE_MS = 40_000

function isAuthorized(request: Request): 'ok' | 'not-configured' | 'unauthorized' {
  const secret = process.env.CRON_SECRET
  if (!secret) return 'not-configured'

  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length) return 'unauthorized'
  return crypto.timingSafeEqual(given, expected) ? 'ok' : 'unauthorized'
}

async function settle<T>(label: string, run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run()
  } catch (err) {
    console.error(`[cron] ${label} failed:`, err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function GET(request: Request) {
  const auth = isAuthorized(request)
  if (auth === 'not-configured') {
    console.error('[cron] CRON_SECRET is not set — refusing to run. Set it in the Vercel project settings and redeploy.')
    return NextResponse.json({ ok: false, error: 'cron-secret-not-configured' }, { status: 401 })
  }
  if (auth === 'unauthorized') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 200 })
  }

  const notifications = await settle('notification sweep', () =>
    processOutboxBatch(supabase, { limit: 50, deadlineMs: SWEEP_DEADLINE_MS }),
  )

  const articles = await settle('scheduled publish sweep', () => publishDueArticles(supabase))

  // Tell the owner about whatever just went live — and send it now, rather
  // than leaving it for tomorrow's run.
  let publishNotices: { enqueued: number } | { error: string } = { enqueued: 0 }
  if ('items' in articles && articles.items.length > 0) {
    const items = articles.items
    publishNotices = await settle('publish notices', async () => {
      const ids: string[] = []
      for (const item of items) {
        const rows = await enqueueContentPublished(supabase, {
          entity: 'article',
          id: item.id,
          slug: item.slug,
          titleEn: item.titleEn,
          how: { via: 'scheduled', scheduledFor: item.scheduledFor },
        })
        ids.push(...rows.map((row) => row.id))
      }
      if (ids.length > 0) await processOutboxBatch(supabase, { ids, deadlineMs: 10_000 })
      return { enqueued: ids.length }
    })
  }

  // D-14: clear the e-mail address of every finished recommendation request and
  // redact the e-mails that carried it (`lib/recommendation-privacy.ts`).
  const recommenderPrivacy = await settle('recommender address sweep', () => sweepRecommendationRecipients(supabase))

  // Phase 23: housekeeping that keeps two tables the size of "recent activity" —
  // finished rate-limit windows, and visitor uploads whose brief was never sent.
  const rateLimits = await settle('rate limit purge', () => purgeExpiredRateLimits(supabase))
  const unlinkedFiles = await settle('unlinked file sweep', () => sweepUnlinkedInquiryFiles(supabase))

  return NextResponse.json({ ok: true, notifications, articles, publishNotices, recommenderPrivacy, rateLimits, unlinkedFiles })
}
