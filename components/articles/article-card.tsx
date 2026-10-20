import { useLocale } from 'next-intl'

import { ArticleCover } from '@/components/brand/article-card'
import { t, type ArticleSummary, type Locale } from '@/types/content'

/**
 * Phase 33.1 — one article as its card (§ 14.0 Article Card, B-37): the large
 * cover, the topic as its tag, the title. Shared by `/articles` and the "keep
 * reading" list under an article. Only ever given published articles
 * (`lib/insights.ts`), and every one of them has a cover (0032); a card
 * without one is not drawn (`ArticleCover`).
 */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  const locale = useLocale() as Locale
  return (
    <ArticleCover
      href={`/articles/${article.slug}`}
      title={t(article.title, locale)}
      tag={article.category ? t(article.category, locale) : null}
      cover={article.cover ? { src: article.cover.url, alt: t(article.cover.alt, locale) } : null}
    />
  )
}
