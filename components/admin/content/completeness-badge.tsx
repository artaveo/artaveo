import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import type { LocaleCompleteness } from '@/types/cms'

/** § 15's "per-locale completeness indicator" — one badge per locale, green when that locale's required fields are all filled in. */
export function CompletenessBadges({ completeness }: { completeness: LocaleCompleteness }) {
  const t = useTranslations('Admin')
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={completeness.en ? 'success' : 'outline'}>{t('cmsLocaleEn')}</Badge>
      <Badge variant={completeness.fa ? 'success' : 'outline'}>{t('cmsLocaleFa')}</Badge>
    </div>
  )
}
