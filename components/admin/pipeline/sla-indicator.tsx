import { getTranslations } from 'next-intl/server'

import { formatDate } from '@/lib/format'
import { t as localize, type Locale, type LocalizedText } from '@/types/content'
import type { SlaStatus } from '@/types/pipeline'
import { Badge } from '@/components/ui/badge'

export async function SlaIndicator({
  sla,
  responseCommitment,
  locale,
}: {
  sla: SlaStatus
  responseCommitment: LocalizedText | null
  locale: Locale
}) {
  const t = await getTranslations('Admin')

  return (
    <div className="flex flex-col gap-2 text-sm">
      {responseCommitment ? (
        <p className="text-muted-foreground">
          {t('slaResponseCommitment')}: {localize(responseCommitment, locale)}
        </p>
      ) : null}

      {sla.firstResponseAt === null ? (
        <Badge variant="warning">{t('slaPending')}</Badge>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sla.metSameDay ? 'success' : 'destructive'}>
            {sla.metSameDay ? t('slaMetSameDay') : t('slaMissedSameDay')}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('slaFirstResponseAt')}: {formatDate(sla.firstResponseAt, locale, { hour: 'numeric', minute: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}
