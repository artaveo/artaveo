'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createProject, updateProject } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { LocalizedListField, LocalizedTextareaField, LocalizedTextField } from '@/components/admin/content/localized-fields'
import { MediaPicker } from '@/components/admin/content/media-picker'
import { TechnologyPicker } from '@/components/admin/content/technology-picker'
import { toSlug, toSlugWhileTyping } from '@/lib/slug'
import { PROJECT_EXAMPLES as EX } from '@/components/admin/content/field-examples'
import { PROJECT_PLATFORMS, type LocalizedText, type ProjectPlatform } from '@/types/content'
import type { AdminMediaAsset, AdminProject, AdminTechnology, MediaProjectOption, ProjectCoreInput } from '@/types/cms'

function toInput(project: AdminProject | undefined, technologyIds: string[]): ProjectCoreInput {
  return {
    slug: project?.slug ?? '',
    title: project?.title ?? { en: '', fa: '' },
    category: project?.category ?? { en: '', fa: '' },
    summary: project?.summary ?? { en: '', fa: '' },
    highlights: project?.highlights ?? [],
    coverMediaId: project?.coverMediaId ?? null,
    liveUrl: project?.liveUrl ?? null,
    year: project?.year ?? null,
    relatedServiceSlug: project?.relatedServiceSlug ?? null,
    featured: project?.featured ?? false,
    technologyIds,
    showInPortfolio: project?.showInPortfolio ?? true,
    isProduct: project?.isProduct ?? false,
    brandColor: project?.brandColor ?? null,
    accentColor: project?.accentColor ?? null,
    industry: project?.industry ?? null,
    platforms: project?.platforms ?? [],
    outcomeLine: project?.outcomeLine ?? null,
    features: project?.features ?? [],
  }
}

const EMPTY: LocalizedText = { en: '', fa: '' }
const COLOR = /^#[0-9A-Fa-f]{6}$/

function ColorField({ id, label, value, onChange, disabled }: { id: string; label: string; value: string | null; onChange: (next: string | null) => void; disabled?: boolean }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value && COLOR.test(value) ? value : '#000000'}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <Input
          id={id}
          dir="ltr"
          value={value ?? ''}
          placeholder="#14243D"
          pattern="#[0-9A-Fa-f]{6}"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.trim() || null)}
        />
      </div>
    </Field>
  )
}

/**
 * The project editor's core fields (§ 15.2, reworked in Phase 27.1): the two
 * independent switches (portfolio, product), the project's own colour, its cover
 * from the media library, industry, platforms, the outcome line and the
 * customer-facing features. The page itself is built from blocks
 * (`ProjectBlocksEditor`), the ways to get a product in the Product tab.
 */
