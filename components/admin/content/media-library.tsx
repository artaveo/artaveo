'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Upload } from 'lucide-react'

import { deleteMedia, updateMediaAlt, uploadMedia } from '@/app/actions/media'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { FocalPointPicker } from '@/components/admin/content/focal-point-picker'
import { LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminMediaAsset } from '@/types/cms'

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function AssetCard({ asset, onDone }: { asset: AdminMediaAsset; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [alt, setAlt] = useState(asset.alt ?? emptyLocalized())
  const [focal, setFocal] = useState({ x: asset.focalX ?? 0.5, y: asset.focalY ?? 0.5 })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setPending(true)
    setError(null)
    const result = await updateMediaAlt(asset.id, { alt, focalX: focal.x, focalY: focal.y })
    if (!result.ok) {
      setError(result.code === 'missing-alt' ? t('cmsErrorMissingAlt') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deleteMedia(asset.id)
    if (!result.ok) setError(t('errorForbidden'))
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <FocalPointPicker imageUrl={asset.url} focalX={focal.x} focalY={focal.y} onChange={setFocal} disabled={pending} />
        <p className="text-xs text-muted-foreground">
          {asset.type} · {formatBytes(asset.sizeBytes)}
        </p>
        <LocalizedTextField id={`media-${asset.id}-alt`} label={t('cmsFieldAltText')} value={alt} onChange={setAlt} required disabled={pending} />
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
            {t('cmsSaveChanges')}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleDelete} className="text-destructive-text">
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            {t('cmsDelete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function UploadCard({ onDone }: { onDone: () => void }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [alt, setAlt] = useState(emptyLocalized())
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 })
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

    const result = await uploadMedia(formData)
    if (!result.ok) {
      const messages: Record<string, string> = {
        'invalid-type': t('cmsErrorInvalidType'),
        'too-large': t('cmsErrorTooLarge'),
        'missing-alt': t('cmsErrorMissingAlt'),
      }
      setError(messages[result.code] ?? t('errorForbidden'))
      setPending(false)
      return
    }

    setFile(null)
    setPreviewUrl(null)
    setAlt(emptyLocalized())
    setFocal({ x: 0.5, y: 0.5 })
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPending(false)
    router.refresh()
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <p className="text-sm font-medium text-foreground">{t('cmsUploadMedia')}</p>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" disabled={pending} onChange={handleFileChange} className="text-sm" />
        {previewUrl ? (
          <>
            <FocalPointPicker imageUrl={previewUrl} focalX={focal.x} focalY={focal.y} onChange={setFocal} disabled={pending} />
            <LocalizedTextField id="upload-alt" label={t('cmsFieldAltText')} value={alt} onChange={setAlt} required disabled={pending} />
          </>
        ) : null}
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button type="button" size="sm" disabled={pending || !file} onClick={handleUpload} className="self-start">
          <Upload aria-hidden="true" data-icon="inline-start" />
          {pending ? t('cmsSaving') : t('cmsUploadMedia')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('cmsUploadRules')}</p>
      </CardContent>
    </Card>
  )
}

export function MediaLibrary({ assets }: { assets: AdminMediaAsset[] }) {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-4">
      <UploadCard onDone={() => router.refresh()} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onDone={() => router.refresh()} />
        ))}
      </div>
    </div>
  )
}
