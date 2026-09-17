import { useTranslations } from 'next-intl'

import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { RecommendationRequestStatus, RecommendationStatus } from '@/types/cms'
import type { VariantProps } from 'class-variance-authority'

const STATUS_VARIANT: Record<RecommendationStatus, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  pending: 'info',
  'changes-requested': 'warning',
  approved: 'success',
  rejected: 'destructive',
}

const STATUS_MESSAGE_KEY: Record<RecommendationStatus, string> = {
  pending: 'cmsRecStatusPending',
  'changes-requested': 'cmsRecStatusChangesRequested',
  approved: 'cmsRecStatusApproved',
  rejected: 'cmsRecStatusRejected',
}

export function RecommendationStatusBadge({ status }: { status: RecommendationStatus }) {
  const t = useTranslations('Admin')
  return <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_MESSAGE_KEY[status])}</Badge>
}

const REQUEST_STATUS_VARIANT: Record<RecommendationRequestStatus, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  awaiting: 'muted',
  submitted: 'success',
  revoked: 'destructive',
  expired: 'outline',
}

const REQUEST_STATUS_MESSAGE_KEY: Record<RecommendationRequestStatus, string> = {
  awaiting: 'cmsRecRequestStatusAwaiting',
  submitted: 'cmsRecRequestStatusSubmitted',
  revoked: 'cmsRecRequestStatusRevoked',
  expired: 'cmsRecRequestStatusExpired',
}

export function RecommendationRequestStatusBadge({ status }: { status: RecommendationRequestStatus }) {
  const t = useTranslations('Admin')
  return <Badge variant={REQUEST_STATUS_VARIANT[status]}>{t(REQUEST_STATUS_MESSAGE_KEY[status])}</Badge>
}
