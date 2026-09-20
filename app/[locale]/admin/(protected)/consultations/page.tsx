import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ConsultationStatusBadge, CONSULTATION_STATUS_SUFFIX } from '@/components/consultation/consultation-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { EmptyState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { canAccessLeads, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import {
  CONSULTATIONS_PAGE_SIZE,
  countConsultationsAwaitingOwner,
  listConsultations,
  parseConsultationStatus,
} from '@/lib/consultation/queries'
import { describeUtcRange } from '@/lib/consultation/time'
import { allWindowsPassed } from '@/lib/consultation/windows'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'
import { CONSULTATION_STATUSES } from '@/types/consultation'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('consultationsTitle'), robots: { index: false, follow: false } }
}

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * `/admin/consultations` — every call request, newest first. Owner-only, by the
 * same rule as the leads it belongs to (§ 13: an editor never sees lead data).
 */
export default async function ConsultationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)
  if (!canAccessLeads(session)) redirect(`/${locale}/admin`)

  const t = await getTranslations('Admin')
  const status = parseConsultationStatus(firstValue(sp.status))
  const page = Math.max(1, Number(firstValue(sp.page)) || 1)

  const [result, awaiting] = await Promise.all([
    listConsultations({ status, page }),
    countConsultationsAwaitingOwner(),
  ])

  if (result === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('consultationsTitle')}</h1>
        <FormMessage variant="warning">{t('consultationsNotConfigured')}</FormMessage>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(result.total / CONSULTATIONS_PAGE_SIZE))
  const now = new Date()
  const query = (nextPage: number) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    params.set('page', String(nextPage))
    return params.toString()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('consultationsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('consultationsTitle')}</h1>
      </div>

      {awaiting ? <FormMessage variant="info">{t('consultationsAwaitingBanner', { count: awaiting })}</FormMessage> : null}

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <Button variant={status ? 'outline' : 'default'} size="sm" render={<Link href="/admin/consultations" />}>
            {t('consultationsFilterAll')}
          </Button>
          {CONSULTATION_STATUSES.map((value) => (
            <Button
              key={value}
              variant={status === value ? 'default' : 'outline'}
              size="sm"
              render={<Link href={`/admin/consultations?status=${value}`} />}
            >
              {t(`consultationStatus${CONSULTATION_STATUS_SUFFIX[value]}`)}
            </Button>
          ))}
        </CardContent>
      </Card>

      {result.consultations.length === 0 ? (
        <EmptyState title={t('consultationsEmptyTitle')} description={t('consultationsEmptyDescription')} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('consultationsColumnRequested')}</TableHead>
                <TableHead>{t('consultationsColumnClient')}</TableHead>
                <TableHead>{t('consultationsColumnStatus')}</TableHead>
                <TableHead>{t('consultationsColumnTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.consultations.map((consultation) => {
                const call =
                  consultation.confirmedStart && consultation.confirmedEnd
                    ? { start: consultation.confirmedStart, end: consultation.confirmedEnd }
                    : null
                const awaitingOwner = consultation.status === 'requested' || consultation.status === 'rescheduled'
                const passed = awaitingOwner && allWindowsPassed(consultation.windows, now)
                return (
                  <TableRow key={consultation.id}>
                    <TableCell label={t('consultationsColumnRequested')}>
                      {formatDate(consultation.createdAt, locale as Locale)}
                    </TableCell>
                    <TableCell label={t('consultationsColumnClient')}>
                      <Link
                        href={`/admin/consultations/${consultation.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {consultation.inquiry.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{consultation.inquiry.email}</p>
                    </TableCell>
                    <TableCell label={t('consultationsColumnStatus')}>
                      <div className="flex flex-col items-start gap-1">
                        <ConsultationStatusBadge
                          status={consultation.status}
                          label={t(`consultationStatus${CONSULTATION_STATUS_SUFFIX[consultation.status]}`)}
                        />
                        {passed ? <span className="text-xs text-destructive-text">{t('consultationWindowsPassed')}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell label={t('consultationsColumnTime')}>
                      <bdi dir="ltr" className="text-xs">
                        {call
                          ? describeUtcRange(call)
                          : consultation.windows[0]
                            ? `${describeUtcRange(consultation.windows[0])}${consultation.windows.length > 1 ? ` (+${consultation.windows.length - 1})` : ''}`
                            : '—'}
                      </bdi>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('paginationPageOf', { page, totalPages })}</p>
            <div className="flex gap-2">
              {page <= 1 ? (
                <Button variant="outline" size="sm" disabled>
                  {t('paginationPrev')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" render={<Link href={`/admin/consultations?${query(page - 1)}`} />}>
                  {t('paginationPrev')}
                </Button>
              )}
              {page >= totalPages ? (
                <Button variant="outline" size="sm" disabled>
                  {t('paginationNext')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" render={<Link href={`/admin/consultations?${query(page + 1)}`} />}>
                  {t('paginationNext')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
