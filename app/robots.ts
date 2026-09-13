import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

/**
 * Roadmap § 11.1. `/design-system` is already `noindex` via its own
 * `generateMetadata` (robots meta tag) — disallowed here too so crawlers
 * don't even spend budget fetching it. `/api/` is Next's own route-handler
 * namespace (currently just `/api/og` and `/api/cron/notifications`),
 * neither of which is a page worth crawling.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/design-system', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
