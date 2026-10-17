'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  createProjectBlock,
  deleteProjectBlock,
  publishProjectBlock,
  reorderProjectBlocks,
  unpublishProjectBlock,
  updateProjectBlock,
} from '@/app/actions/products'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ChildRowControls, moved } from '@/components/admin/content/child-row-controls'
import {
  LocalizedListField,
  LocalizedTextareaField,
  LocalizedTextField,
  emptyLocalized,
} from '@/components/admin/content/localized-fields'
import { MediaPicker } from '@/components/admin/content/media-picker'
import { videoWatchUrl } from '@/lib/products/blocks'
import { PROJECT_BLOCK_TYPES, type LocalizedText, type ProjectBlockType } from '@/types/content'
import type { AdminMediaAsset, AdminProjectBlock, BlockInput } from '@/types/cms'

/**
 * Phase 27.2 — builds a project page from blocks: add one of nine types, edit it
 * in both languages, move it up or down, show or hide it, delete it. A new block
 * starts hidden; it can be shown once it is complete in both languages.
 */

// Block bodies differ per type; the per-type fields below read them by name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DraftBody = Record<string, any>
type Draft = { title: LocalizedText; body: DraftBody }

const EMPTY = (): LocalizedText => emptyLocalized()

/** The stored body → the editable draft (a video is edited as its address). */
function toDraft(block: AdminProjectBlock): Draft {
  const body = { ...block.body } as DraftBody
  if (block.type === 'video' && body.provider && body.videoId) {
    body.url = videoWatchUrl({ provider: body.provider, videoId: body.videoId })
  }
  return { title: block.title ?? EMPTY(), body }
}

function toInput(type: ProjectBlockType, draft: Draft): BlockInput {
  const title = draft.title.en.trim() || draft.title.fa.trim() ? draft.title : null
  const body = { ...draft.body }
  if (type === 'video') {
    delete body.provider
    delete body.videoId
  }
  return { type, title, body }
}

