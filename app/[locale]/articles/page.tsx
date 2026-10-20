import { Rss } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ArticleCard } from '@/components/articles/article-card'
import { BandInner, InkBand, PaperPanel } from '@/components/brand/bands'
import { CtaBand } from '@/components/brand/cta-band'
import { PageHero } from '@/components/brand/page-hero'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { getPublishedArticleSummaries } from '@/lib/insights'
import { absoluteUrl, buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Articles' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      ...buildAlternates(locale, '/articles'),
      // Feed autodiscovery: readers and browsers find the per-locale feed from the index page.
      types: { 'application/rss+xml': absoluteUrl(`/${locale}/articles/feed.xml`) },
    },
    ...buildPageOpenGraph({ locale, title: t('title'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

/**
 * Phase 33.1 — `/articles`: the ink hero, then every published article as a
 * card with its cover, topic and title (B-37) on the warm panel, the feed link
 * and the CTA band. § 2.3 "empty means hidden": with nothing published the
 * route does not exist, and the menu link is hidden by the same count.
 */
export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const articles = await getPublishedArticleSummaries()
  if (articles.length === 0) notFound()

  const t = await getTranslations('Articles')
  const tNav = await getTranslations('Nav')
  const tb = await getTranslations('Brand')
  const shell = await getShellData()

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/articles' },
        ])}
      />
      <PageHero trail={[{ href: '/', label: tNav('home') }]} current={tNav('articles')} eyebrow={t('eyebrow')} title={t('title')} lead={t('description')} titleId="articles-title" />
      <PaperPanel aria-label={t('title')} data-slot="articles-list">
        <BandInner className="flex flex-col gap-10">
          <ul className="grid gap-7 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id} className="flex min-w-0 flex-col">
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
          <a
            href={`/${locale}/articles/feed.xml`}
            className="inline-flex items-center gap-2 self-start rounded-sm text-sm font-medium text-paper-muted outline-none hover:text-paper-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Rss className="size-4" aria-hidden />
            {t('rssLink')}
          </a>
        </BandInner>
      </PaperPanel>
      <InkBand aria-label={tb('megaCardTitle')} className="px-4 pt-16 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="articles-cta">
        <CtaBand
          title={tb('megaCardTitle')}
          line={tb('megaCardLine')}
          primary={{ href: '/start', label: tb('start') }}
          whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null}
          whatsappLabel={tb('whatsapp')}
        />
      </InkBand>
    </SiteShell>
  )
}
