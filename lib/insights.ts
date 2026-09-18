import 'server-only'

import { cache } from 'react'

import { normalizeCategory } from '@/lib/articles/category'
import { collectMediaIds, parseArticleBody } from '@/lib/articles/markdown'
import { estimateReadingMinutes } from '@/lib/articles/reading-time'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Article, ArticleDetail, ArticleImage, ArticleSummary } from '@/types/content'

/**
 * Phase 17 — the public read layer for the journal (roadmap § 12,
 * "Insights / Engineering Journal").
 *
 * Only `status = 'published'` rows are ever selected. The scheduled →
 * published transition is a real, stored state change made by the daily
 * sweep (`lib/insights-scheduler.ts`) or by an admin's explicit publish
 * (`app/actions/content.ts`), never inferred here from a date — so this
 * module has exactly one definition of "public", the same one `articles`'
 * own RLS policy (0005) states.
 *
 * Failure policy, deliberately split (see docs/phases/PHASE-17-README.md):
 * - Everything that renders a page **throws** when Supabase is missing or
 *   errors — the same rule `lib/supabase/content-queries.ts` follows. Under
 *   ISR a thrown regeneration keeps serving the last good HTML; quietly
 *   returning `[]` would instead overwrite a good page with an empty one.
 * - `hasPublishedArticles()` alone is **tolerant** (returns `false`). It
 *   runs in the root layout, i.e. on every route including legal pages and
 *   the admin — none of which should become unreachable because an
 *   optional nav link could not be resolved.
 */

function requireClient() {
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error(
      'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — articles cannot be read from the database.',
    )
  }
  return client
}

const ARTICLE_COLUMNS = 'id, slug, title, excerpt, body, category, published_at, updated_at'

function assembleArticle(row: Record<string, any>): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: normalizeCategory(row.category),
    body: row.body,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: {
      en: estimateReadingMinutes(row.body?.en ?? '', 'en'),
      fa: estimateReadingMinutes(row.body?.fa ?? '', 'fa'),
    },
  }
}

function toSummary(article: Article): ArticleSummary {
  const { body: _body, ...summary } = article
  return summary
}

/** All published articles, newest first. Deduplicated per request. */
export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  const client = requireClient()
  const { data, error } = await client
    .from('articles')
    .select(ARTICLE_COLUMNS)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  if (error) throw new Error(`Failed to load articles: ${error.message}`)
  return (data ?? []).map(assembleArticle)
})

export async function getPublishedArticleSummaries(): Promise<ArticleSummary[]> {
  return (await getPublishedArticles()).map(toSummary)
}

export async function getLatestArticleSummaries(limit = 3): Promise<ArticleSummary[]> {
  return (await getPublishedArticleSummaries()).slice(0, limit)
}

/**
 * Drives "hidden from nav until content exists" (§ 5.2, § 15). Tolerant on
 * purpose — see the module header.
 */
export const hasPublishedArticles = cache(async (): Promise<boolean> => {
  try {
    const client = getSupabaseServerClient()
    if (!client) return false
    const { count, error } = await client
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
    if (error) {
      console.error('hasPublishedArticles failed:', error.message)
      return false
    }
    return (count ?? 0) > 0
  } catch (error) {
    console.error('hasPublishedArticles failed:', error)
    return false
  }
})

/**
 * Resolves every media-library image the given bodies embed
 * (`![caption](media:<id>)`) to its URL, size and bilingual alt text, once.
 * Shared by the public article page and the admin preview so both render
 * images through exactly the same rule.
 */
