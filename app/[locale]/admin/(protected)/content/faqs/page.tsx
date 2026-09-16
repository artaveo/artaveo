import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { FaqsEditor } from '@/components/admin/content/faqs-editor'
import { FormMessage } from '@/components/ui/form-controls'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { listGlobalFaqsAdmin } from '@/lib/admin/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsGlobalFaqsTitle'), robots: { index: false, follow: false } }
}

export default async function GlobalFaqsPage({
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
  const faqs = await listGlobalFaqsAdmin()

  if (faqs === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('cmsGlobalFaqsTitle')}</h1>
        <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsGlobalFaqsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsGlobalFaqsTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('cmsGlobalFaqsNote')}</p>
      </div>
      <FaqsEditor scope="global" serviceId={null} faqs={faqs} />
    </div>
  )
}
