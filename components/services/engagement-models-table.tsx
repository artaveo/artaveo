import { useLocale, useTranslations } from 'next-intl'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t, type EngagementModel, type Locale } from '@/types/content'

/**
 * EngagementModelsTable — the site-wide § 7.2 engagement-models table
 * (Discovery Sprint · Fixed-scope Project · Productized Service · Care Plan
 * · Long-term Part-time). Uses the shared `Table` primitive, which already
 * restacks each row into a labelled card on mobile — the right pattern
 * here since these are five independent, non-comparable rows (unlike the
 * three-tiers-of-one-service comparison in `PackageComparison`, which needs
 * a tier switcher instead).
 */
export function EngagementModelsTable({ models }: { models: EngagementModel[] }) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServicesIndex')

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-balance">
        {t18n('engagementModelsTitle')}
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
        {t18n('engagementModelsDescription')}
      </p>
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>{t18n('engagementModel')}</TableHead>
            <TableHead>{t18n('engagementWhenItFits')}</TableHead>
            <TableHead>{t18n('engagementBilling')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.id}>
              <TableCell label={t18n('engagementModel')} className="font-medium">
                {t(model.name, locale)}
              </TableCell>
              <TableCell label={t18n('engagementWhenItFits')}>{t(model.whenItFits, locale)}</TableCell>
              <TableCell label={t18n('engagementBilling')}>{t(model.billing, locale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
