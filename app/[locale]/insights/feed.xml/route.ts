import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { getPublishedArticleSummaries } from '@/lib/insights'
import { absoluteUrl } from '@/lib/seo'
import { siteConfig } from '@/lib/site'
import { t, type Locale } from '@/types/content'

/**
 * Phase 17 — RSS 2.0 feed, one per locale: `/en/insights/feed.xml`,
 * `/fa/insights/feed.xml`. Items carry the title, excerpt, category and
 * real publish date; the full text stays on the site (a feed with only
 * the excerpt is a deliberate, disclosed choice — see PHASE-17-README).
 *
 * `proxy.ts` skips paths containing a dot, so the locale is validated
 * here instead of by the i18n middleware. With nothing published the feed
 * is a 404, the same "empty means hidden" rule as `/insights` itself.
 *
 * Deliberately dynamic (no `force-static`): it reads Supabase on request
 * and is cached at the CDN instead, so a Supabase outage can never fail a
 * build over an optional feed, and a publish shows up within the window
 * below without needing its own revalidation hook.
 */

const CACHE_CONTROL = 'public, s-maxage=900, stale-while-revalidate=3600'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    return new Response('Not found', { status: 404 })
  }

  const articles = await getPublishedArticleSummaries()
  if (articles.length === 0) {
    return new Response('Not found', { status: 404 })
  }

  const localeKey = locale as Locale
  const tSection = await getTranslations({ locale, namespace: 'Insights' })
  const selfUrl = absoluteUrl(`/${locale}/insights/feed.xml`)
  const lastBuild = articles.reduce((latest, a) => (a.updatedAt > latest ? a.updatedAt : latest), articles[0].updatedAt)

  const items = articles
    .map((article) => {
      const url = absoluteUrl(`/${locale}/insights/${article.slug}`)
      return [
        '    <item>',
        `      <title>${escapeXml(t(article.title, localeKey))}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(t(article.excerpt, localeKey))}</description>`,
        ...(article.category ? [`      <category>${escapeXml(t(article.category, localeKey))}</category>`] : []),
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(`${siteConfig.name} — ${tSection('title')}`)}</title>`,
    `    <link>${escapeXml(absoluteUrl(`/${locale}/insights`))}</link>`,
    `    <description>${escapeXml(tSection('description'))}</description>`,
    `    <language>${localeKey}</language>`,
    `    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
    },
  })
}
