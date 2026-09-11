import { useTranslations } from 'next-intl'

import { CTASection } from '@/components/ui/patterns'

export function FinalCta() {
  const t = useTranslations('FinalCta')

  return (
    <CTASection
      title={
        <>
          {t('titleLine1')}
          <span className="block text-muted-foreground">{t('titleLine2')}</span>
        </>
      }
      description={t('description')}
      primaryAction={{ href: '/contact', label: t('startProject') }}
      secondaryAction={{ href: '/work', label: t('viewWork') }}
    />
  )
}
