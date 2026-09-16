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
import type { Locale } from '@/types/content'

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
        </div>
        <Button size="sm" render={<Link href="/admin/content/services/new" />}>
          {t('cmsNewService')}
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState title={t('cmsServicesEmptyTitle')} description={t('cmsServicesEmptyDescription')} />
      ) : (
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
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell label={t('cmsColumnTitle')}>
                      <Link
                        href={`/admin/content/services/${service.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {service.title.en || service.title.fa || service.slug}
                      </Link>
                      <p className="text-xs text-muted-foreground">{service.slug}</p>
                    </TableCell>
                    <TableCell label={t('cmsColumnStatus')}>
                      <Badge variant={service.published ? 'success' : 'muted'}>
                        {service.published ? t('cmsStatusPublished') : t('cmsStatusDraft')}
                      </Badge>
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
      )}
    </div>
  )
}
