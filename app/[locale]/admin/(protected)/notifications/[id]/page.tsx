import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, NotFoundState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import {
  DeliveryLabel,
  kindLabelKey,
  NotificationStatusBadge,
} from '@/components/admin/notifications/notification-badges'
import { RetryNotificationButton } from '@/components/admin/notifications/retry-button'
import { canAccessNotifications, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getNotification } from '@/lib/admin/notifications'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'
import type { NotificationAttemptView } from '@/types/notifications'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('notifDetailEyebrow'),
    robots: { index: false, follow: false },
  }
}

function attemptResultKey(attempt: NotificationAttemptView): string {
  if (attempt.ok) return attempt.provider === 'console' ? 'notifAttemptLoggedOnly' : 'notifAttemptAccepted'
  return attempt.retryable ? 'notifAttemptFailedRetryable' : 'notifAttemptFailedPermanent'
}

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)
  if (!canAccessNotifications(session)) redirect(`/${locale}/admin`)

  const t = await getTranslations('Admin')
  const found = await getNotification(id)

  if (!found) {
    return (
      <NotFoundState
        title={t('notifNotFoundTitle')}
        action={{ label: t('notifBackToList'), href: `/${locale}/admin/notifications` }}
      />
    )
  }

  const { notification, attempts } = found
  const withTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', second: 'numeric' }
  const canRetry = notification.status === 'failed' || notification.status === 'exhausted'
  const isConsoleSent = notification.status === 'sent' && notification.lastProvider === 'console'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/notifications" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          &larr; {t('notifBackToList')}
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('notifDetailEyebrow')}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t(kindLabelKey(notification.kind))}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(notification.createdAt, locale as Locale, withTime)}
        </p>
      </div>

      {notification.status === 'exhausted' ? (
        <FormMessage variant="destructive">{t('notifDetailExhausted')}</FormMessage>
      ) : null}
      {isConsoleSent ? <FormMessage variant="warning">{t('notifNotDeliveredNote')}</FormMessage> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('notifStateSection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <NotificationStatusBadge status={notification.status} />
            <span className="tabular-nums">
              {t('notifColumnAttempts')}: {notification.attempts}/{notification.maxAttempts}
            </span>
            <span>
              {t('notifColumnDelivery')}: <DeliveryLabel status={notification.status} provider={notification.lastProvider} />
            </span>
          </div>
          {notification.status === 'failed' || notification.status === 'pending' ? (
            <p className="text-muted-foreground">
              {t('notifNextAttempt')}: {formatDate(notification.nextAttemptAt, locale as Locale, withTime)}
            </p>
          ) : null}
          {notification.sentAt ? (
            <p className="text-muted-foreground">
              {t('notifSentAt')}: {formatDate(notification.sentAt, locale as Locale, withTime)}
            </p>
          ) : null}
          {notification.lastError ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{t('notifLastError')}</span>
              <code dir="ltr" className="rounded-md bg-muted px-3 py-2 text-xs break-words whitespace-pre-wrap">
                {notification.lastError}
              </code>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            {canRetry ? <RetryNotificationButton id={notification.id} size="default" /> : null}
            {notification.inquiryId ? (
              <Link
                href={`/admin/leads/${notification.inquiryId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t('notifOpenInquiry')}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('notifAttemptsSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <EmptyState size="inline" title={t('notifAttemptsEmpty')} />
          ) : (
            <ol className="flex flex-col gap-4">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="flex flex-col gap-1 border-s-2 border-border ps-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      #{attempt.attemptNo} · {t(attemptResultKey(attempt))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(attempt.at, locale as Locale, withTime)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {attempt.provider}
                    {attempt.durationMs !== null ? ` · ${attempt.durationMs} ms` : ''}
                    {attempt.providerMessageId ? ` · ${attempt.providerMessageId}` : ''}
                  </p>
                  {attempt.error ? (
                    <code dir="ltr" className="text-xs break-words whitespace-pre-wrap text-muted-foreground">
                      {attempt.error}
                    </code>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('notifMessageSection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{t('notifFieldTo')}</span>
            <bdi dir="auto">{notification.recipientEmail}</bdi>
          </div>
          {notification.replyTo ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{t('notifFieldReplyTo')}</span>
              <bdi dir="auto">{notification.replyTo}</bdi>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{t('notifFieldSubject')}</span>
            <bdi dir="auto" className="font-medium">
              {notification.subject}
            </bdi>
          </div>
          {notification.attachmentNames.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{t('notifFieldAttachments')}</span>
              <bdi dir="ltr">{notification.attachmentNames.join(', ')}</bdi>
            </div>
          ) : null}
          {notification.requestId ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{t('obsRequestReference')}</span>
              <Link
                href={`/admin/observability?ref=${notification.requestId}`}
                className="w-fit font-mono text-xs text-primary underline-offset-4 hover:underline"
              >
                <bdi dir="ltr">{notification.requestId}</bdi>
              </Link>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{t('notifFieldBody')}</span>
            <pre
              dir={notification.locale === 'fa' ? 'rtl' : 'ltr'}
              className="overflow-x-auto rounded-md bg-muted px-3 py-3 font-sans text-sm whitespace-pre-wrap"
            >
              {notification.bodyText}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
