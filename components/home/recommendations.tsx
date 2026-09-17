import { BadgeCheck } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { queryApprovedRecommendations } from '@/lib/supabase/content-queries'
import { t, type Locale, type Recommendation, type RecommendationVerification } from '@/types/content'

/**
 * § 3.3: "Rendered only when ≥ 1 verified recommendation is published" —
 * same empty-means-hidden pattern `InsightsPreview` already uses. Unlike
 * that component (still file-based, Phase 17 not started), this one
 * reads Supabase directly — Phase 16 is the real, live phase these rows
 * belong to. No ratings anywhere (§ 14's own component inventory:
 * "Recommendation Card … no ratings").
 */
export async function Recommendations() {
  const recommendations = await queryApprovedRecommendations()
  const locale = (await getLocale()) as Locale
  const tSection = await getTranslations('Recommendations')

  if (recommendations.length === 0) return null

  return (
    <section aria-labelledby="recommendations-title" className="section-y">
      <div className="container-page">
        <SectionHeader id="recommendations-title" eyebrow={tSection('eyebrow')} title={tSection('title')} description={tSection('description')} />

        <ul className="grid gap-4 md:grid-cols-2 lg:gap-6">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex">
              <RecommendationCard rec={rec} locale={locale} t={tSection} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const VERIFICATION_LABEL_KEY: Record<RecommendationVerification, string> = {
  'verified-request': 'verificationVerifiedRequest',
  'platform-review': 'verificationPlatformReview',
  'public-profile': 'verificationPublicProfile',
}

function RecommendationCard({
  rec,
  locale,
  t: tSection,
}: {
  rec: Recommendation
  locale: Locale
  t: Awaited<ReturnType<typeof getTranslations<'Recommendations'>>>
}) {
  const relatedHref = rec.relatedProjectSlug ? `/work/${rec.relatedProjectSlug}` : undefined

  return (
    <figure className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-6 md:p-7">
      <blockquote className="text-sm leading-relaxed text-foreground text-pretty">“{t(rec.statement, locale)}”</blockquote>

      <figcaption className="mt-auto flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="font-medium text-foreground">{rec.personName}</span>
          {rec.personTitle || rec.company ? (
            <span className="text-muted-foreground">
              {[rec.personTitle, rec.company].filter(Boolean).join(', ')}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span>{rec.relationship}</span>
          {rec.recommendationDate ? <time dateTime={rec.recommendationDate}>{formatDate(rec.recommendationDate, locale)}</time> : null}
          {relatedHref ? (
            <Link href={relatedHref} className="font-medium text-foreground underline-offset-4 hover:underline">
              {tSection('relatedProject')}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">
            <BadgeCheck aria-hidden="true" data-icon="inline-start" />
            {tSection(VERIFICATION_LABEL_KEY[rec.verification])}
          </Badge>
          {rec.sourceUrl ? (
            <a href={rec.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {tSection('viewSource')}
            </a>
          ) : null}
        </div>
      </figcaption>
    </figure>
  )
}
