import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import type { SlaStatus } from '@/types/pipeline'

export async function SlaBadge({ sla }: { sla: SlaStatus }) {
  const t = await getTranslations('Admin')

  if (sla.firstResponseAt === null) {
    return <Badge variant="warning">{t('slaPending')}</Badge>
  }

  return <Badge variant={sla.metSameDay ? 'success' : 'destructive'}>{sla.metSameDay ? t('slaMetSameDay') : t('slaMissedSameDay')}</Badge>
}
