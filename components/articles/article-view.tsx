import { ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { ArticleBody } from '@/components/articles/article-body'
import { ArticleCard } from '@/components/articles/article-card'
import { ArticleToc } from '@/components/articles/article-toc'
import { BandInner, PaperPanel } from '@/components/brand/bands'
import { PageHero } from '@/components/brand/page-hero'
import { Link } from '@/i18n/navigation'
import { TOC_MIN_ENTRIES, extractToc, parseArticleBody } from '@/lib/articles/markdown'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { t, type ArticleDetail, type Locale } from '@/types/content'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The full reading experience for one article. Used by the public
 * `/articles/[slug]` page and, unchanged, by the admin preview — so what an
 * editor previews is exactly what a reader gets. It receives an
 * `ArticleDetail`, which is already reduced to published related items on
 * the public path; the preview builds one the same way.
 *
 * Phase 33.1 (Design System 2.0): the ink hero with the topic, the title, the
 * excerpt and the dates; then on the warm panel the cover (B-37), the body with
 * its contents list, the tags, and what to read or see next.
 */
export async function ArticleView({ article, locale }: { article: ArticleDetail; locale: Locale }) {
  // Labels follow the article's own language (identical to the route locale on the public site; the admin preview can show `fa` from an `en` admin UI).
  const tSection = await getTranslations({ locale, namespace: 'Articles' })
  const tNav = await getTranslations({ locale, namespace: 'Nav' })

  const { blocks } = parseArticleBody(article.body[locale])
  const toc = extractToc(blocks)
  const showToc = toc.length >= TOC_MIN_ENTRIES
  const minutes = article.readingMinutes[locale]
  // "Updated" is only worth saying when the edit is a real, later change — not the same-day polish after publishing.
  const wasUpdated = new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > DAY_MS
  const hasRelated =
    article.relatedProjects.length > 0 || article.relatedServices.length > 0 || article.relatedArticles.length > 0
  const title = t(article.title, locale)

  return (
    <article className="bg-ink" data-slot="article">
      <PageHero
        titleId="article-title"
        trail={[
          { href: '/', label: tNav('home') },
          { href: '/articles', label: tNav('articles') },
        ]}
        current={title}
        eyebrow={article.category ? t(article.category, locale) : undefined}
        title={title}
        lead={t(article.excerpt, locale)}
      >
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-muted">
          <time dateTime={article.publishedAt}>{tSection('published', { date: formatDate(article.publishedAt, locale) })}</time>
          {minutes > 0 ? <span>{tSection('minRead', { minutes })}</span> : null}
          {wasUpdated ? (
            <time dateTime={article.updatedAt}>{tSection('updated', { date: formatDate(article.updatedAt, locale) })}</time>
          ) : null}
        </p>
      </PageHero>

      <PaperPanel aria-labelledby="article-title" data-slot="article-body">
        <BandInner className="flex flex-col gap-12">
          {article.cover ? (
            <figure className="overflow-hidden rounded-card-lg bg-paper-card shadow-card">
              <Image
                src={article.cover.url}
                alt={t(article.cover.alt, locale)}
                width={article.cover.width ?? 1600}
                height={article.cover.height ?? 1000}
                sizes="(min-width: 1240px) 1192px, 94vw"
                priority
                className="aspect-[16/9] h-auto w-full object-cover"
              />
            </figure>
          ) : null}

          <div className={cn('grid gap-8 @5xl:gap-16', showToc && '@5xl:grid-cols-[minmax(0,1fr)_16rem]')}>
            {showToc ? (
              <aside className="order-first @5xl:order-last">
                <ArticleToc entries={toc} label={tSection('tocLabel')} toggleLabel={tSection('tocToggle')} />
              </aside>
            ) : null}
            <div className="min-w-0 max-w-[46rem]">
              <ArticleBody
                blocks={blocks}
                locale={locale}
                images={article.images}
                copyLabel={tSection('copyCode')}
                copiedLabel={tSection('codeCopied')}
              />
            </div>
          </div>

          {article.tags.length > 0 ? (
            <section aria-label={tSection('tagsLabel')} className="flex flex-col gap-3">
              <h2 className="text-small font-bold text-gold-deep">{tSection('tagsLabel')}</h2>
              <ul className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <li key={tag.en} className="rounded-pill border border-paper-line px-3 py-1.5 text-xs font-semibold">
                    {t(tag, locale)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasRelated ? (
            <div className="flex flex-col gap-14 border-t border-paper-line pt-12">
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
                    <li key={related.id} className="flex min-w-0 flex-col">
                      <ArticleCard article={related} />
                    </li>
                  ))}
                </RelatedGroup>
              ) : null}
            </div>
          ) : null}

          <Link
            href="/articles"
            className="inline-flex items-center gap-2 self-start rounded-sm text-sm font-medium text-paper-muted outline-none hover:text-paper-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {tSection('allArticles')}
          </Link>
        </BandInner>
      </PaperPanel>
    </article>
  )
}

function RelatedGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="text-h3">{title}</h2>
      <ul className="mt-6 grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">{children}</ul>
    </section>
  )
}

function RelatedLink({ href, title, description, cta }: { href: string; title: string; description: string; cta: string }) {
  return (
    <li className="flex">
      <div className="group relative flex w-full flex-col rounded-card-lg border border-paper-line bg-paper-card p-6 shadow-card transition-shadow has-[a:hover]:shadow-card-hover">
        <h3 className="text-card-title text-balance">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-card-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-pretty text-paper-muted">{description}</p>
        <span aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-gold-deep">
          {cta}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </li>
  )
}
