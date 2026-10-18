'use client'

import { Check, ImagePlus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { MediaUploadForm } from '@/components/admin/content/media-upload-form'
import { countByProject, filterMedia } from '@/lib/media-filter'
import { cn } from '@/lib/utils'
import { t as pick, type Locale } from '@/types/content'
import type { AdminMediaAsset, MediaProjectOption } from '@/types/cms'

/** How many thumbnails are drawn at once; "show more" adds the next batch. */
const PAGE = 48

function usable(asset: AdminMediaAsset): boolean {
  return Boolean(asset.alt?.en?.trim() && asset.alt?.fa?.trim())
}

/**
 * Phase 27 — picks one image from the media library: a project's cover, a gallery
 * image, a case-study screenshot. The library can hold hundreds of images across
 * dozens of projects, so the picker opens on **this project's images**, can be
 * switched to another project, to "not tied to a project" or to everything, can be
 * searched by alt text or file name, and draws thumbnails a batch at a time. A new
 * image can be uploaded right here (it belongs to this project by default) and is
 * picked at once. Images without alt text in both languages are shown but cannot
 * be picked — they may not appear publicly (§ 15).
 */
export function MediaPicker({
  id,
  label,
  value,
  library,
  projects,
  currentProjectId = null,
  onChange,
  disabled,
  allowNone = true,
  description,
}: {
  id: string
  label: string
  value: string | null
  library: AdminMediaAsset[]
  projects: MediaProjectOption[]
  /** The project being edited — the picker opens on its images and uploads into it. */
  currentProjectId?: string | null
  onChange: (mediaId: string | null) => void
  disabled?: boolean
  allowNone?: boolean
  description?: string
}) {
  const t = useTranslations('Admin')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<string>(currentProjectId ?? 'all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [uploading, setUploading] = useState(false)
  /** An image uploaded here is picked before the page has refreshed its library. */
  const [justUploaded, setJustUploaded] = useState<{ id: string; url: string } | null>(null)

  const selected = library.find((asset) => asset.id === value) ?? (justUploaded && justUploaded.id === value ? { url: justUploaded.url, alt: null } : null)
  const counts = useMemo(() => countByProject(library), [library])
  const shown = useMemo(() => filterMedia(library, scope, query), [library, scope, query])
  const projectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    return project ? pick(project.title, locale) || project.title.en : '—'
  }

  function openPicker() {
    setScope(currentProjectId && (counts.get(currentProjectId) ?? 0) > 0 ? currentProjectId : 'all')
    setQuery('')
    setLimit(PAGE)
    setUploading(false)
    setOpen(true)
  }

  function choose(mediaId: string | null) {
    onChange(mediaId)
    setOpen(false)
  }

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-button`}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small admin preview of an arbitrary library image
            <img src={selected.url} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm text-muted-foreground">
            {selected ? (selected.alt ? pick(selected.alt, locale) : t('cmsMediaJustUploaded')) : t('cmsMediaNone')}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button id={`${id}-button`} type="button" size="sm" variant="outline" disabled={disabled} onClick={openPicker}>
              <ImagePlus aria-hidden="true" data-icon="inline-start" />
              {selected ? t('cmsMediaChange') : t('cmsMediaChoose')}
            </Button>
            {allowNone && value ? (
              <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>
                <X aria-hidden="true" data-icon="inline-start" />
                {t('cmsMediaRemove')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4 overflow-hidden">
          <div className="pe-8">
            <DialogTitle className="text-base font-semibold">{label}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t('cmsMediaPickerHint')}</DialogDescription>
          </div>

          {uploading ? (
            <div className="min-h-0 overflow-y-auto">
              <MediaUploadForm
                idPrefix={`${id}-upload`}
                projects={projects}
                defaultProjectId={currentProjectId}
                onUploaded={(asset) => {
                  setJustUploaded({ id: asset.id, url: asset.url })
                  router.refresh()
                  choose(asset.id)
                }}
              />
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setUploading(false)}>
                {t('cmsMediaBackToLibrary')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <Field className="min-w-48 flex-1">
                  <FieldLabel htmlFor={`${id}-scope`}>{t('cmsMediaShow')}</FieldLabel>
                  <NativeSelect id={`${id}-scope`} value={scope} onChange={(event) => { setScope(event.target.value); setLimit(PAGE) }}>
                    {currentProjectId ? (
                      <option value={currentProjectId}>
                        {t('cmsMediaThisProject')} ({counts.get(currentProjectId) ?? 0})
                      </option>
                    ) : null}
                    <option value="all">
                      {t('cmsMediaAll')} ({library.length})
                    </option>
                    <option value="none">
                      {t('cmsMediaNoProject')} ({counts.get('none') ?? 0})
                    </option>
                    {projects
                      .filter((project) => project.id !== currentProjectId)
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {projectName(project.id)} ({counts.get(project.id) ?? 0})
                        </option>
                      ))}
                  </NativeSelect>
                </Field>
                <Field className="min-w-48 flex-1">
                  <FieldLabel htmlFor={`${id}-search`}>{t('cmsMediaSearch')}</FieldLabel>
                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id={`${id}-search`} value={query} placeholder={t('cmsMediaSearchPlaceholder')} className="ps-8" onChange={(event) => { setQuery(event.target.value); setLimit(PAGE) }} />
                  </div>
                </Field>
                <Button type="button" size="sm" onClick={() => setUploading(true)}>
                  <ImagePlus aria-hidden="true" data-icon="inline-start" />
                  {t('cmsMediaUploadHere')}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {shown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('cmsMediaNothing')}</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {shown.slice(0, limit).map((asset) => {
                      const ok = usable(asset)
                      const isSelected = asset.id === value
                      return (
                        <li key={asset.id}>
                          <button
                            type="button"
                            disabled={!ok}
                            onClick={() => choose(asset.id)}
                            aria-pressed={isSelected}
                            title={ok ? pick(asset.alt!, locale) : t('cmsMediaNeedsAlt')}
                            className={cn(
                              'group relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-start outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                              isSelected ? 'border-brand ring-2 ring-brand' : 'border-border hover:border-foreground/40',
                              !ok && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <span className="block aspect-[4/3] w-full overflow-hidden bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of arbitrary library images, lazily loaded */}
                              <img src={asset.url} alt="" loading="lazy" className="size-full object-cover object-top" />
                            </span>
                            <span className="line-clamp-2 p-2 text-xs text-muted-foreground">
                              {ok ? pick(asset.alt!, locale) : t('cmsMediaNeedsAlt')}
                            </span>
                            {scope === 'all' && asset.projectId ? (
                              <span className="truncate px-2 pb-2 text-[11px] text-muted-foreground/80">{projectName(asset.projectId)}</span>
                            ) : null}
                            {isSelected ? (
                              <span className="absolute top-2 end-2 inline-flex size-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                                <Check aria-hidden="true" className="size-4" />
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {shown.length > limit ? (
                  <div className="mt-4 flex justify-center">
                    <Button type="button" variant="outline" size="sm" onClick={() => setLimit(limit + PAGE)}>
                      {t('cmsMediaShowMore', { count: shown.length - limit })}
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Field>
  )
}
