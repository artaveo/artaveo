'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldLabel } from '@/components/ui/form-controls'

/**
 * § 15's "focal-point cropping for responsive crops" — rather than a
 * server-side image-processing pipeline (no such dependency exists in
 * this codebase, and adding one is its own decision), the stored
 * `focal_x`/`focal_y` (0–1, image-relative) are meant to drive CSS
 * `object-position: {focalX*100}% {focalY*100}%` wherever an image is
 * displayed at a different aspect ratio than it was uploaded at — a
 * real, working "responsive crop" without literally re-encoding the
 * file into multiple sizes. Click anywhere on the preview to move the
 * point; the crosshair marker shows exactly where it landed.
 */
export function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  disabled,
}: {
  imageUrl: string
  focalX: number
  focalY: number
  onChange: (next: { x: number; y: number }) => void
  disabled?: boolean
}) {
  const t = useTranslations('Admin')

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    onChange({ x, y })
  }

  return (
    <Field>
      <FieldLabel>{t('cmsFieldFocalPoint')}</FieldLabel>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted"
        style={{ cursor: disabled ? 'default' : 'crosshair' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of an already-uploaded asset, not a public page image */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('cmsFocalPointHint')}</p>
    </Field>
  )
}
