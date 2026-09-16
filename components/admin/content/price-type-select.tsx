'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldLabel } from '@/components/ui/form-controls'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PriceType } from '@/types/content'

/**
 * § 7.2's `Price.type` — every price on the site is `'quote'` today (D-04
 * unresolved), but the editor still offers `'fixed'`/`'from'` so a package
 * or add-on is ready the moment D-04 resolves, without a schema change.
 */
export function PriceTypeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: PriceType
  onChange: (next: PriceType) => void
  disabled?: boolean
}) {
  const t = useTranslations('Admin')
  const types: PriceType[] = ['quote', 'from', 'fixed']

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t('cmsFieldPriceType')}</FieldLabel>
      <Select value={value} onValueChange={(next) => next && onChange(next as PriceType)} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue>{t(`cmsPriceType${capitalize(value)}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`cmsPriceType${capitalize(type)}`)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
