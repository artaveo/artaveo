import 'server-only'

import { revalidatePath } from 'next/cache'

import { routing } from '@/i18n/routing'

/**
 * § 15 — "on-demand revalidation of affected routes after publish", for
 * the journal. Lives in `lib/` (not in `app/actions/content.ts`) because a
 * `'use server'` file can only export async Server Actions, and the daily
 * scheduled-publish sweep (`app/api/cron/notifications/route.ts`) needs the
 * very same invalidation.
 *
 * `visibilityChanged` is for transitions that can flip the Insights nav
 * link / the index route between "hidden" and "shown" (publish, unpublish,
 * archive, the scheduled sweep): the nav flag is resolved in the root
 * layout, so the whole layout tree is invalidated. A plain edit of an
 * already-published article only needs its own page, the index and the home
 * preview. Cheap to over-call — revalidating a path that is not cached is a
 * no-op.
 */
export function revalidateArticleRoutes(
  slugs: (string | null | undefined)[],
  options: { visibilityChanged?: boolean } = {},
): void {
  if (options.visibilityChanged) {
    revalidatePath('/', 'layout')
  }
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`)
    revalidatePath(`/${locale}/insights`)
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${locale}/insights/${slug}`)
    }
  }
  revalidatePath('/sitemap.xml')
}
