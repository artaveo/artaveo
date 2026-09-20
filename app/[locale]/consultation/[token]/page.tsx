import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ManageActions } from '@/components/consultation/manage-actions'
import { ManageSummary } from '@/components/consultation/manage-summary'
import { SiteShell } from '@/components/site/site-shell'
import { NotFoundState } from '@/components/ui/states'
import { resolveConsultationToken } from '@/lib/consultation/queries'
import { isTerminal, looksLikeToken } from '@/lib/consultation/windows'
import type { Locale } from '@/types/content'

/**
 * A client's private page for their own consultation — reached only through
 * the link in their e-mail or on the confirmation screen. Like
 * `/recommend/[token]` it is not in § 15's page map (a private utility route),
 * always `noindex`, and rendered fresh on every request (it reads the token).
 * The page reads only what `toPublicConsultation` allows; everything it shows
 * is that client's own.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ConsultationManage' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

export default async function ConsultationManagePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = await params
  setRequestLocale(locale)

  const t = await getTranslations('ConsultationManage')
  const resolved = looksLikeToken(token) ? await resolveConsultationToken(token) : { state: 'not-found' as const }

  return (
    <SiteShell>
      <div className="container-page section-y max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('eyebrow')}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{t('pageTitle')}</h1>
        </div>

        {resolved.state === 'ok' ? (
          <div className="flex flex-col gap-8">
            <ManageSummary consultation={resolved.consultation} token={token} locale={locale as Locale} />
            {isTerminal(resolved.consultation.status) ? (
              <NotFoundState
                size="section"
                title={t('requestNew')}
                action={{ label: t('requestNew'), href: `/${locale}/consultation` }}
              />
            ) : (
              <ManageActions
                token={token}
                locale={locale as Locale}
                timezone={resolved.consultation.timezone}
                rescheduleRequests={resolved.consultation.rescheduleRequests}
              />
            )}
          </div>
        ) : resolved.state === 'expired' ? (
          <NotFoundState
            title={t('expiredTitle')}
            description={t('expiredDescription')}
            action={{ label: t('requestNew'), href: `/${locale}/consultation` }}
          />
        ) : (
          <NotFoundState
            title={t('invalidTitle')}
            description={t('invalidDescription')}
            action={{ label: t('requestNew'), href: `/${locale}/consultation` }}
          />
        )}
      </div>
    </SiteShell>
  )
}
