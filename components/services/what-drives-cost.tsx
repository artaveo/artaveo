import { useLocale, useTranslations } from 'next-intl'

import { t, type LocalizedText, type Locale } from '@/types/content'

/**
 * WhatDrivesCost — the § 7.2 "What drives cost" block: the concrete factors
 * that move a service's price within its typical range. Purely factual
 * (number of roles, pages, integrations…) — never a number itself, so it
 * carries no D-04 dependency.
 */
export function WhatDrivesCost({ factors }: { factors: LocalizedText[] }) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ServiceDetail')

  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {t18n('whatDrivesCost')}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {factors.map((factor) => (
          <li key={factor.en} className="flex gap-2.5 text-sm leading-relaxed">
            <span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-[2px] bg-brand" />
            <span className="text-pretty text-muted-foreground">{t(factor, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
