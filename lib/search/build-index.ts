import 'server-only'

import { getTranslations } from 'next-intl/server'

import { getAllProjects } from '@/lib/home-content-projects'
import { getPublishedArticles } from '@/lib/insights'
import { getAllServices } from '@/lib/services-content'
import { commandItems, mainNav } from '@/lib/site'
import type { SearchDocument, SearchIndex } from '@/lib/search/types'
import { t, type Locale } from '@/types/content'

/**
 * Phase 18 — builds one locale's search index from **published** content only.
 *
 * Every source below is a selector that already filters to published rows
 * (`queryAllProjects`, `queryAllServices`, `getPublishedArticles`), so a
 * draft, an archived article or an unpublished project cannot reach the
 * index by construction — there is no second "is it public?" rule to keep in
 * sync. Empty means hidden (§ 2, principle 3): with no published article the
 * Insights page is not indexed either, exactly as its nav link is hidden.
 *
 * What is indexed, and how much of it:
 * - pages — the navigate/resources entries of the command list (Home, Work,
 *   Services, Process, About, Insights when it exists, Privacy, Terms), with
 *   the translated title and, where the nav has one, its description.
 *   `/start`, `/contact`, `/consultation` and the e-mail shortcut are
 *   *actions*, kept as client-side commands in the palette;
 *   `/design-system` is an internal, noindex tool and is a command only.
 * - projects — title, summary; industry as a keyword.
 * - services — title, short description; deliverables as keywords.
 * - articles — title, excerpt; category as a keyword. Bodies are not
 *   indexed (see PHASE-18-README, "Not built").
 *
 * Phase 32: technologies are no longer searchable and no longer suggested —
 * customer copy never names them (§ 16.1 rule 3). The suggestions are the
 * kinds of software Artaveo builds (the published services).
 */

const MAX_SUGGESTIONS = 6

export async function buildSearchIndex(locale: Locale): Promise<SearchIndex> {
  const [projects, services, articles, tNav, tPalette] = await Promise.all([
    getAllProjects(),
    getAllServices(),
    getPublishedArticles(),
    getTranslations({ locale, namespace: 'Nav' }),
    getTranslations({ locale, namespace: 'CommandPalette' }),
  ])

  const docs: SearchDocument[] = []

  // ── pages ──────────────────────────────────────────────────────────────
  for (const item of commandItems) {
    if (item.group === 'actions' || item.href === '/design-system' || item.href.startsWith('mailto:')) continue
    if (item.contentFlag === 'insights' && articles.length === 0) continue
    // A page hidden from the nav is not offered by search either.
    if (!item.contentFlag && item.hasContent === false) continue

    const title =
      item.labelNamespace === 'Nav'
        ? tNav(item.labelKey as Parameters<typeof tNav>[0])
        : tPalette(item.labelKey as 'home')
    const navEntry = mainNav.find((n) => n.href === item.href)
    const descriptionKey = `${item.labelKey}Description` as Parameters<typeof tNav>[0]
    const description = navEntry?.hasDescription && tNav.has(descriptionKey) ? tNav(descriptionKey) : undefined

    docs.push({
      id: `page:${item.href}`,
      kind: 'page',
      href: item.href,
      title,
      description,
      keywords: item.keywords?.split(/\s+/).filter(Boolean),
    })
  }

  // ── projects ───────────────────────────────────────────────────────────
  for (const project of projects) {
    docs.push({
      id: `project:${project.slug}`,
      kind: 'project',
      href: `/work/${project.slug}`,
      title: t(project.title, locale),
      description: t(project.summary, locale),
      keywords: project.industry ? [t(project.industry, locale)] : undefined,
      boost: project.featured ? 2 : 0,
    })
  }

  // ── services ───────────────────────────────────────────────────────────
  for (const service of services) {
    docs.push({
      id: `service:${service.slug}`,
      kind: 'service',
      href: `/services/${service.slug}`,
      title: t(service.title, locale),
      description: t(service.description, locale),
      keywords: service.deliverables.map((d) => t(d, locale)),
    })
  }

  // ── articles ───────────────────────────────────────────────────────────
  for (const article of articles) {
    docs.push({
      id: `article:${article.slug}`,
      kind: 'article',
      href: `/insights/${article.slug}`,
      title: t(article.title, locale),
      description: t(article.excerpt, locale),
      keywords: article.category ? [t(article.category, locale)] : undefined,
    })
  }

  const suggestions = services.slice(0, MAX_SUGGESTIONS).map((service) => t(service.title, locale))

  return { locale, generatedAt: new Date().toISOString(), docs, suggestions }
}
