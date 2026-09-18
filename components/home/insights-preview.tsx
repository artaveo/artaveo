import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/home/section-header'
import { ArticleCard } from '@/components/insights/article-card'
import { getLatestArticleSummaries } from '@/lib/insights'

/**
 * Home section 11 (§ 3.3): rendered only once at least one article is
 * published (§ 3.5 / § 16.5). Since Phase 17 it reads the real `articles`
 * table (`lib/insights.ts`) instead of the file-based planned-topics list
 * that stood in for it — so, like `Recommendations`, it is an async Server
 * Component. Publishing or unpublishing revalidates the home route
 * (`revalidateArticleRoutes`).
 */
export async function InsightsPreview() {
  const articles = await getLatestArticleSummaries(3)
  const tSection = await getTranslations('Insights')

  if (articles.length === 0) return null

  return (
    <section aria-labelledby="insights-title" className="border-y border-border bg-elevated section-y">
      <div className="container-page">
        <SectionHeader
          id="insights-title"
          eyebrow={tSection('eyebrow')}
          title={tSection('title')}
          description={tSection('description')}
          action={{ href: '/insights', label: tSection('allInsights') }}
        />

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {articles.map((article) => (
            <li key={article.id} className="flex">
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
