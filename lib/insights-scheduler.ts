import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { writeAuditLog } from '@/lib/admin/audit'
import { revalidateArticleRoutes } from '@/lib/insights-revalidate'
import { captureError, track } from '@/lib/observability/store'

export type PublishedArticle = {
  id: string
  slug: string
  /** English title, for the owner's publish notice (Phase 19). */
  titleEn: string
  /** The date the article was scheduled for — `published_at`, left as scheduled. */
  scheduledFor: string
}

/**
 * Phase 17 — the `scheduled` status, made real.
 *
 * An article in `scheduled` carries the date it should go live in
 * `published_at` (0016 makes that a database rule). This sweep is the one
 * thing that acts on it: every `scheduled` row whose date has arrived is
 * flipped to `published` in a single statement, which is what makes the
 * transition atomic and idempotent — a second run, or two overlapping runs,
 * simply find nothing left to do, and an article can never be published
 * twice or half-published.
 *
 * It runs from the once-a-day cron that already exists
 * (`app/api/cron/notifications/route.ts`, `vercel.json` — Hobby plan's
 * ceiling; see PHASE-17-README for why a second cron entry was not added).
 * So "scheduled for a date" means: live at that day's run (06:00 UTC). The
 * admin form says exactly that next to the date field; the granularity is a
 * day, not a minute, and nothing pretends otherwise.
 *
 * `published_at` is left as scheduled — the date the reader sees is the date
 * the owner chose. The `updated_at` trigger (0016) stamps the sweep time,
 * which is within a day of `published_at`, so the article does not show a
 * misleading "Updated" line.
 */
export async function publishDueArticles(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<{ published: number; items: PublishedArticle[] }> {
  const { data, error } = await client
    .from('articles')
    .update({ status: 'published' })
    .eq('status', 'scheduled')
    .lte('published_at', now.toISOString())
    .select('id, slug, title, published_at')

  if (error) {
    await captureError(error, { event: 'insights.scheduled_publish_failed', source: 'cron' })
    return { published: 0, items: [] }
  }

  const rows = data ?? []
  for (const row of rows) {
    await track('content.published', { subject: { type: 'article', id: row.id as string }, data: { via: 'scheduled' } })
    await writeAuditLog({
      actor: 'system:cron',
      action: 'content.article_published_scheduled',
      entity: 'article',
      entityId: row.id,
      after: { slug: row.slug },
    })
  }
  if (rows.length > 0) {
    revalidateArticleRoutes(
      rows.map((row) => row.slug),
      { visibilityChanged: true },
    )
  }
  return {
    published: rows.length,
    items: rows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      titleEn: ((row.title as { en?: string } | null)?.en ?? '').trim(),
      scheduledFor: row.published_at as string,
    })),
  }
}
