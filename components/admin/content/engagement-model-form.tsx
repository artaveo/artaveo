'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createEngagementModel, publishEngagementModel, unpublishEngagementModel, updateEngagementModel } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminEngagementModel, EngagementModelInput, LocaleCompleteness } from '@/types/cms'

/** `completeness` is computed server-side (`lib/admin/content.ts#engagementModelCompleteness`) by the page and only used in edit mode — a not-yet-created model has no publish control to gate. */
export function EngagementModelForm({
  mode,
  model,
  completeness,
}: {
  mode: 'create' | 'edit'
  model?: AdminEngagementModel
  completeness?: LocaleCompleteness
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [form, setForm] = useState<EngagementModelInput>({
    slug: model?.slug ?? '',
    title: model?.title ?? emptyLocalized(),
    whenItFits: model?.whenItFits ?? emptyLocalized(),
    billing: model?.billing ?? emptyLocalized(),
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = mode === 'create' ? await createEngagementModel(form) : await updateEngagementModel(model!.id, form)
    if (!result.ok) {
      setError(result.code === 'duplicate-slug' ? t('cmsErrorDuplicateSlug') : t('errorForbidden'))
      setPending(false)
      return
    }

    setPending(false)
    if (mode === 'create' && 'id' in result) {
      router.push(`/admin/content/engagement-models/${result.id}`)
    } else {
      router.refresh()
    }
  }

  async function handlePublishToggle() {
    if (!model) return
    setPending(true)
    setError(null)
    const result = model.published ? await unpublishEngagementModel(model.id) : await publishEngagementModel(model.id)
    if (!result.ok) {
      setError(result.code === 'not-complete' ? t('cmsErrorNotComplete') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {mode === 'edit' && model && completeness ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {model.published ? t('cmsStatusPublished') : t('cmsStatusDraft')}
              </span>
              <CompletenessBadges completeness={completeness} />
            </div>
            <Button
              type="button"
              size="sm"
              variant={model.published ? 'outline' : 'default'}
              disabled={pending || (!model.published && !(completeness.en && completeness.fa))}
              onClick={handlePublishToggle}
            >
              {model.published ? t('cmsUnpublish') : t('cmsPublish')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Field>
              <FieldLabel htmlFor="em-slug">
                {t('cmsFieldSlug')} <span className="text-destructive-text">*</span>
              </FieldLabel>
              <Input
                id="em-slug"
                dir="ltr"
                value={form.slug}
                disabled={pending}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </Field>
            <LocalizedTextField id="em-title" label={t('cmsFieldTitle')} value={form.title} onChange={(title) => setForm({ ...form, title })} required disabled={pending} />
            <LocalizedTextareaField id="em-when-it-fits" label={t('cmsFieldWhenItFits')} value={form.whenItFits} onChange={(whenItFits) => setForm({ ...form, whenItFits })} required disabled={pending} rows={2} />
            <LocalizedTextField id="em-billing" label={t('cmsFieldBilling')} value={form.billing} onChange={(billing) => setForm({ ...form, billing })} required disabled={pending} />
          </CardContent>
        </Card>

        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t('cmsSaving') : mode === 'create' ? t('cmsCreateEngagementModel') : t('cmsSaveChanges')}
        </Button>
      </form>
    </div>
  )
}
