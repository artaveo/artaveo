import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { RecommendationForm } from '@/components/recommend/recommendation-form'
import { SiteShell } from '@/components/site/site-shell'
import { NotFoundState, SuccessState } from '@/components/ui/states'
import { resolveRequestToken } from '@/lib/recommendations'
import type { Locale } from '@/types/content'

/**
 * § 16 — the recommender's side of the single-use request link. Not in
 * § 15's page map (that lists the site's primary pages; this is a
 * private utility route reached only via a link the owner hands out
 * directly, the same category `/consultation`'s future reschedule/cancel
 * links will be — Phase 20). Always noindex: nothing here is content a
 * search engine should surface.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'RecommendPage' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

export default async function RecommendPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = await params
  setRequestLocale(locale)

  const t = await getTranslations('RecommendPage')
  const resolved = await resolveRequestToken(token, locale as Locale)

  return (
    <SiteShell>
      <div className="container-page section-y max-w-xl">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('eyebrow')}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{t('pageTitle')}</h1>
        </div>

        {resolved.state === 'open' ? (
          <RecommendationForm
            token={token}
            locale={locale as Locale}
            priorSubmission={resolved.priorSubmission}
            moderationNote={resolved.moderationNote}
            suggestedRelatedProjectTitle={resolved.suggestedRelatedProjectTitle}
            suggestedRelatedServiceTitle={resolved.suggestedRelatedServiceTitle}
          />
        ) : resolved.state === 'closed' ? (
          <SuccessState title={t('closedTitle')} description={t('closedDescription')} />
        ) : (
          <NotFoundState title={t('invalidTitle')} description={t('invalidDescription')} />
        )}
      </div>
    </SiteShell>
  )
}
