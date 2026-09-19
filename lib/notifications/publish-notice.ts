import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { enqueueContentPublished } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import type { PublishedEntity } from '@/lib/notifications/templates'

const TABLE: Record<PublishedEntity, string> = {
  article: 'articles',
  project: 'projects',
  service: 'services',
}

/**
 * "Somebody pressed Publish" — the owner's notice for a manual publish
 * (articles, case studies, service pages). The owner asked for it on
 * 19 September 2026, knowing they are often the one pressing the button; it
 * matters most when an editor does. Scheduled publishing has its own path in
 * the daily run (`app/api/cron/notifications/route.ts`).
 *
 * Best-effort in full: the publish has already happened and been audited, so a
 * failure here is logged and changes nothing the admin sees.
 */
export async function notifyManualPublish(
  supabase: SupabaseClient,
  input: { entity: PublishedEntity; id: string; actorEmail: string },
): Promise<void> {
  try {
    const { data } = await supabase.from(TABLE[input.entity]).select('slug, title').eq('id', input.id).maybeSingle()
    if (!data) return
    const rows = await enqueueContentPublished(supabase, {
      entity: input.entity,
      id: input.id,
      slug: data.slug as string,
      titleEn: ((data.title as { en?: string } | null)?.en ?? '').trim(),
      how: { via: 'manual', by: input.actorEmail, at: new Date().toISOString() },
    })
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
  } catch (err) {
    console.error('publish notice failed (the publish itself succeeded):', err)
  }
}
