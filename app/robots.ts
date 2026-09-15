import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

/**
 * Roadmap § 11.1. `/design-system` is already `noindex` via its own
 * `generateMetadata` (robots meta tag) — disallowed here too so crawlers
 * don't even spend budget fetching it. `/api/` is Next's own route-handler
 * namespace (currently just `/api/og` and `/api/cron/notifications`),
 * neither of which is a page worth crawling. `/admin` (roadmap § 13) is
 * the same pattern: every admin page already sets `noindex` itself, and
 * `proxy.ts` redirects an unauthenticated crawler straight to
 * `/admin/login` regardless, but disallowing it here means a crawler
 * never spends budget on the redirect in the first place.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/design-system', '/api/', '/admin'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
