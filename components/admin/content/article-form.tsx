'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { archiveArticle, createArticle, publishArticle, unpublishArticle, updateArticle } from '@/app/actions/content'
import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import { estimateReadingMinutes } from '@/lib/articles/reading-time'
import type { AdminArticle, ArticleFormOptions, ArticleInput, LocaleCompleteness } from '@/types/cms'
import { t as pick, type Locale } from '@/types/content'

/** `published` is not selectable: only Publish / Unpublish / Archive move an article across the public line. */
const FORM_STATUSES: ArticleInput['status'][] = ['draft', 'review', 'scheduled', 'archived']

const ERROR_KEYS: Record<string, string> = {
  'duplicate-slug': 'cmsErrorDuplicateSlug',
  'not-complete': 'cmsErrorNotComplete',
  'has-placeholder': 'cmsErrorHasPlaceholder',
  'missing-image': 'cmsErrorMissingImage',
  'invalid-schedule': 'cmsErrorInvalidSchedule',
}

export function ArticleForm({
  mode,
  article,
  completeness,
  options,
}: {
  mode: 'create' | 'edit'
  article?: AdminArticle
  completeness?: LocaleCompleteness
  options: ArticleFormOptions
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const isPublished = article?.status === 'published'

  const [form, setForm] = useState<ArticleInput>({
    slug: article?.slug ?? '',
    title: article?.title ?? emptyLocalized(),
    excerpt: article?.excerpt ?? emptyLocalized(),
    body: article?.body ?? emptyLocalized(),
    category: article?.category ?? null,
    status: article && article.status !== 'published' ? article.status : 'draft',
    scheduledFor: article?.status === 'scheduled' && article.publishedAt ? article.publishedAt.slice(0, 10) : null,
    projectIds: article?.projectIds ?? [],
    serviceIds: article?.serviceIds ?? [],
    relatedArticleIds: article?.relatedArticleIds ?? [],
  })
  const [imageId, setImageId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleId(key: 'projectIds' | 'serviceIds' | 'relatedArticleIds', id: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((existing) => existing !== id) : [...current[key], id],
    }))
  }

  function insertImage(locale: Locale) {
    if (!imageId) return
    setForm((current) => ({
      ...current,
      body: { ...current.body, [locale]: `${current.body[locale].trimEnd()}\n\n![](media:${imageId})\n` },
    }))
  }

  function errorMessage(code: string): string {
    return t((ERROR_KEYS[code] ?? 'errorForbidden') as Parameters<typeof t>[0])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = mode === 'create' ? await createArticle(form) : await updateArticle(article!.id, form)
    if (!result.ok) {
      // `error` after the article row was written means only the link lists failed — say so.
      setError(result.code === 'error' ? t('cmsErrorSaveFailed') : errorMessage(result.code))
      setPending(false)
      return
    }

    setPending(false)
    if (mode === 'create' && 'id' in result) {
      router.push(`/admin/content/articles/${result.id}`)
    } else {
      router.refresh()
    }
  }

  async function runTransition(action: (id: string) => Promise<{ ok: true } | { ok: false; code: string }>) {
    if (!article) return
    setPending(true)
    setError(null)
    const result = await action(article.id)
    if (!result.ok) {
      setError(errorMessage(result.code))
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  const readingEn = estimateReadingMinutes(form.body.en, 'en')
  const readingFa = estimateReadingMinutes(form.body.fa, 'fa')

  return (
    <div className="flex flex-col gap-6">
      {mode === 'edit' && article && completeness ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {t(`cmsArticleStatus${capitalize(article.status)}` as Parameters<typeof t>[0])}
                </span>
                <CompletenessBadges completeness={completeness} />
                <span className="text-xs text-muted-foreground">{t('cmsArticleReadingTimes', { en: readingEn, fa: readingFa })}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" render={<Link href={`/admin/content/articles/${article.id}/preview?lang=en`} />}>
                  {t('cmsArticlePreviewEn')}
                </Button>
                <Button size="sm" variant="outline" render={<Link href={`/admin/content/articles/${article.id}/preview?lang=fa`} />}>
                  {t('cmsArticlePreviewFa')}
                </Button>
                {article.status !== 'archived' ? (
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runTransition(archiveArticle)}>
                    {t('cmsArticleArchive')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={isPublished ? 'outline' : 'default'}
                  disabled={pending || (!isPublished && !(completeness.en && completeness.fa))}
                  onClick={() => runTransition(isPublished ? unpublishArticle : publishArticle)}
                >
                  {isPublished ? t('cmsUnpublish') : t('cmsPublish')}
                </Button>
              </div>
            </div>
            {article.status === 'scheduled' && article.publishedAt ? (
              <p className="text-xs text-muted-foreground">{t('cmsArticleScheduledNote', { date: article.publishedAt.slice(0, 10) })}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="article-slug">
                  {t('cmsFieldSlug')} <span className="text-destructive-text">*</span>
                </FieldLabel>
                <Input
                  id="article-slug"
                  dir="ltr"
                  value={form.slug}
                  disabled={pending}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  onChange={(event) => setField('slug', event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="article-status">{t('cmsFieldArticleStatus')}</FieldLabel>
                {isPublished ? (
                  <p className="flex h-9 items-center text-sm text-muted-foreground">{t('cmsArticleStatusLockedNote')}</p>
                ) : (
                  <Select value={form.status} onValueChange={(value) => value && setField('status', value as ArticleInput['status'])} disabled={pending}>
                    <SelectTrigger id="article-status">
                      <SelectValue>{t(`cmsArticleStatus${capitalize(form.status)}` as Parameters<typeof t>[0])}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {FORM_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`cmsArticleStatus${capitalize(status)}` as Parameters<typeof t>[0])}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>

            {!isPublished && form.status === 'scheduled' ? (
              <Field>
                <FieldLabel htmlFor="article-scheduled-for">
                  {t('cmsArticleScheduledFor')} <span className="text-destructive-text">*</span>
                </FieldLabel>
                <Input
                  id="article-scheduled-for"
                  type="date"
                  dir="ltr"
                  className="sm:max-w-56"
                  value={form.scheduledFor ?? ''}
                  disabled={pending}
                  required
                  onChange={(event) => setField('scheduledFor', event.target.value || null)}
                />
                <p className="text-xs text-muted-foreground">{t('cmsArticleScheduledHelp')}</p>
              </Field>
            ) : null}

            <LocalizedTextField id="article-title" label={t('cmsFieldTitle')} value={form.title} onChange={(title) => setField('title', title)} required disabled={pending} />
            <LocalizedTextareaField id="article-excerpt" label={t('cmsFieldExcerpt')} value={form.excerpt} onChange={(excerpt) => setField('excerpt', excerpt)} required disabled={pending} rows={2} />
            <LocalizedTextareaField id="article-body" label={t('cmsFieldBody')} value={form.body} onChange={(body) => setField('body', body)} required disabled={pending} rows={18} />
            <LocalizedTextField id="article-category" label={t('cmsFieldCategory')} value={form.category ?? emptyLocalized()} onChange={(category) => setField('category', category)} disabled={pending} />

            <details className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium">{t('cmsArticleFormatHelpTitle')}</summary>
              <p className="mt-3 text-muted-foreground">{t('cmsArticleFormatHelpIntro')}</p>
              <pre dir="ltr" className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed">{FORMAT_CHEATSHEET}</pre>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h2 className="text-sm font-semibold">{t('cmsArticleImageInsert')}</h2>
            {options.media.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('cmsArticleImageNone')}</p>
            ) : (
              <>
                <select
                  aria-label={t('cmsArticleImagePick')}
                  value={imageId}
                  disabled={pending}
                  onChange={(event) => setImageId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t('cmsArticleImagePick')}</option>
                  {options.media.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.alt?.en || asset.url.split('/').pop()}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={pending || !imageId} onClick={() => insertImage('en')}>
                    {t('cmsArticleImageInsertEn')}
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={pending || !imageId} onClick={() => insertImage('fa')}>
                    {t('cmsArticleImageInsertFa')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('cmsArticleImageNote')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div>
              <h2 className="text-sm font-semibold">{t('cmsArticleRelations')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('cmsArticleRelatedNote')}</p>
            </div>
            <RelationPicker
              legend={t('cmsArticleRelatedProjects')}
              unpublishedLabel={t('cmsArticleUnpublishedTag')}
              disabled={pending}
              items={options.projects.map((p) => ({ id: p.id, label: pick(p.title, 'en') || p.slug, unpublished: !p.published }))}
              selected={form.projectIds}
              onToggle={(id) => toggleId('projectIds', id)}
            />
            <RelationPicker
              legend={t('cmsArticleRelatedServices')}
              unpublishedLabel={t('cmsArticleUnpublishedTag')}
              disabled={pending}
              items={options.services.map((s) => ({ id: s.id, label: pick(s.title, 'en') || s.slug, unpublished: !s.published }))}
              selected={form.serviceIds}
              onToggle={(id) => toggleId('serviceIds', id)}
            />
            <RelationPicker
              legend={t('cmsArticleRelatedArticles')}
              unpublishedLabel={t('cmsArticleUnpublishedTag')}
              disabled={pending}
              items={options.articles.map((a) => ({ id: a.id, label: pick(a.title, 'en') || a.slug, unpublished: false }))}
              selected={form.relatedArticleIds}
              onToggle={(id) => toggleId('relatedArticleIds', id)}
            />
          </CardContent>
        </Card>

        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t('cmsSaving') : mode === 'create' ? t('cmsCreateArticle') : t('cmsSaveChanges')}
        </Button>
      </form>
    </div>
  )
}

function RelationPicker({
  legend,
  items,
  selected,
  onToggle,
  disabled,
  unpublishedLabel,
}: {
  legend: string
  items: { id: string; label: string; unpublished: boolean }[]
  selected: string[]
  onToggle: (id: string) => void
  disabled: boolean
  unpublishedLabel: string
}) {
  if (items.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border p-3">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)} disabled={disabled} onChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
            {item.unpublished ? <span className="text-xs text-muted-foreground">({unpublishedLabel})</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const FORMAT_CHEATSHEET = `## Section heading          (### for a sub-heading)
Paragraph with **bold**, *emphasis*, \`inline code\`
and a [link](https://example.com) or [page](/work/slug).

- bullet          1. numbered
> a quote
> [!NOTE] Optional title     (also TIP, WARNING, DANGER)
> Callout text.

\`\`\`ts
// fenced code — always shown left-to-right, with a copy button
\`\`\`

![Optional caption](media:<image-id>)   (use "Insert image" below)
---`

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
