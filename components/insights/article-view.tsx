import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { ArticleBody } from '@/components/insights/article-body'
import { ArticleCard } from '@/components/insights/article-card'
import { ArticleToc } from '@/components/insights/article-toc'
import { TOC_MIN_ENTRIES, extractToc, parseArticleBody } from '@/lib/articles/markdown'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { t, type ArticleDetail, type Locale } from '@/types/content'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The full reading experience for one article. Used by the public
 * `/insights/[slug]` page and, unchanged, by the admin preview — so
 * what an editor previews is exactly what a reader gets. It receives
 * an `ArticleDetail`, which is already reduced to published related
 * items on the public path; the preview builds one the same way.
 */
export async function ArticleView({ article, locale }: { article: ArticleDetail; locale: Locale }) {
  // Labels follow the article's own language (identical to the route locale on the public site; the admin preview can show `fa` from an `en` admin UI).
  const tSection = await getTranslations({ locale, namespace: 'Insights' })
  const tNav = await getTranslations({ locale, namespace: 'Nav' })

  const { blocks } = parseArticleBody(article.body[locale])
  const toc = extractToc(blocks)
  const showToc = toc.length >= TOC_MIN_ENTRIES
  const minutes = article.readingMinutes[locale]
  // "Updated" is only worth saying when the edit is a real, later change — not the same-day polish after publishing.
  const wasUpdated = new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > DAY_MS
  const hasRelated =
    article.relatedProjects.length > 0 || article.relatedServices.length > 0 || article.relatedArticles.length > 0

  return (
    <article className="container-page pb-24">
      <div className="pt-8 md:pt-12">
        <Breadcrumb
          items={[
            { label: tNav('home'), href: '/' },
            { label: tNav('insights'), href: '/insights' },
            { label: t(article.title, locale) },
          ]}
        />
      </div>

      <header className="max-w-3xl py-10 md:py-14">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {article.category ? <Badge variant="brand-soft">{t(article.category, locale)}</Badge> : null}
          <time dateTime={article.publishedAt}>{tSection('published', { date: formatDate(article.publishedAt, locale) })}</time>
          {minutes > 0 ? <span>{tSection('minRead', { minutes })}</span> : null}
          {wasUpdated ? (
            <time dateTime={article.updatedAt}>{tSection('updated', { date: formatDate(article.updatedAt, locale) })}</time>
          ) : null}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance md:text-5xl">{t(article.title, locale)}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">{t(article.excerpt, locale)}</p>
      </header>

      <div className={cn('grid gap-8 lg:gap-16', showToc && 'lg:grid-cols-[minmax(0,1fr)_16rem]')}>
        {showToc ? (
          <aside className="order-first lg:order-last">
            <ArticleToc entries={toc} label={tSection('tocLabel')} toggleLabel={tSection('tocToggle')} />
          </aside>
        ) : null}
        <div className="min-w-0">
          <ArticleBody
            blocks={blocks}
            locale={locale}
            images={article.images}
            copyLabel={tSection('copyCode')}
            copiedLabel={tSection('codeCopied')}
          />
        </div>
      </div>

      {hasRelated ? (
        <div className="mt-20 flex flex-col gap-14 border-t border-border pt-14">
          {article.relatedProjects.length > 0 ? (
            <RelatedGroup title={tSection('relatedWork')}>
              {article.relatedProjects.map((project) => (
                <RelatedLink
                  key={project.slug}
                  href={`/work/${project.slug}`}
                  title={t(project.title, locale)}
                  description={t(project.summary, locale)}
                  cta={tSection('viewCaseStudy')}
                />
              ))}
            </RelatedGroup>
          ) : null}

          {article.relatedServices.length > 0 ? (
            <RelatedGroup title={tSection('relatedServices')}>
              {article.relatedServices.map((service) => (
                <RelatedLink
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  title={t(service.title, locale)}
                  description={t(service.description, locale)}
                  cta={tSection('viewService')}
                />
              ))}
            </RelatedGroup>
          ) : null}

          {article.relatedArticles.length > 0 ? (
            <RelatedGroup title={tSection('relatedArticles')}>
              {article.relatedArticles.map((related) => (
                <li key={related.id} className="flex">
                  <ArticleCard article={related} />
                </li>
              ))}
            </RelatedGroup>
          ) : null}
        </div>
      ) : null}

      <div className="mt-16">
        <Link href="/insights" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {tSection('allInsights')}
        </Link>
      </div>
    </article>
  )
}

function RelatedGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">{children}</ul>
    </section>
  )
}

function RelatedLink({ href, title, description, cta }: { href: string; title: string; description: string; cta: string }) {
  return (
    <li className="flex">
      <div className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 transition-colors has-[a:hover]:border-foreground/20">
        <h3 className="text-base font-semibold tracking-tight text-balance">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
        <span aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium group-hover:text-brand-text">
          {cta}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </li>
  )
}
