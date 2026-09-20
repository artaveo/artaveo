import type { ConsultationStatus } from '@/types/consultation'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'

type Variant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export const CONSULTATION_STATUS_VARIANT: Record<ConsultationStatus, Variant> = {
  requested: 'warning',
  confirmed: 'success',
  rescheduled: 'info',
  cancelled: 'muted',
  completed: 'muted',
}

/** Message keys are per namespace (`ConsultationManage.status…` for the client, `Admin.consultationStatus…` for the owner). */
export const CONSULTATION_STATUS_SUFFIX: Record<ConsultationStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export function ConsultationStatusBadge({ status, label }: { status: ConsultationStatus; label: string }) {
  return <Badge variant={CONSULTATION_STATUS_VARIANT[status]}>{label}</Badge>
}
