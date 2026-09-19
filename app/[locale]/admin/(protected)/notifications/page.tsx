import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DeliveryLabel,
  kindLabelKey,
  NotificationStatusBadge,
  statusLabelKey,
} from '@/components/admin/notifications/notification-badges'
import { NotificationFiltersBar } from '@/components/admin/notifications/notification-filters'
import { RetryNotificationButton } from '@/components/admin/notifications/retry-button'
import { SendDueButton } from '@/components/admin/notifications/send-due-button'
import { canAccessNotifications, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import {
  getNotificationSummary,
  listNotifications,
  NOTIFICATIONS_PAGE_SIZE,
  parseKindFilter,
  parseStatusFilter,
} from '@/lib/admin/notifications'
import { formatDate } from '@/lib/format'
import { getEmailProviderInfo } from '@/lib/notifications/provider'
import { NOTIFICATION_STATUSES } from '@/types/notifications'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('notifTitle'),
    robots: { index: false, follow: false },
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function buildQuery(sp: { [key: string]: string | string[] | undefined }, page: number): string {
  const params = new URLSearchParams()
  for (const key of ['status', 'kind']) {
    const value = firstValue(sp[key])
    if (value) params.set(key, value)
  }
  params.set('page', String(page))
  return params.toString()
}

export default async function NotificationsPage({
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
  if (!canAccessNotifications(session)) redirect(`/${locale}/admin`)

  const t = await getTranslations('Admin')

  const status = parseStatusFilter(firstValue(sp.status))
  const kind = parseKindFilter(firstValue(sp.kind))
  const page = Math.max(1, Number(firstValue(sp.page)) || 1)

  const [result, summary] = await Promise.all([
    listNotifications({ status, kind, page, pageSize: NOTIFICATIONS_PAGE_SIZE }),
    getNotificationSummary(),
  ])

  if (result === null || summary === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('notifTitle')}</h1>
        <FormMessage variant="warning">{t('notifNotConfigured')}</FormMessage>
      </div>
    )
  }

  const provider = getEmailProviderInfo()
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET)
  const totalPages = Math.max(1, Math.ceil(result.total / NOTIFICATIONS_PAGE_SIZE))
  const dateWithTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('notifEyebrow')}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('notifTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{t('notifIntro')}</p>
        </div>
        <SendDueButton disabled={summary.overdue === 0} />
      </div>

      {summary.counts.exhausted > 0 ? (
        <FormMessage variant="destructive">{t('notifExhaustedBanner', { count: summary.counts.exhausted })}</FormMessage>
      ) : null}

      {!provider.deliversRealEmail ? (
        <FormMessage variant="warning">
          {provider.misconfigured
            ? t('notifProviderMisconfigured', { requested: provider.requested })
            : t('notifProviderConsoleOff')}
        </FormMessage>
      ) : (
        <FormMessage variant="success">{t('notifProviderResendOn')}</FormMessage>
      )}

      {!cronSecretConfigured ? <FormMessage variant="warning">{t('notifCronSecretMissing')}</FormMessage> : null}

      {summary.recentInquiriesWithoutNotifications > 0 ? (
        <FormMessage variant="warning">
          {t('notifUncoveredInquiries', { count: summary.recentInquiriesWithoutNotifications })}{' '}
          <Link href="/admin/leads" className="font-medium underline underline-offset-4">
            {t('leadsNavLink')}
          </Link>
        </FormMessage>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3 lg:grid-cols-5">
          {NOTIFICATION_STATUSES.map((value) => (
            <div key={value} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t(statusLabelKey(value))}</span>
              <span className="text-2xl font-semibold tabular-nums">{summary.counts[value]}</span>
            </div>
          ))}
        </CardContent>
        <CardContent className="border-t border-border pt-4 text-sm text-muted-foreground">
          {summary.overdue > 0 && summary.oldestOverdueAt
            ? t('notifOverdue', {
                count: summary.overdue,
                date: formatDate(summary.oldestOverdueAt, locale as Locale, dateWithTime),
              })
            : t('notifNoOverdue')}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <NotificationFiltersBar status={status} kind={kind} />
        </CardContent>
      </Card>

      {result.notifications.length === 0 ? (
        <EmptyState title={t('notifEmptyTitle')} description={t('notifEmptyDescription')} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('notifColumnCreated')}</TableHead>
                <TableHead>{t('notifColumnKind')}</TableHead>
                <TableHead>{t('notifColumnRecipient')}</TableHead>
                <TableHead>{t('notifColumnStatus')}</TableHead>
                <TableHead>{t('notifColumnAttempts')}</TableHead>
                <TableHead>{t('notifColumnDelivery')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('notifColumnActions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.notifications.map((item) => (
                <TableRow key={item.id}>
                  <TableCell label={t('notifColumnCreated')}>
                    {formatDate(item.createdAt, locale as Locale, dateWithTime)}
                  </TableCell>
                  <TableCell label={t('notifColumnKind')}>
                    <Link
                      href={`/admin/notifications/${item.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {t(kindLabelKey(item.kind))}
                    </Link>
                  </TableCell>
                  <TableCell label={t('notifColumnRecipient')}>
                    <bdi dir="auto" className="text-xs">
                      {item.recipientEmail}
                    </bdi>
                  </TableCell>
                  <TableCell label={t('notifColumnStatus')}>
                    <NotificationStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell label={t('notifColumnAttempts')}>
                    <span className="tabular-nums">
                      {item.attempts}/{item.maxAttempts}
                    </span>
                  </TableCell>
                  <TableCell label={t('notifColumnDelivery')}>
                    <DeliveryLabel status={item.status} provider={item.lastProvider} />
                  </TableCell>
                  <TableCell label={t('notifColumnActions')}>
                    {item.status === 'failed' || item.status === 'exhausted' ? (
                      <RetryNotificationButton id={item.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
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
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/notifications?${buildQuery(sp, page - 1)}`} />}
                >
                  {t('paginationPrev')}
                </Button>
              )}
              {page >= totalPages ? (
                <Button variant="outline" size="sm" disabled>
                  {t('paginationNext')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/notifications?${buildQuery(sp, page + 1)}`} />}
                >
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
