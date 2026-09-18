import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ArticleForm } from '@/components/admin/content/article-form'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { articleCompleteness, getArticleAdmin, getArticleFormOptions } from '@/lib/admin/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  const article = await getArticleAdmin(id)
  return { title: article ? article.title.en || article.slug : t('cmsArticlesTitle'), robots: { index: false, follow: false } }
}

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')
  const [article, options] = await Promise.all([getArticleAdmin(id), getArticleFormOptions(id)])

  if (!article || !options) {
    return <NotFoundState size="page" title={t('cmsArticleNotFoundTitle')} />
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsArticlesEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{article.title.en || article.slug}</h1>
      </div>
      <ArticleForm mode="edit" article={article} completeness={articleCompleteness(article)} options={options} />
    </div>
  )
}
