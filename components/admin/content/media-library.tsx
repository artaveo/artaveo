'use client'

import { Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { deleteMedia, updateMediaAlt } from '@/app/actions/media'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { FocalPointPicker } from '@/components/admin/content/focal-point-picker'
import { ALT_EXAMPLE } from '@/components/admin/content/field-examples'
import { LocalizedTextareaField, emptyLocalized } from '@/components/admin/content/localized-fields'
import { MediaUploadForm } from '@/components/admin/content/media-upload-form'
import { countByProject, filterMedia } from '@/lib/media-filter'
import { t as pick, type Locale } from '@/types/content'
import type { AdminMediaAsset, MediaProjectOption, MediaUsage } from '@/types/cms'

/** How many images are drawn at once; "show more" adds the next batch. */
const PAGE = 30

/** The parts of a project's images, in the order its page uses them. */
type PartKey = MediaUsage['kind'] | 'unused'
const PART_ORDER: PartKey[] = ['cover', 'hero', 'story', 'gallery', 'block', 'unused']
const PART_LABEL: Record<PartKey, string> = {
  cover: 'cmsMediaPartCover',
  hero: 'cmsMediaPartHero',
  story: 'cmsMediaPartStory',
  gallery: 'cmsMediaPartGallery',
  block: 'cmsMediaPartBlock',
  unused: 'cmsMediaPartUnused',
}
const USAGE_LABEL: Record<MediaUsage['kind'], string> = {
  cover: 'cmsMediaUsageCover',
  hero: 'cmsMediaUsageHero',
  story: 'cmsMediaUsageStory',
  gallery: 'cmsMediaUsageGallery',
  block: 'cmsMediaUsageBlock',
}

/**
 * Projects first (in the projects' own order), images tied to no project last;
 * inside a project, by where each image is used — its first use for that project
 * decides its part, so every image appears once.
 */
function groupMedia(assets: AdminMediaAsset[], projects: MediaProjectOption[]) {
  const order: (string | null)[] = [...projects.map((p) => p.id), null]
  return order
    .map((projectId) => {
      const own = assets.filter((asset) => asset.projectId === projectId)
      const parts = PART_ORDER.map((key) => ({
        key,
        assets: own.filter((asset) => {
          const use = asset.usages.find((u) => u.projectId === projectId) ?? asset.usages[0]
          return (use ? use.kind : 'unused') === key
        }),
      })).filter((part) => part.assets.length > 0)
      return { projectId, total: own.length, parts }
    })
    .filter((group) => group.total > 0)
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function useProjectTitle(projects: MediaProjectOption[]) {
  const locale = useLocale() as Locale
  return (id: string) => {
    const project = projects.find((p) => p.id === id)
    return project ? pick(project.title, locale) || project.title.en : '—'
  }
}

function ProjectSelect({ id, value, projects, disabled, onChange }: { id: string; value: string | null; projects: MediaProjectOption[]; disabled?: boolean; onChange: (next: string | null) => void }) {
  const t = useTranslations('Admin')
  const title = useProjectTitle(projects)
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t('cmsMediaProject')}</FieldLabel>
      <NativeSelect id={id} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">{t('cmsMediaNoProject')}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {title(project.id)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

/** Where the image appears on the site — or that it is not used anywhere yet. */
function UsageLine({ asset, projects }: { asset: AdminMediaAsset; projects: MediaProjectOption[] }) {
  const t = useTranslations('Admin')
  const title = useProjectTitle(projects)
  if (asset.usages.length === 0) return <p className="text-xs font-medium text-warning-text">{t('cmsMediaUnused')}</p>
  return (
    <ul className="flex flex-col gap-0.5 text-xs text-foreground">
      {asset.usages.map((usage) => (
        <li key={`${usage.kind}-${usage.projectId}`}>
          {t(USAGE_LABEL[usage.kind])} — <span className="text-muted-foreground">{title(usage.projectId)}</span>
        </li>
      ))}
    </ul>
  )
}

function AssetCard({ asset, projects, onDone }: { asset: AdminMediaAsset; projects: MediaProjectOption[]; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [alt, setAlt] = useState(asset.alt ?? emptyLocalized())
  const [focal, setFocal] = useState({ x: asset.focalX ?? 0.5, y: asset.focalY ?? 0.5 })
  const [projectId, setProjectId] = useState<string | null>(asset.projectId)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setPending(true)
    setError(null)
    const result = await updateMediaAlt(asset.id, { alt, focalX: focal.x, focalY: focal.y, projectId })
    if (!result.ok) {
      setError(result.code === 'missing-alt' ? t('cmsErrorMissingAlt') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(asset.usages.length > 0 ? t('cmsMediaDeleteUsedConfirm') : t('cmsConfirmDelete'))) return
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
        <UsageLine asset={asset} projects={projects} />
        <p className="text-xs text-muted-foreground">
          {asset.type} · {formatBytes(asset.sizeBytes)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
        </p>
        <LocalizedTextareaField
          id={`media-${asset.id}-alt`}
          label={t('cmsFieldAltText')}
          value={alt}
          onChange={setAlt}
          required
          disabled={pending}
          rows={3}
          stacked
          example={ALT_EXAMPLE}
          hint={t('cmsAltHint')}
        />
        <ProjectSelect id={`media-${asset.id}-project`} value={projectId} projects={projects} disabled={pending} onChange={setProjectId} />
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

/**
 * § 15's media library, organised since Phase 27 (owner's review): grouped by
 * project — each project with its own heading, images tied to no project last —
 * and inside a project by where each image is used (cover, top of the case study,
 * inside the text, gallery, a page section, not used yet). Every card says where
 * the image appears and shows its alt text in full. A filter shows one project
 * only; a search finds an image by alt text or file name; images are drawn a batch
 * at a time so a library of hundreds stays usable.
 */
export function MediaLibrary({ assets, projects }: { assets: AdminMediaAsset[]; projects: MediaProjectOption[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const title = useProjectTitle(projects)
  const [scope, setScope] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const counts = useMemo(() => countByProject(assets), [assets])
  const shown = useMemo(() => filterMedia(assets, scope, query), [assets, scope, query])
  const groups = useMemo(() => groupMedia(shown.slice(0, limit), projects), [shown, limit, projects])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsUploadMedia')}</p>
          <MediaUploadForm projects={projects} defaultProjectId={scope !== 'all' && scope !== 'none' ? scope : null} onUploaded={() => router.refresh()} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-56 flex-1">
          <FieldLabel htmlFor="media-scope">{t('cmsMediaShow')}</FieldLabel>
          <NativeSelect
            id="media-scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
              setLimit(PAGE)
            }}
          >
            <option value="all">
              {t('cmsMediaAll')} ({assets.length})
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {title(project.id)} ({counts.get(project.id) ?? 0})
              </option>
            ))}
            <option value="none">
              {t('cmsMediaNoProject')} ({counts.get('none') ?? 0})
            </option>
          </NativeSelect>
        </Field>
        <Field className="min-w-56 flex-1">
          <FieldLabel htmlFor="media-search">{t('cmsMediaSearch')}</FieldLabel>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="media-search"
              value={query}
              placeholder={t('cmsMediaSearchPlaceholder')}
              className="ps-8"
              onChange={(event) => {
                setQuery(event.target.value)
                setLimit(PAGE)
              }}
            />
          </div>
        </Field>
      </div>

      {shown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t('cmsMediaNothing')}</p> : null}

      {groups.map((group) => (
        <section key={group.projectId ?? 'none'} className="flex flex-col gap-5 rounded-xl border border-border p-4">
          <h2 className="text-base font-semibold text-foreground">
            {group.projectId ? title(group.projectId) : t('cmsMediaNoProject')}{' '}
            <span className="text-sm font-normal text-muted-foreground">({group.total})</span>
          </h2>
          {group.parts.map((part) => (
            <div key={part.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t(PART_LABEL[part.key])}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {part.assets.map((asset) => (
                  <AssetCard key={`${asset.id}-${asset.projectId ?? 'none'}`} asset={asset} projects={projects} onDone={() => router.refresh()} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      {shown.length > limit ? (
        <Button type="button" variant="outline" size="sm" className="self-center" onClick={() => setLimit(limit + PAGE)}>
          {t('cmsMediaShowMore', { count: shown.length - limit })}
        </Button>
      ) : null}
    </div>
  )
}