export function ProjectForm({
  mode,
  project,
  technologies,
  initialTechnologyIds,
  media,
  projects,
}: {
  mode: 'create' | 'edit'
  project?: AdminProject
  technologies: AdminTechnology[]
  initialTechnologyIds: string[]
  media: AdminMediaAsset[]
  projects: MediaProjectOption[]
}) {
  const t = useTranslations('Admin')
  const tPlatform = useTranslations('Platforms')
  const router = useRouter()
  const [form, setForm] = useState<ProjectCoreInput>(() => toInput(project, initialTechnologyIds))
  // A new project's address follows its English title until the owner edits the address itself.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof ProjectCoreInput>(key: K, value: ProjectCoreInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function togglePlatform(platform: ProjectPlatform) {
    setField('platforms', form.platforms.includes(platform) ? form.platforms.filter((p) => p !== platform) : [...form.platforms, platform])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const ready = { ...form, slug: toSlug(form.slug) }
    setForm(ready)
    const result = mode === 'create' ? await createProject(ready) : await updateProject(project!.id, ready)

    if (!result.ok) {
      setError(result.code === 'duplicate-slug' ? t('cmsErrorDuplicateSlug') : result.code === 'error' ? t('cmsErrorInvalid') : t('errorForbidden'))
      setPending(false)
      return
    }

    setPending(false)
    if (mode === 'create' && 'id' in result) {
      router.push(`/admin/content/projects/${result.id}`)
    } else {
      router.refresh()
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.showInPortfolio} disabled={pending} onChange={(event) => setField('showInPortfolio', event.target.checked)} />
              <span>
                <span className="font-medium">{t('cmsFieldShowInPortfolio')}</span>
                <span className="block text-xs text-muted-foreground">{t('cmsFieldShowInPortfolioHint')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.isProduct} disabled={pending} onChange={(event) => setField('isProduct', event.target.checked)} />
              <span>
                <span className="font-medium">{t('cmsFieldIsProduct')}</span>
                <span className="block text-xs text-muted-foreground">{t('cmsFieldIsProductHint')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.featured} disabled={pending} onChange={(event) => setField('featured', event.target.checked)} />
              <span className="font-medium">{t('cmsFieldFeatured')}</span>
            </label>
          </div>

          <Field>
            <FieldLabel htmlFor="project-slug">
              {t('cmsFieldSlug')} <span className="text-destructive-text">*</span>
            </FieldLabel>
            <Input
              id="project-slug"
              dir="ltr"
              value={form.slug}
              disabled={pending}
              required
              placeholder="ticket-sales-system"
              onChange={(event) => {
                setSlugTouched(true)
                setField('slug', toSlugWhileTyping(event.target.value))
              }}
            />
            <FieldDescription>{mode === 'edit' ? `${t('cmsHintSlug')} ${t('cmsHintSlugChange')}` : `${t('cmsHintSlug')} ${t('cmsHintSlugAuto')}`}</FieldDescription>
          </Field>

          <LocalizedTextField id="project-title" label={t('cmsFieldTitle')} value={form.title} onChange={(v) => setForm((current) => ({ ...current, title: v, slug: slugTouched ? current.slug : toSlug(v.en) }))} required disabled={pending} example={EX.title} hint={t('cmsHintProjectTitle')} />
          <LocalizedTextField id="project-category" label={t('cmsFieldProjectCategory')} value={form.category} onChange={(v) => setField('category', v)} required disabled={pending} example={EX.category} hint={t('cmsHintProjectCategory')} />
          <LocalizedTextareaField id="project-summary" label={t('cmsFieldProjectSummary')} value={form.summary} onChange={(v) => setField('summary', v)} required disabled={pending} rows={3} example={EX.summary} hint={t('cmsHintProjectSummary')} />
          <LocalizedTextField id="project-industry" label={t('cmsFieldIndustry')} value={form.industry ?? EMPTY} onChange={(v) => setField('industry', v.en || v.fa ? v : null)} disabled={pending} example={EX.industry} hint={t('cmsHintIndustry')} />
          <LocalizedTextField id="project-outcome" label={t('cmsFieldOutcomeLine')} value={form.outcomeLine ?? EMPTY} onChange={(v) => setField('outcomeLine', v.en || v.fa ? v : null)} disabled={pending} example={EX.outcomeLine} hint={t('cmsHintOutcomeLine')} />
          <LocalizedListField id="project-features" label={t('cmsFieldFeatures')} items={form.features} onChange={(v) => setField('features', v)} disabled={pending} addLabel={t('cmsAddItem')} example={EX.feature} hint={t('cmsHintFeatures')} />
          <LocalizedListField id="project-highlights" label={t('cmsFieldHighlights')} items={form.highlights} onChange={(v) => setField('highlights', v)} disabled={pending} addLabel={t('cmsAddItem')} example={EX.highlight} hint={t('cmsHintHighlights')} />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{t('cmsFieldPlatforms')}</legend>
            <p className="text-xs text-muted-foreground">{t('cmsHintPlatforms')}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {PROJECT_PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.platforms.includes(platform)} disabled={pending} onChange={() => togglePlatform(platform)} />
                  {tPlatform(platform)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id="project-brand-color" label={t('cmsFieldBrandColor')} value={form.brandColor} onChange={(v) => setField('brandColor', v)} disabled={pending} />
            <ColorField id="project-accent-color" label={t('cmsFieldAccentColor')} value={form.accentColor} onChange={(v) => setField('accentColor', v)} disabled={pending} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t('cmsHintColors')}</p>

          <MediaPicker
            id="project-cover"
            label={t('cmsFieldCoverImage')}
            value={form.coverMediaId}
            library={media}
            projects={projects}
            currentProjectId={project?.id ?? null}
            disabled={pending}
            onChange={(v) => setField('coverMediaId', v)}
            description={!form.coverMediaId && project?.legacyCoverImage ? t('cmsCoverLegacyNote', { path: project.legacyCoverImage }) : t('cmsCoverHint')}
          />

          <TechnologyPicker technologies={technologies} selectedIds={form.technologyIds} onChange={(v) => setField('technologyIds', v)} disabled={pending} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="project-year">{t('cmsFieldYear')}</FieldLabel>
              <Input id="project-year" dir="ltr" value={form.year ?? ''} placeholder="2026" disabled={pending} onChange={(event) => setField('year', event.target.value || null)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-live">{t('cmsFieldLiveUrl')}</FieldLabel>
              <Input id="project-live" dir="ltr" type="url" value={form.liveUrl ?? ''} placeholder="https://example.com" disabled={pending} onChange={(event) => setField('liveUrl', event.target.value || null)} />
              <FieldDescription>{t('cmsHintLiveUrl')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="project-related-service">{t('cmsFieldRelatedServiceSlug')}</FieldLabel>
              <Input id="project-related-service" dir="ltr" value={form.relatedServiceSlug ?? ''} placeholder="websites" disabled={pending} onChange={(event) => setField('relatedServiceSlug', event.target.value || null)} />
              <FieldDescription>{t('cmsFieldRelatedServiceHint')}</FieldDescription>
            </Field>
          </div>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('cmsSaving') : mode === 'create' ? t('cmsCreateProject') : t('cmsSaveChanges')}
      </Button>
    </form>
  )
}
