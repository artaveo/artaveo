'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createProject, updateProject } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocalizedListField, LocalizedTextField } from '@/components/admin/content/localized-fields'
import { TechnologyPicker } from '@/components/admin/content/technology-picker'
import type { Project, ProjectStatus } from '@/types/content'
import type { AdminTechnology, ProjectCoreInput } from '@/types/cms'

const STATUSES: ProjectStatus[] = ['live', 'in-development', 'private', 'archived', 'concept']

function toInput(project: (Project & { technologyIds?: string[] }) | undefined, technologyIds: string[]): ProjectCoreInput {
  return {
    slug: project?.slug ?? '',
    title: project?.title ?? { en: '', fa: '' },
    category: project?.category ?? { en: '', fa: '' },
    summary: project?.summary ?? { en: '', fa: '' },
    highlights: project?.highlights ?? [],
    status: project?.status,
    coverImage: project?.coverImage ?? null,
    githubUrl: project?.githubUrl ?? null,
    liveUrl: project?.liveUrl ?? null,
    year: project?.year ?? null,
    role: project?.role ?? null,
    relatedServiceSlug: project?.relatedServiceSlug ?? null,
    featured: project?.featured ?? false,
    technologyIds,
  }
}

export function ProjectForm({
  mode,
  project,
  technologies,
  initialTechnologyIds,
}: {
  mode: 'create' | 'edit'
  project?: Project
  technologies: AdminTechnology[]
  initialTechnologyIds: string[]
}) {
  const t = useTranslations('Admin')
  const tStatus = useTranslations('ProjectStatus')
  const router = useRouter()
  const [form, setForm] = useState<ProjectCoreInput>(() => toInput(project, initialTechnologyIds))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof ProjectCoreInput>(key: K, value: ProjectCoreInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = mode === 'create' ? await createProject(form) : await updateProject(project!.id, form)

    if (!result.ok) {
      setError(result.code === 'duplicate-slug' ? t('cmsErrorDuplicateSlug') : t('errorForbidden'))
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(event) => setField('slug', event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-status">{t('cmsFieldProjectStatus')}</FieldLabel>
              <Select
                value={form.status ?? '__none'}
                onValueChange={(value) => setField('status', value === '__none' ? undefined : (value as ProjectStatus))}
                disabled={pending}
              >
                <SelectTrigger id="project-status">
                  <SelectValue>{form.status ? tStatus(form.status) : t('cmsFieldServiceTypeNone')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none">{t('cmsFieldServiceTypeNone')}</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <LocalizedTextField id="project-title" label={t('cmsFieldTitle')} value={form.title} onChange={(v) => setField('title', v)} required disabled={pending} />
          <LocalizedTextField id="project-category" label={t('cmsFieldProjectCategory')} value={form.category} onChange={(v) => setField('category', v)} required disabled={pending} />
          <LocalizedTextField id="project-summary" label={t('cmsFieldProjectSummary')} value={form.summary} onChange={(v) => setField('summary', v)} required disabled={pending} />
          <LocalizedListField id="project-highlights" label={t('cmsFieldHighlights')} items={form.highlights} onChange={(v) => setField('highlights', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedTextField id="project-role" label={t('cmsFieldRole')} value={form.role ?? { en: '', fa: '' }} onChange={(v) => setField('role', v)} disabled={pending} />

          <TechnologyPicker technologies={technologies} selectedIds={form.technologyIds} onChange={(v) => setField('technologyIds', v)} disabled={pending} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="project-cover">{t('cmsFieldCoverImage')}</FieldLabel>
              <Input id="project-cover" dir="ltr" value={form.coverImage ?? ''} disabled={pending} placeholder="/work/example.png" onChange={(event) => setField('coverImage', event.target.value || null)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-year">{t('cmsFieldYear')}</FieldLabel>
              <Input id="project-year" dir="ltr" value={form.year ?? ''} disabled={pending} onChange={(event) => setField('year', event.target.value || null)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-github">{t('cmsFieldGithubUrl')}</FieldLabel>
              <Input id="project-github" dir="ltr" type="url" value={form.githubUrl ?? ''} disabled={pending} onChange={(event) => setField('githubUrl', event.target.value || null)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-live">{t('cmsFieldLiveUrl')}</FieldLabel>
              <Input id="project-live" dir="ltr" type="url" value={form.liveUrl ?? ''} disabled={pending} onChange={(event) => setField('liveUrl', event.target.value || null)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-related-service">{t('cmsFieldRelatedServiceSlug')}</FieldLabel>
              <Input id="project-related-service" dir="ltr" value={form.relatedServiceSlug ?? ''} disabled={pending} onChange={(event) => setField('relatedServiceSlug', event.target.value || null)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} disabled={pending} onChange={(event) => setField('featured', event.target.checked)} />
            {t('cmsFieldFeatured')}
          </label>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('cmsSaving') : mode === 'create' ? t('cmsCreateProject') : t('cmsSaveChanges')}
      </Button>
    </form>
  )
}