function BlockFields({ type, draft, setDraft, media, pending, idPrefix }: { type: ProjectBlockType; draft: Draft; setDraft: (next: Draft) => void; media: AdminMediaAsset[]; pending: boolean; idPrefix: string }) {
  const t = useTranslations('Admin')
  const body = draft.body
  const setBody = (patch: Record<string, unknown>) => setDraft({ ...draft, body: { ...body, ...patch } })

  switch (type) {
    case 'intro':
    case 'challenge':
    case 'result':
      return <LocalizedTextareaField id={`${idPrefix}-text`} label={t('cmsBlockText')} value={body.text ?? EMPTY()} rows={4} disabled={pending} onChange={(text) => setBody({ text })} required />

    case 'features':
      return (
        <>
          <LocalizedTextareaField id={`${idPrefix}-text`} label={t('cmsBlockLeadText')} value={body.text ?? EMPTY()} rows={2} disabled={pending} onChange={(text) => setBody({ text })} />
          <FieldDescription>{t('cmsBlockFeaturesNote')}</FieldDescription>
        </>
      )

    case 'audience':
      return (
        <>
          <LocalizedTextareaField id={`${idPrefix}-text`} label={t('cmsBlockLeadText')} value={body.text ?? EMPTY()} rows={2} disabled={pending} onChange={(text) => setBody({ text })} />
          <LocalizedListField id={`${idPrefix}-items`} label={t('cmsBlockItems')} items={body.items ?? []} disabled={pending} onChange={(items) => setBody({ items })} addLabel={t('cmsAddItem')} />
        </>
      )

    case 'gallery': {
      const images: { mediaId: string; caption?: LocalizedText }[] = body.images ?? []
      const setImages = (next: typeof images) => setBody({ images: next })
      return (
        <div className="flex flex-col gap-3">
          {images.map((image, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <MediaPicker id={`${idPrefix}-image-${index}`} label={t('cmsBlockImage')} value={image.mediaId || null} library={media} allowNone={false} disabled={pending} onChange={(mediaId) => setImages(images.map((img, i) => (i === index ? { ...img, mediaId: mediaId ?? '' } : img)))} />
              <LocalizedTextField id={`${idPrefix}-caption-${index}`} label={t('cmsBlockCaption')} value={image.caption ?? EMPTY()} disabled={pending} onChange={(caption) => setImages(images.map((img, i) => (i === index ? { ...img, caption } : img)))} />
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setImages(images.filter((_, i) => i !== index))} className="self-start text-destructive-text">
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('cmsDelete')}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending || media.length === 0} onClick={() => setImages([...images, { mediaId: media.find((m) => m.alt?.en && m.alt?.fa)?.id ?? '' }])} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsBlockAddImage')}
          </Button>
        </div>
      )
    }

    case 'features-by-role': {
      const groups: { role: LocalizedText; items: LocalizedText[] }[] = body.groups ?? []
      const setGroups = (next: typeof groups) => setBody({ groups: next })
      return (
        <div className="flex flex-col gap-3">
          {groups.map((group, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <LocalizedTextField id={`${idPrefix}-role-${index}`} label={t('cmsBlockRole')} value={group.role} disabled={pending} onChange={(role) => setGroups(groups.map((g, i) => (i === index ? { ...g, role } : g)))} />
              <LocalizedListField id={`${idPrefix}-role-items-${index}`} label={t('cmsBlockItems')} items={group.items} disabled={pending} onChange={(items) => setGroups(groups.map((g, i) => (i === index ? { ...g, items } : g)))} addLabel={t('cmsAddItem')} />
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setGroups(groups.filter((_, i) => i !== index))} className="self-start text-destructive-text">
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('cmsDelete')}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setGroups([...groups, { role: EMPTY(), items: [] }])} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsBlockAddRole')}
          </Button>
        </div>
      )
    }

    case 'faq': {
      const items: { question: LocalizedText; answer: LocalizedText }[] = body.items ?? []
      const setItems = (next: typeof items) => setBody({ items: next })
      return (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <LocalizedTextField id={`${idPrefix}-q-${index}`} label={t('cmsFieldQuestion')} value={item.question} disabled={pending} onChange={(question) => setItems(items.map((it, i) => (i === index ? { ...it, question } : it)))} />
              <LocalizedTextareaField id={`${idPrefix}-a-${index}`} label={t('cmsFieldAnswer')} value={item.answer} rows={3} disabled={pending} onChange={(answer) => setItems(items.map((it, i) => (i === index ? { ...it, answer } : it)))} />
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setItems(items.filter((_, i) => i !== index))} className="self-start text-destructive-text">
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('cmsDelete')}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setItems([...items, { question: EMPTY(), answer: EMPTY() }])} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsBlockAddQuestion')}
          </Button>
        </div>
      )
    }

    case 'video':
      return (
        <>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-url`}>{t('cmsBlockVideoUrl')}</FieldLabel>
            <Input id={`${idPrefix}-url`} dir="ltr" type="url" value={body.url ?? ''} placeholder="https://www.youtube.com/watch?v=…" disabled={pending} onChange={(event) => setBody({ url: event.target.value })} />
            <FieldDescription>{t('cmsBlockVideoHint')}</FieldDescription>
          </Field>
          <LocalizedTextField id={`${idPrefix}-caption`} label={t('cmsBlockCaption')} value={body.caption ?? EMPTY()} disabled={pending} onChange={(caption) => setBody({ caption })} />
        </>
      )
  }
}

function BlockCard({ projectId, block, index, count, ids, media }: { projectId: string; block: AdminProjectBlock; index: number; count: number; ids: string[]; media: AdminMediaAsset[] }) {
  const t = useTranslations('Admin')
  const tBlock = useTranslations('BlockTypes')
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => toDraft(block))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<{ ok: boolean; code?: string }>) {
    setPending(true)
    setError(null)
    const result = await action()
    setPending(false)
    if (!result.ok) {
      setError(result.code === 'not-complete' ? t('cmsErrorNotComplete') : result.code === 'invalid' ? t('cmsErrorInvalid') : t('errorForbidden'))
      return
    }
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <ChildRowControls
          label={`${index + 1}. ${tBlock(block.type)}`}
          published={block.published}
          completeness={block.completeness}
          pending={pending}
          isFirst={index === 0}
          isLast={index === count - 1}
          onMove={(direction) => run(() => reorderProjectBlocks(projectId, moved(ids, index, direction)))}
          onTogglePublished={() => run(() => (block.published ? unpublishProjectBlock(block.id, projectId) : publishProjectBlock(block.id, projectId)))}
          onDelete={() => {
            if (window.confirm(t('cmsConfirmDelete'))) void run(() => deleteProjectBlock(block.id, projectId))
          }}
        />
        <LocalizedTextField id={`block-${block.id}-title`} label={t('cmsBlockTitle')} value={draft.title} disabled={pending} onChange={(title) => setDraft({ ...draft, title })} />
        <BlockFields type={block.type} draft={draft} setDraft={setDraft} media={media} pending={pending} idPrefix={`block-${block.id}`} />
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button type="button" size="sm" disabled={pending} className="self-start" onClick={() => run(() => updateProjectBlock(block.id, projectId, toInput(block.type, draft)))}>
          {pending ? t('cmsSaving') : t('cmsSaveChanges')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ProjectBlocksEditor({ projectId, blocks, media }: { projectId: string; blocks: AdminProjectBlock[]; media: AdminMediaAsset[] }) {
  const t = useTranslations('Admin')
  const tBlock = useTranslations('BlockTypes')
  const router = useRouter()
  const [type, setType] = useState<ProjectBlockType>('intro')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = blocks.map((block) => block.id)

  async function handleAdd() {
    setPending(true)
    setError(null)
    // A video block is added from its own address field (`NewVideoBlock`) — it cannot exist without one.
    const emptyBody: Partial<Record<ProjectBlockType, Record<string, unknown>>> = {
      intro: { text: EMPTY() },
      challenge: { text: EMPTY() },
      result: { text: EMPTY() },
      features: {},
      gallery: { images: [] },
      'features-by-role': { groups: [] },
      audience: { items: [] },
      faq: { items: [] },
    }
    const result = await createProjectBlock(projectId, { type, title: null, body: emptyBody[type] ?? {} })
    setPending(false)
    if (!result.ok) {
      setError(t('errorForbidden'))
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsBlocksEmpty')}</p> : null}
      {blocks.map((block, index) => (
        <BlockCard key={`${block.id}-${block.sortOrder}`} projectId={projectId} block={block} index={index} count={blocks.length} ids={ids} media={media} />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsAddBlock')}</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field className="min-w-48">
              <FieldLabel htmlFor="new-block-type">{t('cmsBlockType')}</FieldLabel>
              <NativeSelect id="new-block-type" value={type} disabled={pending} onChange={(event) => setType(event.target.value as ProjectBlockType)}>
                {PROJECT_BLOCK_TYPES.map((blockType) => (
                  <option key={blockType} value={blockType}>
                    {tBlock(blockType)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {type === 'video' ? <NewVideoBlock projectId={projectId} /> : (
              <Button type="button" size="sm" disabled={pending} onClick={handleAdd}>
                <Plus aria-hidden="true" data-icon="inline-start" />
                {t('cmsAddBlock')}
              </Button>
            )}
          </div>
          {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function NewVideoBlock({ projectId }: { projectId: string }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createProjectBlock(projectId, { type: 'video', title: null, body: { url } })
    setPending(false)
    if (!result.ok) {
      setError(true)
      return
    }
    setUrl('')
    router.refresh()
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <Field className="min-w-0 flex-1">
        <FieldLabel htmlFor="new-block-video-url">{t('cmsBlockVideoUrl')}</FieldLabel>
        <Input id="new-block-video-url" dir="ltr" type="url" value={url} placeholder="https://www.youtube.com/watch?v=…" disabled={pending} onChange={(event) => setUrl(event.target.value)} />
      </Field>
      <Button type="button" size="sm" disabled={pending || !url.trim()} onClick={handleAdd}>
        <Plus aria-hidden="true" data-icon="inline-start" />
        {t('cmsAddBlock')}
      </Button>
      {error ? <FormMessage variant="destructive">{t('cmsBlockVideoInvalid')}</FormMessage> : null}
    </div>
  )
}
