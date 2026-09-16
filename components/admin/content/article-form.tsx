'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createArticle, publishArticle, unpublishArticle, updateArticle } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminArticle, ArticleInput, LocaleCompleteness } from '@/types/cms'

const PRE_PUBLISH_STATUSES: ArticleInput['status'][] = ['draft', 'review', 'scheduled']

export function ArticleForm({
  mode,
  article,
  completeness,
}: {
  mode: 'create' | 'edit'
  article?: AdminArticle
  completeness?: LocaleCompleteness
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [form, setForm] = useState<ArticleInput>({
    slug: article?.slug ?? '',
    title: article?.title ?? emptyLocalized(),
    excerpt: article?.excerpt ?? emptyLocalized(),
    body: article?.body ?? emptyLocalized(),
    category: article?.category ?? null,
    status: article && article.status !== 'published' ? article.status : 'draft',
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = mode === 'create' ? await createArticle(form) : await updateArticle(article!.id, form)
    if (!result.ok) {
      setError(result.code === 'duplicate-slug' ? t('cmsErrorDuplicateSlug') : t('errorForbidden'))
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

  async function handlePublishToggle() {
    if (!article) return
    setPending(true)
    setError(null)
    const result = article.status === 'published' ? await unpublishArticle(article.id) : await publishArticle(article.id)
    if (!result.ok) {
      setError(result.code === 'not-complete' ? t('cmsErrorNotComplete') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  const isPublished = article?.status === 'published'

  return (
    <div className="flex flex-col gap-6">
      {mode === 'edit' && article && completeness ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {isPublished ? t('cmsStatusPublished') : t(`cmsArticleStatus${capitalize(article.status)}`)}
              </span>
              <CompletenessBadges completeness={completeness} />
              {article.readingTimeMinutes ? (
                <span className="text-xs text-muted-foreground">{t('cmsReadingTime', { minutes: article.readingTimeMinutes })}</span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant={isPublished ? 'outline' : 'default'}
              disabled={pending || (!isPublished && !(completeness.en && completeness.fa))}
              onClick={handlePublishToggle}
            >
              {isPublished ? t('cmsUnpublish') : t('cmsPublish')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                      <SelectValue>{t(`cmsArticleStatus${capitalize(form.status)}`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PRE_PUBLISH_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`cmsArticleStatus${capitalize(status)}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>

            <LocalizedTextField id="article-title" label={t('cmsFieldTitle')} value={form.title} onChange={(title) => setField('title', title)} required disabled={pending} />
            <LocalizedTextareaField id="article-excerpt" label={t('cmsFieldExcerpt')} value={form.excerpt} onChange={(excerpt) => setField('excerpt', excerpt)} required disabled={pending} rows={2} />
            <LocalizedTextareaField id="article-body" label={t('cmsFieldBody')} value={form.body} onChange={(body) => setField('body', body)} required disabled={pending} rows={10} />
            <LocalizedTextField id="article-category" label={t('cmsFieldCategory')} value={form.category ?? emptyLocalized()} onChange={(category) => setField('category', category)} disabled={pending} />
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
