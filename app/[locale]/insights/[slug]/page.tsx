import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ArticleView } from '@/components/insights/article-view'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { ViewTracker } from '@/components/site/view-tracker'
import { routing } from '@/i18n/routing'
import { getArticleDetailBySlug, getPublishedArticleSummaries } from '@/lib/insights'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data'
import { t, type Locale } from '@/types/content'

/**
 * Pre-renders what is published at build time. A Supabase hiccup during a
 * build must not fail the deploy over an *optional* section, so this alone
 * degrades to "generate on first request" (`dynamicParams` stays on) —
 * publish/unpublish revalidate the affected routes (`revalidateArticleRoutes`).
 */
export async function generateStaticParams() {
  try {
    const articles = await getPublishedArticleSummaries()
    return routing.locales.flatMap((locale) => articles.map((article) => ({ locale, slug: article.slug })))
  } catch (error) {
    console.error('insights generateStaticParams skipped:', error)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const article = await getArticleDetailBySlug(slug)
  if (!article) return {}

  const localeKey = locale === 'fa' ? 'fa' : 'en'
  const title = t(article.title, localeKey)
  const description = t(article.excerpt, localeKey)
  const og = buildPageOpenGraph({
    locale,
    title,
    description,
    eyebrow: article.category ? t(article.category, localeKey) : undefined,
  })

  return {
    title,
    description,
    alternates: buildAlternates(locale, `/insights/${slug}`),
    openGraph: {
      ...og.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: og.twitter,
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const article = await getArticleDetailBySlug(slug)
  if (!article) notFound()

  const localeKey = locale as Locale
  const tNav = await getTranslations('Nav')

  return (
    <SiteShell>
      <JsonLd data={buildArticleJsonLd(localeKey, article)} />
      <JsonLd
        data={buildBreadcrumbJsonLd(localeKey, [
          { name: tNav('home'), path: '/' },
          { name: tNav('insights'), path: '/insights' },
          { name: t(article.title, localeKey), path: `/insights/${article.slug}` },
        ])}
      />
      <ViewTracker event="article_view" properties={{ slug: article.slug }} />
      <ArticleView article={article} locale={localeKey} />
    </SiteShell>
  )
}
