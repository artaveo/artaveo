'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldDescription, FieldLabel } from '@/components/ui/form-controls'
import { NativeSelect } from '@/components/ui/native-select'
import type { AdminMediaAsset } from '@/types/cms'

/**
 * Phase 27 — picks one image from the media library (a project's cover, a gallery
 * image). Uploading happens on the media library page, where alt text is required;
 * this only chooses among what is there. Images without alt text in both languages
 * are listed but disabled, since they may not appear publicly (§ 15).
 */
export function MediaPicker({
  id,
  label,
  value,
  library,
  onChange,
  disabled,
  allowNone = true,
  description,
}: {
  id: string
  label: string
  value: string | null
  library: AdminMediaAsset[]
  onChange: (mediaId: string | null) => void
  disabled?: boolean
  allowNone?: boolean
  description?: string
}) {
  const t = useTranslations('Admin')
  const selected = library.find((asset) => asset.id === value)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-start gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small admin preview of an arbitrary library image
            <img src={selected.url} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <NativeSelect
          id={id}
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || null)}
          className="min-w-0 flex-1"
        >
          {allowNone ? <option value="">{t('cmsMediaNone')}</option> : null}
          {library.map((asset) => {
            const usable = Boolean(asset.alt?.en?.trim() && asset.alt?.fa?.trim())
            const name = asset.alt?.en?.trim() || asset.url.split('/').pop() || asset.id
            return (
              <option key={asset.id} value={asset.id} disabled={!usable}>
                {usable ? name : `${name} — ${t('cmsMediaNeedsAlt')}`}
              </option>
            )
          })}
        </NativeSelect>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}