export async function loadArticleImages(bodies: string[]): Promise<Record<string, ArticleImage>> {
  const client = requireClient()
  const mediaIds = new Set<string>()
  for (const body of bodies) {
    for (const id of collectMediaIds(parseArticleBody(body).blocks)) mediaIds.add(id)
  }

  const images: Record<string, ArticleImage> = {}
  if (mediaIds.size === 0) return images

  const { data: assets, error } = await client
    .from('media_assets')
    .select('id, url, alt, width, height')
    .in('id', [...mediaIds])
  if (error) throw new Error(`Failed to load article images: ${error.message}`)

  for (const asset of assets ?? []) {
    // An asset with no alt text should be impossible (§ 15 requires it at
    // upload) — if one ever exists it is skipped rather than shown without.
    if (!asset.alt?.en || !asset.alt?.fa) continue
    images[String(asset.id).toLowerCase()] = {
      id: asset.id,
      url: asset.url,
      alt: asset.alt,
      width: asset.width ?? null,
      height: asset.height ?? null,
    }
  }
  return images
}

/** One published article with its embedded images and published related items, or `null`. */
export async function getArticleDetailBySlug(slug: string): Promise<ArticleDetail | null> {
  const client = requireClient()

  const { data: row, error } = await client
    .from('articles')
    .select(ARTICLE_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .maybeSingle()

  if (error) throw new Error(`Failed to load article: ${error.message}`)
  if (!row) return null

  return buildArticleDetail(assembleArticle(row))
}

/**
 * Resolves an article's images and its *published* related projects,
 * services and articles. Shared by the public page and the admin preview
 * (which feeds it an unpublished article), so a preview shows exactly what a
 * reader would get — including a related item silently absent because it is
 * not published yet.
 */
export async function buildArticleDetail(article: Article): Promise<ArticleDetail> {
  const client = requireClient()
  const images = await loadArticleImages([article.body.en, article.body.fa])

  const [projectLinks, serviceLinks, relatedLinks] = await Promise.all([
    client.from('article_projects').select('project_id, sort_order').eq('article_id', article.id).order('sort_order'),
    client.from('article_services').select('service_id, sort_order').eq('article_id', article.id).order('sort_order'),
    client.from('article_related').select('related_article_id').eq('article_id', article.id),
  ])
  for (const result of [projectLinks, serviceLinks, relatedLinks]) {
    if (result.error) throw new Error(`Failed to load related items: ${result.error.message}`)
  }

  const projectIds = (projectLinks.data ?? []).map((link: any) => link.project_id as string)
  const serviceIds = (serviceLinks.data ?? []).map((link: any) => link.service_id as string)
  const relatedIds = (relatedLinks.data ?? []).map((link: any) => link.related_article_id as string)

  // Only *published* projects/services/articles are ever linked to publicly.
  const [projects, services] = await Promise.all([
    projectIds.length
      ? client.from('projects').select('id, slug, title, summary').in('id', projectIds).eq('published', true)
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? client.from('services').select('id, slug, title, description').in('id', serviceIds).eq('published', true)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (projects.error) throw new Error(`Failed to load related projects: ${projects.error.message}`)
  if (services.error) throw new Error(`Failed to load related services: ${services.error.message}`)

  const inOrder = <T extends { id: string }>(ids: string[], rows: T[]) =>
    ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is T => Boolean(r))

  const published = await getPublishedArticles()
  const relatedArticles = relatedIds
    .map((id) => published.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Article => Boolean(candidate) && candidate!.id !== article.id)
    .map(toSummary)

  return {
    ...article,
    images,
    relatedProjects: inOrder(projectIds, (projects.data ?? []) as any[]).map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
    })),
    relatedServices: inOrder(serviceIds, (services.data ?? []) as any[]).map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
    })),
    relatedArticles,
  }
}

/** For the admin preview: an unpublished article shaped like a published one (`publishedAt` falls back to now). */
export function articleFromDraft(draft: {
  id: string
  slug: string
  title: { en: string; fa: string }
  excerpt: { en: string; fa: string }
  body: { en: string; fa: string }
  category: { en: string; fa: string } | null
  publishedAt: string | null
  updatedAt: string
}): Article {
  return {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    category: normalizeCategory(draft.category),
    body: draft.body,
    publishedAt: draft.publishedAt ?? new Date().toISOString(),
    updatedAt: draft.updatedAt,
    readingMinutes: {
      en: estimateReadingMinutes(draft.body.en, 'en'),
      fa: estimateReadingMinutes(draft.body.fa, 'fa'),
    },
  }
}
