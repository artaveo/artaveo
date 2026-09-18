import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { t, type ArticleSummary, type Locale } from '@/types/content'

/**
 * One journal entry as a card — shared by the home preview, the `/insights`
 * index and the "keep reading" list under an article, so all three read
 * the same way. The whole card is one link (stretched pseudo-element on the
 * title's anchor), not a nested-link cluster.
 *
 * Only ever given published articles (`lib/insights.ts`), so there is no
 * draft branch here — drafts never reach a public component (§ 3.5, § 16.5).
 */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  const locale = useLocale() as Locale
  const tSection = useTranslations('Insights')

  return (
    <article className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 transition-colors has-[a:hover]:border-foreground/20 md:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        {article.category ? <Badge variant="muted">{t(article.category, locale)}</Badge> : null}
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
        {article.readingMinutes[locale] > 0 ? (
          <span>{tSection('minRead', { minutes: article.readingMinutes[locale] })}</span>
        ) : null}
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-balance">
        <Link
          href={`/insights/${article.slug}`}
          className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {t(article.title, locale)}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{t(article.excerpt, locale)}</p>

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
