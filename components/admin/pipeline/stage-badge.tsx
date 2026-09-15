import { useTranslations } from 'next-intl'

import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { InquiryStage } from '@/types/pipeline'
import type { VariantProps } from 'class-variance-authority'

const STAGE_VARIANT: Record<InquiryStage, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  new: 'muted',
  reviewed: 'info',
  qualified: 'info',
  contacted: 'brand-soft',
  discovery: 'brand-soft',
  proposal: 'warning',
  won: 'success',
  lost: 'destructive',
  archived: 'outline',
}

const STAGE_MESSAGE_KEY: Record<InquiryStage, string> = {
  new: 'stageNew',
  reviewed: 'stageReviewed',
  qualified: 'stageQualified',
  contacted: 'stageContacted',
  discovery: 'stageDiscovery',
  proposal: 'stageProposal',
  won: 'stageWon',
  lost: 'stageLost',
  archived: 'stageArchived',
}

export function StageBadge({ stage }: { stage: InquiryStage }) {
  const t = useTranslations('Admin')
  return <Badge variant={STAGE_VARIANT[stage]}>{t(STAGE_MESSAGE_KEY[stage])}</Badge>
}

export function stageLabelKey(stage: InquiryStage): string {
  return STAGE_MESSAGE_KEY[stage]
}
