import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { listServicesAdmin } from '@/lib/admin/content'
import { formatDate } from '@/lib/format'
import { SERVICE_KINDS, type Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsServicesTitle'), robots: { index: false, follow: false } }
}

export default async function ServicesListPage({
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
  const tKind = await getTranslations('ServiceKinds')
  const services = await listServicesAdmin()

  if (services === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('cmsServicesTitle')}</h1>
        <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsServicesEyebrow')}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsServicesTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('cmsServicesNote')}</p>
        </div>
        <Button size="sm" render={<Link href="/admin/content/services/new" />}>
          {t('cmsNewService')}
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState title={t('cmsServicesEmptyTitle')} description={t('cmsServicesEmptyDescription')} />
      ) : (
        // Owner's review: grouped by kind of software (27.4), each kind with its own heading.
        <div className="flex flex-col gap-6">
          {[...SERVICE_KINDS, null].map((kind) => {
            const group = services.filter((service) => (service.kind ?? null) === kind)
            if (group.length === 0) return null
            return (
              <section key={kind ?? 'none'} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {kind ? tKind(kind) : t('cmsServicesNoKind')} <span className="font-normal text-muted-foreground">({group.length})</span>
                </h2>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('cmsColumnTitle')}</TableHead>
                          <TableHead>{t('cmsColumnStatus')}</TableHead>
                          <TableHead>{t('cmsColumnCompleteness')}</TableHead>
                          <TableHead>{t('cmsColumnUpdated')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell label={t('cmsColumnTitle')}>
                              <Link href={`/admin/content/services/${service.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                                {service.title[locale as Locale] || service.title.en || service.slug}
                              </Link>
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                /services/{service.slug}
                              </p>
                            </TableCell>
                            <TableCell label={t('cmsColumnStatus')}>
                              <Badge variant={service.published ? 'success' : 'muted'}>{service.published ? t('cmsStatusPublished') : t('cmsStatusDraft')}</Badge>
                            </TableCell>
                            <TableCell label={t('cmsColumnCompleteness')}>
                              <CompletenessBadges completeness={service.completeness} />
                            </TableCell>
                            <TableCell label={t('cmsColumnUpdated')}>{formatDate(service.updatedAt, locale as Locale)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
