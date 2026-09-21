import { hasLocale } from 'next-intl'

import { routing } from '@/i18n/routing'
import { buildSearchIndex } from '@/lib/search/build-index'
import type { Locale } from '@/types/content'
import { captureError } from '@/lib/observability/store'

/**
 * Phase 18 — `GET /api/search/index/en` · `GET /api/search/index/fa`.
 *
 * One JSON document per language: every published page, project, service,
 * article and (project-linked) technology, already localised — see
 * `lib/search/build-index.ts` for exactly what goes in. The in-browser
 * provider (`lib/search/local-provider.ts`) fetches it once and matches
 * locally.
 *
 * Caching mirrors the RSS feed (Phase 17): deliberately dynamic and cached at
 * the CDN, not prerendered, so a database outage can never fail a build over
 * an optional feature, and a publish reaches search within the window below
 * with no invalidation hook to forget. **A failure is never cached** — the
 * 503 carries `no-store`, so one bad moment can't be pinned at the edge.
 *
 * `/api/*` is outside the i18n middleware (`proxy.ts`) and outside the
 * service worker's content-page allow-list (`scripts/generate-sw.mjs`), so
 * the locale is validated here and the response is always a fresh network
 * fetch from the browser's side.
 */

const CACHE_HIT = 'public, s-maxage=900, stale-while-revalidate=3600'
const NO_STORE = 'no-store'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    return Response.json({ error: 'unknown-locale' }, { status: 404, headers: { 'Cache-Control': NO_STORE } })
  }

  try {
    const index = await buildSearchIndex(locale as Locale)
    return Response.json(index, { headers: { 'Cache-Control': CACHE_HIT } })
  } catch (error) {
    await captureError(error, { event: 'search.index_build_failed', source: 'route', route: '/api/search/index/[locale]' })
    return Response.json(
      { error: 'search-index-unavailable' },
      { status: 503, headers: { 'Cache-Control': NO_STORE } },
    )
  }
}
