import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { getPublishedInsights } from '@/lib/home-content'
import { t, type ArticlePreview } from '@/types/content'

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * Rendered only once at least one article is published (roadmap § 3.5 /
 * § 16.5) — "In writing" drafts are for the admin/preview view, not here.
 */
export function InsightsPreview() {
  const articles = getPublishedInsights()

  if (articles.length === 0) return null

  return (
    <section
      aria-labelledby="insights-title"
      className="border-y border-border bg-elevated section-y"
    >
      <div className="container-page">
        <SectionHeader
          id="insights-title"
          eyebrow="Insights"
          title="Notes from real projects"
          description="Practical writing on architecture, interfaces and the problems that come up while building production software."
          action={{ href: '/insights', label: 'All insights' }}
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

/**
 * `getPublishedInsights()` only ever returns published articles, so every
 * card here is a link — no draft/"in writing" branch is needed on the
 * public site.
 */
function ArticleCard({ article }: { article: ArticlePreview }) {
  const href = `/insights/${article.slug}`

  return (
    <article className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 transition-colors has-[a:hover]:border-foreground/20 md:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <Badge variant="muted">{t(article.category)}</Badge>
        <time dateTime={article.publishedAt!}>
          {dateFormat.format(new Date(article.publishedAt!))}
        </time>
        {article.readingMinutes ? <span>{article.readingMinutes} min read</span> : null}
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-balance">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {t(article.title)}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        {t(article.excerpt)}
      </p>

      <div className="mt-auto pt-6">
        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-brand-text"
        >
          Read article
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </article>
  )
}
