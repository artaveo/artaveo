import type { MetadataRoute } from 'next'

import { getAllProjects } from '@/lib/home-content-projects'
import { getPublishedArticleSummaries } from '@/lib/insights'
import { getAllServices } from '@/lib/services-content'
import { routing } from '@/i18n/routing'
import { absoluteUrl } from '@/lib/seo'

/**
 * Roadmap § 11.1. `/design-system` is deliberately excluded (internal,
 * `noindex` tool page — see its own `generateMetadata`). Every entry
 * carries `alternates.languages` so search engines see the `en`/`fa`
 * pair as translations of the same page rather than duplicate content.
 */

type StaticRoute = { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }

const staticRoutes: StaticRoute[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/work', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/process', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/start', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/consultation', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
]

function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(`/${locale}${path}`)
  }
  languages['x-default'] = absoluteUrl(`/${routing.defaultLocale}${path}`)
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const route of staticRoutes) {
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${route.path}`),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages: languageAlternates(route.path) },
      })
    }
  }

  for (const project of await getAllProjects()) {
    const path = `/work/${project.slug}`
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: languageAlternates(path) },
      })
    }
  }

  for (const service of await getAllServices()) {
    const path = `/services/${service.slug}`
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: { languages: languageAlternates(path) },
      })
    }
  }

  // Phase 17 — the journal, only once something is published (empty means hidden):
  // the index and every published article, in both locales.
  const articles = await getPublishedArticleSummaries()
  if (articles.length > 0) {
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(`/${locale}/insights`),
        lastModified: new Date(articles[0].updatedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: languageAlternates('/insights') },
      })
    }
    for (const article of articles) {
      const path = `/insights/${article.slug}`
      for (const locale of routing.locales) {
        entries.push({
          url: absoluteUrl(`/${locale}${path}`),
          lastModified: new Date(article.updatedAt),
          changeFrequency: 'monthly',
          priority: 0.6,
          alternates: { languages: languageAlternates(path) },
        })
      }
    }
  }

  return entries
}
