import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ArticleForm } from '@/components/admin/content/article-form'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getArticleFormOptions } from '@/lib/admin/content'
import { FormMessage } from '@/components/ui/form-controls'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsNewArticle'), robots: { index: false, follow: false } }
}

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')
  const options = await getArticleFormOptions()
  if (!options) return <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsArticlesEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsNewArticle')}</h1>
      </div>
      <ArticleForm mode="create" options={options} />
    </div>
  )
}
