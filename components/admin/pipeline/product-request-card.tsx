import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/products/money'
import { t, type Locale } from '@/types/content'
import type { InquiryKind, ProductSnapshot } from '@/types/inquiry'

/** `Admin.<key>` for each request kind — shared by the lead list and this card. */
export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = {
  project: 'inquiryKindProject',
  'product-purchase': 'inquiryKindPurchase',
  'product-demo': 'inquiryKindDemo',
}

/**
 * Phase 27.5 — what a product request named, in the lead's detail view: the
 * product, the chosen way to get it with its price, and the after-sales
 * services — as they were when the client sent it (the snapshot), so a later
 * price change never rewrites what was asked for.
 */
export function ProductRequestCard({ kind, snapshot, locale }: { kind: InquiryKind; snapshot: ProductSnapshot | null; locale: Locale }) {
  const tAdmin = useTranslations('Admin')
  const tKind = useTranslations('SaleOptionKinds')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {tAdmin('productRequestTitle')}
          <Badge variant="brand-soft">{tAdmin(INQUIRY_KIND_LABEL[kind])}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {snapshot ? (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase">{tAdmin('fieldProduct')}</span>
              <span>{t(snapshot.product.title, locale)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase">{tAdmin('fieldSaleOption')}</span>
              <span>
                {snapshot.option
                  ? `${t(snapshot.option.title, locale)} (${tKind(snapshot.option.kind)}) — ${formatMoney(snapshot.option.price, snapshot.option.billingPeriod, locale)}`
                  : tAdmin('saleOptionNotChosen')}
              </span>
            </div>
            {snapshot.services.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground uppercase">{tAdmin('fieldProductServices')}</span>
                <ul className="list-disc ps-5">
                  {snapshot.services.map((service) => (
                    <li key={service.id}>
                      {t(service.title, locale)} — {formatMoney(service.price, service.period, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">{tAdmin('productSnapshotNote')}</p>
          </>
        ) : (
          <p className="text-muted-foreground">{tAdmin('productSnapshotMissing')}</p>
        )}
      </CardContent>
    </Card>
  )
}
