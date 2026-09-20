import type { VariantProps } from 'class-variance-authority'
import { useTranslations } from 'next-intl'

import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { NotificationKind, NotificationStatus } from '@/types/notifications'

type Variant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_VARIANT: Record<NotificationStatus, Variant> = {
  pending: 'muted',
  sending: 'info',
  sent: 'success',
  failed: 'warning',
  exhausted: 'destructive',
}

const STATUS_KEY: Record<NotificationStatus, string> = {
  pending: 'notifStatusPending',
  sending: 'notifStatusSending',
  sent: 'notifStatusSent',
  failed: 'notifStatusFailed',
  exhausted: 'notifStatusExhausted',
}

const KIND_KEY: Record<NotificationKind, string> = {
  'owner-alert': 'notifKindOwnerAlert',
  'client-confirmation': 'notifKindClientConfirmation',
  'evidence-submitted': 'notifKindEvidenceSubmitted',
  'content-published': 'notifKindContentPublished',
  'system-alert': 'notifKindSystemAlert',
  'recommendation-request': 'notifKindRecommendationRequest',
  'recommendation-changes': 'notifKindRecommendationChanges',
  'consultation-requested': 'notifKindConsultationRequested',
  'consultation-received': 'notifKindConsultationReceived',
  'consultation-confirmed': 'notifKindConsultationConfirmed',
  'consultation-cancelled': 'notifKindConsultationCancelled',
  'consultation-client-update': 'notifKindConsultationClientUpdate',
}

export function statusLabelKey(status: NotificationStatus): string {
  return STATUS_KEY[status]
}

export function kindLabelKey(kind: NotificationKind): string {
  return KIND_KEY[kind]
}

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const t = useTranslations('Admin')
  return <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_KEY[status])}</Badge>
}

/**
 * Says what a "sent" message really was. The console provider records a
 * message as sent (so the pipeline runs end to end) but nothing leaves the
 * server — that must never read as a delivered e-mail.
 */
export function DeliveryLabel({ status, provider }: { status: NotificationStatus; provider: string | null }) {
  const t = useTranslations('Admin')
  if (!provider) return <span className="text-muted-foreground">—</span>
  if (provider === 'console') {
    return (
      <span className="text-muted-foreground">
        {status === 'sent' ? t('notifDeliveryLoggedOnly') : t('notifProviderConsole')}
      </span>
    )
  }
  return <span>{t('notifProviderResend')}</span>
}
