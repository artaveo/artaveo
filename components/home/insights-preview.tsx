import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { getPublishedInsights } from '@/lib/home-content'
import { t, type ArticlePreview, type Locale } from '@/types/content'

/**
 * Rendered only once at least one article is published (roadmap § 3.5 /
 * § 16.5) — "In writing" drafts are for the admin/preview view, not here.
 */
export function InsightsPreview() {
  const articles = getPublishedInsights()
  const locale = useLocale() as Locale
  const tSection = useTranslations('Insights')

  if (articles.length === 0) return null

  return (
    <section
      aria-labelledby="insights-title"
      className="border-y border-border bg-elevated section-y"
    >
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
              <ArticleCard article={article} locale={locale} t={tSection} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * `getPublishedInsights()` only ever returns published articles, so every
 * card here is a link — no draft/"in writing" branch is needed on the
 * public site.
 */
function ArticleCard({
  article,
  locale,
  t: tSection,
}: {
  article: ArticlePreview
  locale: Locale
  t: ReturnType<typeof useTranslations<'Insights'>>
}) {
  const href = `/insights/${article.slug}`

  return (
    <article className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 transition-colors has-[a:hover]:border-foreground/20 md:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <Badge variant="muted">{t(article.category, locale)}</Badge>
        <time dateTime={article.publishedAt!}>
          {formatDate(article.publishedAt!, locale)}
        </time>
        {article.readingMinutes ? (
          <span>{tSection('minRead', { minutes: article.readingMinutes })}</span>
        ) : null}
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-balance">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {t(article.title, locale)}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        {t(article.excerpt, locale)}
      </p>

      <div className="mt-auto pt-6">
        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-brand-text"
        >
          {tSection('readArticle')}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </article>
  )
}
