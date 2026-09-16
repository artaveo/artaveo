import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { publishService, unpublishService } from '@/app/actions/content'
import { AddonsEditor } from '@/components/admin/content/addons-editor'
import { FaqsEditor } from '@/components/admin/content/faqs-editor'
import { PackagesEditor } from '@/components/admin/content/packages-editor'
import { ProcessStepsEditor } from '@/components/admin/content/process-steps-editor'
import { PublishControl } from '@/components/admin/content/publish-control'
import { ServiceForm } from '@/components/admin/content/service-form'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getServiceAdmin, serviceCompleteness } from '@/lib/admin/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  const service = await getServiceAdmin(id)
  return { title: service ? service.title.en || service.slug : t('cmsServicesTitle'), robots: { index: false, follow: false } }
}

export default async function EditServicePage({
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
  const service = await getServiceAdmin(id)

  if (!service) {
    return <NotFoundState size="page" title={t('cmsServiceNotFoundTitle')} />
  }

  const completeness = serviceCompleteness(service)
  const publishServiceForId = publishService.bind(null, id)
  const unpublishServiceForId = unpublishService.bind(null, id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsServicesEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{service.title.en || service.slug}</h1>
      </div>

      <PublishControl
        published={service.published}
        completeness={completeness}
        previewHref={`/${locale}/admin/content/services/${id}/preview`}
        onPublish={publishServiceForId}
        onUnpublish={unpublishServiceForId}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionCoreFields')}</h2>
        <ServiceForm mode="edit" service={service} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionProcessSteps')}</h2>
        <ProcessStepsEditor serviceId={id} steps={service.process} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionPackages')}</h2>
        <PackagesEditor serviceId={id} packages={service.packages} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionAddons')}</h2>
        <AddonsEditor serviceId={id} addons={service.addOns} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionFaqs')}</h2>
        <FaqsEditor scope="service" serviceId={id} faqs={service.faq} />
      </section>
    </div>
  )
}
