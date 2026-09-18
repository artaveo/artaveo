import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ArticleView } from '@/components/insights/article-view'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-controls'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getArticleAdmin } from '@/lib/admin/content'
import { parseArticleBody } from '@/lib/articles/markdown'
import { articleFromDraft, buildArticleDetail } from '@/lib/insights'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsArticlePreviewTitle'), robots: { index: false, follow: false } }
}

/**
 * § 15's "draft → **preview** → publish": the editor sees the article
 * exactly as a reader would — same `ArticleView` the public route renders
 * (ToC, code blocks, images, related items) — in the language chosen with
 * `?lang=`, inside the admin (session- and MFA-gated like every admin page,
 * `noindex`). It reads the draft straight from the database, so it works for
 * any status and never touches the public cache.
 */
export default async function ArticlePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { locale, id } = await params
  const { lang } = await searchParams
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')
  const draft = await getArticleAdmin(id)
  if (!draft) return <NotFoundState size="page" title={t('cmsArticleNotFoundTitle')} />

  const previewLocale: Locale = lang === 'fa' ? 'fa' : 'en'
  const detail = await buildArticleDetail(articleFromDraft(draft))
  const warnings = parseArticleBody(draft.body[previewLocale]).warnings

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p>{t('cmsArticlePreviewBanner', { status: t(`cmsArticleStatus${draft.status.charAt(0).toUpperCase()}${draft.status.slice(1)}` as Parameters<typeof t>[0]) })}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={previewLocale === 'en' ? 'default' : 'outline'} render={<Link href={`/admin/content/articles/${id}/preview?lang=en`} />}>
            {t('cmsArticlePreviewEn')}
          </Button>
          <Button size="sm" variant={previewLocale === 'fa' ? 'default' : 'outline'} render={<Link href={`/admin/content/articles/${id}/preview?lang=fa`} />}>
            {t('cmsArticlePreviewFa')}
          </Button>
          <Button size="sm" variant="outline" render={<Link href={`/admin/content/articles/${id}`} />}>
            {t('cmsArticlePreviewBack')}
          </Button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mx-auto w-full max-w-5xl">
          <FormMessage variant="warning">
            {warnings
              .map((warning) => t(warning === 'unsafe-link' ? 'cmsArticleWarnUnsafeLink' : 'cmsArticleWarnUnsupportedImage'))
              .join(' ')}
          </FormMessage>
        </div>
      ) : null}

      {/* The article renders in the *previewed* language regardless of the admin UI language — direction and font are set on this wrapper. */}
      <div lang={previewLocale} dir={previewLocale === 'fa' ? 'rtl' : 'ltr'} className={previewLocale === 'fa' ? 'font-persian' : undefined}>
        <ArticleView article={detail} locale={previewLocale} />
      </div>
    </div>
  )
}
