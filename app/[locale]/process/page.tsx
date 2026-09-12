import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ProcessContent } from '@/components/process/process-content'
import { SiteShell } from '@/components/site/site-shell'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ProcessPage' })
  return {
    title: t('metaTitle'),
    description: t('description'),
  }
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <SiteShell>
      <ProcessContent />
    </SiteShell>
  )
}
