'use client'

import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { uploadMedia } from '@/app/actions/media'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { NativeSelect } from '@/components/ui/native-select'
import { FocalPointPicker } from '@/components/admin/content/focal-point-picker'
import { LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import { ALT_EXAMPLE } from '@/components/admin/content/field-examples'
import { t as pick, type Locale } from '@/types/content'
import type { MediaProjectOption } from '@/types/cms'

/**
 * § 15's upload, as one reusable form: the file, its focal point, its alt text in
 * both languages (required — every public image has one) and, since Phase 27, the
 * project it belongs to. Used by the media library page and inside the image
 * picker, so an image can be uploaded right where it is needed — a project's
 * cover, a gallery block — without leaving the form.
 */
export function MediaUploadForm({
  projects,
  defaultProjectId = null,
  onUploaded,
  idPrefix = 'upload',
}: {
  projects: MediaProjectOption[]
  defaultProjectId?: string | null
  onUploaded: (asset: { id: string; url: string; projectId: string | null }) => void
  idPrefix?: string
}) {
  const t = useTranslations('Admin')
  const locale = useLocale() as Locale
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [alt, setAlt] = useState(emptyLocalized())
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 })
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null)
  }

  async function handleUpload() {
    if (!file) return
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('file', file)
    formData.set('altEn', alt.en)
    formData.set('altFa', alt.fa)
    formData.set('focalX', String(focal.x))
    formData.set('focalY', String(focal.y))
    if (projectId) formData.set('projectId', projectId)

    const result = await uploadMedia(formData)
    setPending(false)
    if (!result.ok) {
      const messages: Record<string, string> = {
        'invalid-type': t('cmsErrorInvalidType'),
        'too-large': t('cmsErrorTooLarge'),
        'missing-alt': t('cmsErrorMissingAlt'),
      }
      setError(messages[result.code] ?? t('errorForbidden'))
      return
    }

    setFile(null)
    setPreviewUrl(null)
    setAlt(emptyLocalized())
    setFocal({ x: 0.5, y: 0.5 })
    if (fileInputRef.current) fileInputRef.current.value = ''
    onUploaded({ id: result.id, url: result.url, projectId })
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        disabled={pending}
        onChange={handleFileChange}
        className="text-sm"
        aria-label={t('cmsUploadMedia')}
      />
      {previewUrl ? (
        <>
          <FocalPointPicker imageUrl={previewUrl} focalX={focal.x} focalY={focal.y} onChange={setFocal} disabled={pending} />
          <LocalizedTextField
            id={`${idPrefix}-alt`}
            label={t('cmsFieldAltText')}
            value={alt}
            onChange={setAlt}
            required
            disabled={pending}
            example={ALT_EXAMPLE}
          />
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-project`}>{t('cmsMediaProject')}</FieldLabel>
            <NativeSelect id={`${idPrefix}-project`} value={projectId ?? ''} disabled={pending} onChange={(event) => setProjectId(event.target.value || null)}>
              <option value="">{t('cmsMediaNoProject')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {pick(project.title, locale) || project.title.en}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>{t('cmsMediaProjectHint')}</FieldDescription>
          </Field>
        </>
      ) : null}
      {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
      <Button type="button" size="sm" disabled={pending || !file} onClick={handleUpload} className="self-start">
        <Upload aria-hidden="true" data-icon="inline-start" />
        {pending ? t('cmsSaving') : t('cmsUploadMedia')}
      </Button>
      <p className="text-xs text-muted-foreground">{t('cmsUploadRules')}</p>
    </div>
  )
}
