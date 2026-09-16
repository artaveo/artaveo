'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { addProjectMedia, removeProjectMedia } from '@/app/actions/media'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminMediaAsset, AdminProjectMediaItem } from '@/types/cms'

const KINDS: Array<'desktop' | 'mobile' | 'diagram'> = ['desktop', 'mobile', 'diagram']

/**
 * § 15.2-adjacent scope, deferred there and finished here: `project_media`
 * (screenshots/diagrams) attaches already-uploaded `media_assets` rows to
 * a project. Uploading happens on the media library page
 * (`/admin/content/media`) — this editor only picks from what's already
 * there, so alt text and focal point stay defined once, centrally, not
 * duplicated per project attachment.
 */
export function ProjectMediaEditor({
  projectId,
  projectSlug,
  items,
  library,
}: {
  projectId: string
  projectSlug: string | null
  items: AdminProjectMediaItem[]
  library: AdminMediaAsset[]
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [mediaId, setMediaId] = useState(library[0]?.id ?? '')
  const [kind, setKind] = useState<'desktop' | 'mobile' | 'diagram'>('desktop')
  const [caption, setCaption] = useState(emptyLocalized())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleAdd() {
    if (!mediaId) return
    setPending(true)
    setError(false)
    const result = await addProjectMedia(projectId, projectSlug, { mediaId, kind, caption })
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setCaption(emptyLocalized())
    setPending(false)
    router.refresh()
  }

  async function handleRemove(rowId: string) {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await removeProjectMedia(rowId, projectId, projectSlug)
    if (!result.ok) setError(true)
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsProjectMediaEmpty')}</p> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center gap-4 pt-6">
            {item.asset ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already-hosted asset
              <img src={item.asset.url} alt="" className="h-16 w-24 rounded object-cover" style={{ objectPosition: `${(item.asset.focalX ?? 0.5) * 100}% ${(item.asset.focalY ?? 0.5) * 100}%` }} />
            ) : null}
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">{t(`cmsMediaKind${capitalize(item.kind)}`)}</p>
              <p className="text-xs text-muted-foreground">{item.caption?.en || item.asset?.alt?.en || ''}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => handleRemove(item.id)} className="text-destructive-text">
              <Trash2 aria-hidden="true" data-icon="inline-start" />
              {t('cmsDelete')}
            </Button>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsAddProjectMedia')}</p>
          {library.length === 0 ? (
            <FormMessage variant="info">{t('cmsProjectMediaNoLibrary')}</FormMessage>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="pm-asset">{t('cmsFieldMediaAsset')}</FieldLabel>
                <Select value={mediaId} onValueChange={(v) => v && setMediaId(v)} disabled={pending}>
                  <SelectTrigger id="pm-asset">
                    <SelectValue>{library.find((a) => a.id === mediaId)?.alt?.en || mediaId}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {library.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.alt?.en || asset.url}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="pm-kind">{t('cmsFieldMediaKind')}</FieldLabel>
                <Select value={kind} onValueChange={(v) => v && setKind(v as typeof kind)} disabled={pending}>
                  <SelectTrigger id="pm-kind">
                    <SelectValue>{t(`cmsMediaKind${capitalize(kind)}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`cmsMediaKind${capitalize(k)}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <LocalizedTextField id="pm-caption" label={t('cmsFieldCaption')} value={caption} onChange={setCaption} disabled={pending} />
              <Button type="button" size="sm" disabled={pending} onClick={handleAdd} className="self-start">
                {t('cmsAddProjectMedia')}
              </Button>
            </>
          )}
          {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
