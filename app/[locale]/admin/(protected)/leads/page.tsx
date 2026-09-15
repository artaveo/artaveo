import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PipelineFiltersBar } from '@/components/admin/pipeline/pipeline-filters'
import { CsvExportButton } from '@/components/admin/pipeline/csv-export-button'
import { StageTransitionControl } from '@/components/admin/pipeline/stage-transition-control'
import { SlaBadge } from '@/components/admin/pipeline/sla-badge'
import { canAccessLeads, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { computeSlaFromFirstResponse, getFirstResponseTimes, getResponseCommitment, listInquiries } from '@/lib/admin/pipeline'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'
import type { InquiryPriority, InquiryStage } from '@/types/pipeline'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('leadsTitle'),
    robots: { index: false, follow: false },
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const PAGE_SIZE = 20

export default async function LeadsPage({
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

  const stage = firstValue(sp.stage) as InquiryStage | undefined
  const priority = firstValue(sp.priority) as InquiryPriority | undefined
  const tag = firstValue(sp.tag)
  const q = firstValue(sp.q)
  const page = Math.max(1, Number(firstValue(sp.page)) || 1)

  const filters = { stage, priority, tag, q, page, pageSize: PAGE_SIZE }
  const [result, commitment] = await Promise.all([listInquiries(filters), getResponseCommitment()])

  if (result === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('leadsTitle')}</h1>
        <FormMessage variant="warning">{t('leadsNotConfigured')}</FormMessage>
      </div>
    )
  }

  const firstResponseTimes = await getFirstResponseTimes(result.inquiries.map((inquiry) => inquiry.id))
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('leadsEyebrow')}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('leadsTitle')}</h1>
        </div>
        <CsvExportButton filters={{ stage, priority, tag, q }} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <PipelineFiltersBar stage={stage} priority={priority} tag={tag} q={q} />
        </CardContent>
      </Card>

      {result.inquiries.length === 0 ? (
        <EmptyState title={t('leadsEmptyTitle')} description={t('leadsEmptyDescription')} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tableColumnCreated')}</TableHead>
                <TableHead>{t('tableColumnContact')}</TableHead>
                <TableHead>{t('tableColumnService')}</TableHead>
                <TableHead>{t('tableColumnStage')}</TableHead>
                <TableHead>{t('tableColumnPriority')}</TableHead>
                <TableHead>{t('tableColumnSla')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.inquiries.map((inquiry) => {
                const sla = computeSlaFromFirstResponse(
                  inquiry.createdAt,
                  firstResponseTimes[inquiry.id] ?? null,
                  commitment?.timezone ?? 'UTC',
                )
                return (
                  <TableRow key={inquiry.id}>
                    <TableCell label={t('tableColumnCreated')}>
                      {formatDate(inquiry.createdAt, locale as Locale)}
                    </TableCell>
                    <TableCell label={t('tableColumnContact')}>
                      <Link
                        href={`/admin/leads/${inquiry.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {inquiry.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                    </TableCell>
                    <TableCell label={t('tableColumnService')}>{inquiry.serviceSlug ?? '—'}</TableCell>
                    <TableCell label={t('tableColumnStage')}>
                      <StageTransitionControl inquiryId={inquiry.id} stage={inquiry.stage} />
                    </TableCell>
                    <TableCell label={t('tableColumnPriority')}>
                      {t(`priority${capitalize(inquiry.priority)}`)}
                    </TableCell>
                    <TableCell label={t('tableColumnSla')}>
                      <SlaBadge sla={sla} />
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
                <Button variant="outline" size="sm" render={<Link href={`/admin/leads?${buildQuery(sp, page - 1)}`} />}>
                  {t('paginationPrev')}
                </Button>
              )}
              {page >= totalPages ? (
                <Button variant="outline" size="sm" disabled>
                  {t('paginationNext')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" render={<Link href={`/admin/leads?${buildQuery(sp, page + 1)}`} />}>
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

function buildQuery(sp: { [key: string]: string | string[] | undefined }, page: number): string {
  const params = new URLSearchParams()
  for (const key of ['stage', 'priority', 'tag', 'q']) {
    const value = firstValue(sp[key])
    if (value) params.set(key, value)
  }
  params.set('page', String(page))
  return params.toString()
}
