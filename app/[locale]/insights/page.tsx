import { Rss } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ArticleCard } from '@/components/insights/article-card'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { PageHeader } from '@/components/ui/patterns'
import { getPublishedArticleSummaries } from '@/lib/insights'
import { absoluteUrl, buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Insights' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      ...buildAlternates(locale, '/insights'),
      // Feed autodiscovery: readers and browsers find the per-locale feed from the index page.
      types: { 'application/rss+xml': absoluteUrl(`/${locale}/insights/feed.xml`) },
    },
    ...buildPageOpenGraph({ locale, title: t('title'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // § 2.3 "empty means hidden": with nothing published the route does not exist
  // (the nav link is already hidden by the same condition).
  const articles = await getPublishedArticleSummaries()
  if (articles.length === 0) notFound()

  const t = await getTranslations('Insights')
  const tNav = await getTranslations('Nav')

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/insights' },
        ])}
      />
      <div className="container-page">
        <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
        <ul className="grid gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {articles.map((article) => (
            <li key={article.id} className="flex">
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
        <div className="pb-24">
          <a
            href={`/${locale}/insights/feed.xml`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Rss className="size-4" aria-hidden />
            {t('rssLink')}
          </a>
        </div>
      </div>
    </SiteShell>
  )
}
