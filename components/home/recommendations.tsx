import { BadgeCheck } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BandInner, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/format'
import { getApprovedRecommendations } from '@/lib/recommendations'
import { t, type Locale, type Recommendation, type RecommendationVerification } from '@/types/content'

/**
 * Home recommendations (§ 14.0 Recommendation Card: kept, hidden until real,
 * no ratings). Phase 29.2 moved it onto the warm panel of Design System 2.0.
 * Rendered only when at least one approved recommendation is published
 * (Phase 16); otherwise nothing at all.
 */
export async function Recommendations() {
  const recommendations = await getApprovedRecommendations()
  if (recommendations.length === 0) return null
  const locale = (await getLocale()) as Locale
  const tSection = await getTranslations('Recommendations')

  return (
    <PaperPanel aria-labelledby="recommendations-title" data-slot="home-recommendations">
      <BandInner className="flex flex-col gap-10">
        <SectionHeading tone="paper" id="recommendations-title" eyebrow={tSection('eyebrow')} title={tSection('title')} lead={tSection('description')} />
        <ul className="grid gap-4 @3xl:grid-cols-2">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex">
              <RecommendationCard rec={rec} locale={locale} t={tSection} />
            </li>
          ))}
        </ul>
      </BandInner>
    </PaperPanel>
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
    <figure className="flex w-full flex-col gap-5 rounded-card-lg border border-paper-line bg-paper-card p-7 text-paper-foreground shadow-card">
      <blockquote className="text-body text-pretty">“{t(rec.statement, locale)}”</blockquote>
      <figcaption className="mt-auto flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold">{rec.personName}</span>
          {rec.personTitle || rec.company ? <span className="text-paper-muted">{[rec.personTitle, rec.company].filter(Boolean).join(locale === 'fa' ? '، ' : ', ')}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small text-paper-muted">
          <span>{rec.relationship}</span>
          {rec.recommendationDate ? <time dateTime={rec.recommendationDate}>{formatDate(rec.recommendationDate, locale)}</time> : null}
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck aria-hidden="true" className="size-4 text-gold-deep" />
            {tSection(VERIFICATION_LABEL_KEY[rec.verification])}
          </span>
          {rec.sourceUrl ? (
            <a href={rec.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-paper-foreground underline-offset-4 hover:underline">
              {tSection('viewSource')}
            </a>
          ) : null}
          {relatedHref ? (
            <Link href={relatedHref} className="font-semibold text-paper-foreground underline-offset-4 hover:underline">
              {tSection('relatedProject')}
            </Link>
          ) : null}
        </div>
      </figcaption>
    </figure>
  )
}
