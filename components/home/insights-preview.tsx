import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { insights } from '@/lib/home-content'
import type { ArticlePreview } from '@/types/content'

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function InsightsPreview() {
  const articles = insights.slice(0, 3)

  return (
    <section
      aria-labelledby="insights-title"
      className="border-y border-border bg-elevated py-20 md:py-28"
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
 * Published articles become a single stretched link. Articles still in
 * writing keep the same layout but are not clickable and show their state
 * instead of a date or reading time.
 */
function ArticleCard({ article }: { article: ArticlePreview }) {
  const isPublished = article.publishedAt !== null
  const href = `/insights/${article.slug}`

  return (
    <article className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 transition-colors has-[a:hover]:border-foreground/20 md:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <Badge variant="muted">{article.category}</Badge>
        {isPublished ? (
          <>
            <time dateTime={article.publishedAt!}>
              {dateFormat.format(new Date(article.publishedAt!))}
            </time>
            {article.readingMinutes ? (
              <span>{article.readingMinutes} min read</span>
            ) : null}
          </>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            In writing
          </Badge>
        )}
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-balance">
        {isPublished ? (
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {article.title}
          </Link>
        ) : (
          article.title
        )}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        {article.excerpt}
      </p>

      {isPublished ? (
        <div className="mt-auto pt-6">
          <span
            aria-hidden
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-brand"
          >
            Read article
            <ArrowRight className="size-4 rtl:rotate-180" />
          </span>
        </div>
      ) : null}
    </article>
  )
}
