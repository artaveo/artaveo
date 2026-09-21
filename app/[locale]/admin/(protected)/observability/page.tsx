import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { GroupStatusButtons } from '@/components/admin/observability/group-status-buttons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { EmptyState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canAccessNotifications, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import {
  getObservabilityOverview,
  lookupReference,
  type ErrorGroupView,
  type ObservabilityOverview,
  type OpsEventView,
  type ReferenceResult,
} from '@/lib/admin/observability'
import { formatDate } from '@/lib/format'
import type { Alert } from '@/lib/observability/alert-rules'
import { getEmailProviderInfo } from '@/lib/notifications/provider'
import type { Locale } from '@/types/content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('obsTitle'), robots: { index: false, follow: false } }
}

/** `notifications.failing` → `NotificationsFailing`: the suffix of that alert's translation keys. */
function alertKey(id: string): string {
  return id
    .split(/[._]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const LEVEL_VARIANT = { info: 'muted', warn: 'warning', error: 'destructive' } as const
const GROUP_VARIANT = { open: 'destructive', resolved: 'success', ignored: 'muted' } as const

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ObservabilityPage({
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
  const ref = firstValue(sp.ref)?.slice(0, 80)

  let overview: ObservabilityOverview | null = null
  let reference: ReferenceResult | null = null
  let unreadable = false
  try {
    ;[overview, reference] = await Promise.all([getObservabilityOverview(), ref ? lookupReference(ref) : Promise.resolve(null)])
  } catch {
    unreadable = true
  }

  const header = (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('obsEyebrow')}</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('obsTitle')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{t('obsIntro')}</p>
    </div>
  )

  if (unreadable) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {header}
        <FormMessage variant="destructive">{t('obsUnreadable')}</FormMessage>
      </div>
    )
  }
  if (!overview) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {header}
        <FormMessage variant="warning">{t('notifNotConfigured')}</FormMessage>
      </div>
    )
  }

  const loc = locale as Locale
  const dateTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  const provider = getEmailProviderInfo()
  const { facts } = overview

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {header}

      {/* Reference lookup — a plain GET form, so it works without client JavaScript. */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t('obsRefLabel')}</span>
              <input
                name="ref"
                defaultValue={ref ?? ''}
                maxLength={80}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm"
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              {t('obsRefButton')}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">{t('obsRefHint')}</p>
          {reference ? <ReferenceResultView result={reference} t={t} locale={loc} /> : null}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('obsAlertsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.alerts.length === 0 ? (
            <FormMessage variant="success">{t('obsAlertsNone')}</FormMessage>
          ) : (
            overview.alerts.map((alert) => <AlertRow key={alert.id} alert={alert} t={t} />)
          )}
          <p className="text-xs text-muted-foreground">{t('obsAlertsFootnote')}</p>
        </CardContent>
      </Card>

      {/* Health */}
      <Card>
        <CardHeader>
          <CardTitle>{t('obsHealthTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <HealthRow
            label={t('obsHealthDatabase')}
            value={overview.database.ok ? t('obsHealthDatabaseOk', { ms: overview.database.ms }) : t('obsHealthDatabaseDown')}
            ok={overview.database.ok}
          />
          <HealthRow
            label={t('obsHealthCron')}
            value={facts.events.lastCronAt ? formatDate(facts.events.lastCronAt, loc, dateTime) : t('obsHealthNeverYet')}
            ok={Boolean(facts.events.lastCronAt) && overview.cronSecretConfigured}
            note={!overview.cronSecretConfigured ? t('notifCronSecretMissing') : undefined}
          />
          <HealthRow
            label={t('obsHealthMonitor')}
            value={facts.events.lastMonitorAt ? formatDate(facts.events.lastMonitorAt, loc, dateTime) : t('obsHealthNeverYet')}
            ok={Boolean(facts.events.lastMonitorAt)}
            note={!facts.events.lastMonitorAt ? t('obsHealthMonitorHint') : undefined}
          />
          <HealthRow
            label={t('obsHealthEmail')}
            value={provider.deliversRealEmail ? t('obsHealthEmailReal') : t('obsHealthEmailLogOnly')}
            ok={provider.deliversRealEmail}
          />
          {overview.configFindings.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="font-medium">{t('obsConfigTitle')}</span>
              {overview.configFindings.map((finding) => (
                <FormMessage key={finding.id} variant={finding.severity === 'error' ? 'destructive' : 'warning'} className="text-xs">
                  <bdi dir="ltr" className="font-mono">
                    {finding.id}
                  </bdi>{' '}
                  {finding.message}
                </FormMessage>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Business events */}
      <Card>
        <CardHeader>
          <CardTitle>{t('obsFunnelTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('obsColumnEvent')}</TableHead>
                <TableHead>{t('obsFunnel24h')}</TableHead>
                <TableHead>{t('obsFunnel7d')}</TableHead>
                <TableHead>{t('obsFunnel30d')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.funnel.map((row) => (
                <TableRow key={row.name}>
                  <TableCell label={t('obsColumnEvent')}>{t(`obsEvent${alertKey(row.name)}`)}</TableCell>
                  <TableCell label={t('obsFunnel24h')}>
                    <span className="tabular-nums">{row.last24h}</span>
                  </TableCell>
                  <TableCell label={t('obsFunnel7d')}>
                    <span className="tabular-nums">{row.last7d}</span>
                  </TableCell>
                  <TableCell label={t('obsFunnel30d')}>
                    <span className="tabular-nums">{row.last30d}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">{t('obsFunnelFootnote')}</p>
        </CardContent>
      </Card>

      {/* Error groups */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t('obsGroupsTitle', { count: overview.openGroupCount })}</h2>
        {overview.groups.length === 0 ? (
          <EmptyState title={t('obsGroupsEmptyTitle')} description={t('obsGroupsEmptyDescription')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('obsColumnError')}</TableHead>
                <TableHead>{t('obsColumnWhere')}</TableHead>
                <TableHead>{t('obsColumnCount')}</TableHead>
                <TableHead>{t('obsColumnLastSeen')}</TableHead>
                <TableHead>{t('obsColumnReference')}</TableHead>
                <TableHead>{t('obsColumnStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.groups.map((group) => (
                <GroupRow key={group.fingerprint} group={group} t={t} locale={loc} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent events */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t('obsEventsTitle')}</h2>
        {overview.events.length === 0 ? (
          <EmptyState title={t('obsEventsEmptyTitle')} description={t('obsEventsEmptyDescription')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('obsColumnWhen')}</TableHead>
                <TableHead>{t('obsColumnEvent')}</TableHead>
                <TableHead>{t('obsColumnSubject')}</TableHead>
                <TableHead>{t('obsColumnReference')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.events.map((event) => (
                <EventRow key={event.id} event={event} t={t} locale={loc} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

type T = Awaited<ReturnType<typeof getTranslations<'Admin'>>>

function AlertRow({ alert, t }: { alert: Alert; t: T }) {
  const key = alertKey(alert.id)
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={alert.severity === 'error' ? 'destructive' : 'warning'}>{alert.severity === 'error' ? t('obsSeverityError') : t('obsSeverityWarning')}</Badge>
        <span className="font-medium">{t(`obsAlert${key}`)}</span>
        {alert.count > 1 ? <span className="text-xs text-muted-foreground tabular-nums">×{alert.count}</span> : null}
        {alert.detail ? (
          <bdi dir="ltr" className="font-mono text-xs text-muted-foreground">
            {alert.detail}
          </bdi>
        ) : null}
      </div>
      <p className="text-muted-foreground text-pretty">{t(`obsAlert${key}Action`)}</p>
    </div>
  )
}

function HealthRow({ label, value, ok, note }: { label: string; value: string; ok: boolean; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        <span className={ok ? 'font-medium' : 'font-medium text-destructive'}>{value}</span>
      </div>
      {note ? <p className="text-xs text-muted-foreground text-pretty">{note}</p> : null}
    </div>
  )
}

function RefLink({ id }: { id: string | null }) {
  if (!id) return <span className="text-muted-foreground">—</span>
  return (
    <Link href={`/admin/observability?ref=${id}`} className="font-mono text-xs text-primary underline-offset-4 hover:underline">
      <bdi dir="ltr">{id.slice(0, 8)}</bdi>
    </Link>
  )
}

function GroupRow({ group, t, locale }: { group: ErrorGroupView; t: T; locale: Locale }) {
  const dateTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  return (
    <TableRow>
      <TableCell label={t('obsColumnError')}>
        <div className="flex max-w-md flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <bdi dir="ltr" className="font-mono text-xs font-medium">
              {group.event}
            </bdi>
            <Badge variant="muted">{group.source}</Badge>
          </div>
          <bdi dir="auto" className="text-xs break-words text-muted-foreground">
            {group.name}: {group.message}
          </bdi>
        </div>
      </TableCell>
      <TableCell label={t('obsColumnWhere')}>
        {group.route ? (
          <bdi dir="ltr" className="font-mono text-xs">
            {group.route}
          </bdi>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell label={t('obsColumnCount')}>
        <span className="tabular-nums">{group.eventCount}</span>
      </TableCell>
      <TableCell label={t('obsColumnLastSeen')}>{formatDate(group.lastSeenAt, locale, dateTime)}</TableCell>
      <TableCell label={t('obsColumnReference')}>
        <div className="flex flex-col gap-1">
          <RefLink id={group.lastRequestId} />
          {group.digest ? (
            <Link href={`/admin/observability?ref=${encodeURIComponent(group.digest)}`} className="font-mono text-xs text-primary underline-offset-4 hover:underline">
              <bdi dir="ltr">#{group.digest}</bdi>
            </Link>
          ) : null}
        </div>
      </TableCell>
      <TableCell label={t('obsColumnStatus')}>
        <div className="flex flex-col items-start gap-2">
          <Badge variant={GROUP_VARIANT[group.status]}>{t(`obsGroupStatus${group.status.charAt(0).toUpperCase()}${group.status.slice(1)}`)}</Badge>
          <GroupStatusButtons fingerprint={group.fingerprint} status={group.status} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function EventRow({ event, t, locale }: { event: OpsEventView; t: T; locale: Locale }) {
  const dateTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  return (
    <TableRow>
      <TableCell label={t('obsColumnWhen')}>{formatDate(event.occurredAt, locale, dateTime)}</TableCell>
      <TableCell label={t('obsColumnEvent')}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={LEVEL_VARIANT[event.level]}>{event.level}</Badge>
          <bdi dir="ltr" className="font-mono text-xs">
            {event.name}
          </bdi>
        </div>
      </TableCell>
      <TableCell label={t('obsColumnSubject')}>
        {event.subjectType && event.subjectId ? (
          <bdi dir="ltr" className="font-mono text-xs">
            {event.subjectType}:{event.subjectId.slice(0, 8)}
          </bdi>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell label={t('obsColumnReference')}>
        <RefLink id={event.requestId} />
      </TableCell>
    </TableRow>
  )
}

function ReferenceResultView({ result, t, locale }: { result: ReferenceResult; t: T; locale: Locale }) {
  if (result.kind === 'invalid') return <FormMessage variant="warning">{t('obsRefInvalid')}</FormMessage>
  const dateTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  const total = result.groups.length + result.events.length + result.audit.length + result.notifications.length + result.inquiries.length + result.timeline.length
  if (total === 0) return <FormMessage variant="info">{t('obsRefNothing')}</FormMessage>

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 text-sm">
      <p className="font-medium">
        {t('obsRefFound')} <bdi dir="ltr" className="font-mono text-xs">{result.ref}</bdi>
      </p>
      <p className="text-xs text-muted-foreground">{t('obsRefLogHint')}</p>
      <ul className="flex flex-col gap-1">
        {result.groups.map((group) => (
          <li key={group.fingerprint}>
            {t('obsRefGroup')}: <bdi dir="ltr" className="font-mono text-xs">{group.event}</bdi> — <bdi dir="auto">{group.message}</bdi>
          </li>
        ))}
        {result.events.map((event) => (
          <li key={event.id}>
            {t('obsRefEvent')}: <bdi dir="ltr" className="font-mono text-xs">{event.name}</bdi> · {formatDate(event.occurredAt, locale, dateTime)}
          </li>
        ))}
        {result.audit.map((row) => (
          <li key={row.id}>
            {t('obsRefAudit')}: <bdi dir="ltr" className="font-mono text-xs">{row.action}</bdi> · {formatDate(row.at, locale, dateTime)}
          </li>
        ))}
        {result.inquiries.map((row) => (
          <li key={row.id}>
            {t('obsRefInquiry')}:{' '}
            <Link href={`/admin/leads/${row.id}`} className="text-primary underline-offset-4 hover:underline">
              {formatDate(row.createdAt, locale, dateTime)}
            </Link>
          </li>
        ))}
        {result.timeline.map((row) => (
          <li key={row.id}>
            {t('obsRefTimeline')}: <bdi dir="ltr" className="font-mono text-xs">{row.type}</bdi> · {formatDate(row.createdAt, locale, dateTime)}
          </li>
        ))}
        {result.notifications.map((row) => (
          <li key={row.id}>
            {t('obsRefNotification')}:{' '}
            <Link href={`/admin/notifications/${row.id}`} className="text-primary underline-offset-4 hover:underline">
              <bdi dir="ltr" className="font-mono text-xs">{row.kind}</bdi>
            </Link>{' '}
            · {row.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
