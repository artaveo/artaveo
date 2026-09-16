import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { EngagementModelForm } from '@/components/admin/content/engagement-model-form'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { engagementModelCompleteness, getEngagementModelAdmin } from '@/lib/admin/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  const model = await getEngagementModelAdmin(id)
  return { title: model ? model.title.en || model.slug : t('cmsEngagementModelsTitle'), robots: { index: false, follow: false } }
}

export default async function EditEngagementModelPage({
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
  const model = await getEngagementModelAdmin(id)

  if (!model) {
    return <NotFoundState size="page" title={t('cmsEngagementModelNotFoundTitle')} />
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsEngagementModelsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{model.title.en || model.slug}</h1>
      </div>
      <EngagementModelForm mode="edit" model={model} completeness={engagementModelCompleteness(model)} />
    </div>
  )
}
