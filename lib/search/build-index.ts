import 'server-only'

import { getTranslations } from 'next-intl/server'

import { getAllProjects } from '@/lib/home-content-projects'
import { getPublishedArticles } from '@/lib/insights'
import { getAllServices } from '@/lib/services-content'
import { commandItems, mainNav } from '@/lib/site'
import type { SearchDocument, SearchIndex } from '@/lib/search/types'
import { t, type Locale, type Project } from '@/types/content'

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
 *   `/start`, `/contact` and the e-mail shortcut are *actions*, kept as
 *   client-side commands in the palette; `/design-system` is an internal,
 *   noindex tool and is a command only.
 * - projects — title, summary; category and technologies as keywords.
 * - services — title, short description; deliverables as keywords.
 * - articles — title, excerpt; category as a keyword. Bodies are not
 *   indexed (see PHASE-18-README, "Not built").
 * - technologies — derived from the published projects that use them, so a
 *   technology is only searchable when there is real work that proves it
 *   (§ 4.5, B-03: proof-linked expertise).
 */

const MAX_SUGGESTIONS = 6

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'item'
}

type TechnologyUse = { name: string; projects: Project[] }

/** Distinct technologies across published projects, in first-seen order. Case-insensitive; keeps the first spelling. */
function collectTechnologies(projects: Project[]): TechnologyUse[] {
  const byKey = new Map<string, TechnologyUse>()
  for (const project of projects) {
    for (const raw of project.technologies) {
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const entry = byKey.get(key) ?? { name, projects: [] }
      if (!entry.projects.includes(project)) entry.projects.push(project)
      byKey.set(key, entry)
    }
  }
  return [...byKey.values()]
}

export async function buildSearchIndex(locale: Locale): Promise<SearchIndex> {
  const [projects, services, articles, tNav, tPalette, tIndex] = await Promise.all([
    getAllProjects(),
    getAllServices(),
    getPublishedArticles(),
    getTranslations({ locale, namespace: 'Nav' }),
    getTranslations({ locale, namespace: 'CommandPalette' }),
    getTranslations({ locale, namespace: 'SearchIndex' }),
  ])

  const docs: SearchDocument[] = []

  // ── pages ──────────────────────────────────────────────────────────────
  for (const item of commandItems) {
    if (item.group === 'actions' || item.href === '/design-system' || item.href.startsWith('mailto:')) continue
    if (item.contentFlag === 'insights' && articles.length === 0) continue

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
      keywords: [t(project.category, locale), ...project.technologies],
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

  // ── technologies (proof-linked: only those used by a published project) ─
  const technologies = collectTechnologies(projects)
  const listFormat = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })
  for (const tech of technologies) {
    const single = tech.projects.length === 1 ? tech.projects[0] : undefined
    docs.push({
      id: `technology:${slugify(tech.name)}`,
      kind: 'technology',
      href: single ? `/work/${single.slug}` : '/work',
      title: tech.name,
      description: tIndex('technologyUsedIn', {
        count: tech.projects.length,
        projects: listFormat.format(tech.projects.map((p) => t(p.title, locale))),
      }),
    })
  }

  // Most-used first; ties keep first-seen order (Array#sort is stable).
  const suggestions = [...technologies]
    .sort((a, b) => b.projects.length - a.projects.length)
    .slice(0, MAX_SUGGESTIONS)
    .map((tech) => tech.name)

  return { locale, generatedAt: new Date().toISOString(), docs, suggestions }
}
