'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

import { updateInquiryTags } from '@/app/actions/pipeline'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Badge } from '@/components/ui/badge'

export function TagsEditor({ inquiryId, tags }: { inquiryId: string; tags: string[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function persist(nextTags: string[]) {
    setPending(true)
    setError(false)

    const result = await updateInquiryTags(inquiryId, nextTags)

    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  function handleAdd() {
    const trimmed = draft.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) {
      setDraft('')
      return
    }
    setDraft('')
    void persist([...tags, trimmed])
  }

  function handleRemove(tag: string) {
    void persist(tags.filter((existing) => existing !== tag))
  }

  return (
    <Field>
      <FieldLabel htmlFor={`tag-input-${inquiryId}`}>{t('tagsLabel')}</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 ? <span className="text-sm text-muted-foreground">{t('tagsEmpty')}</span> : null}
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              aria-label={t('tagsRemoveLabel', { tag })}
              onClick={() => handleRemove(tag)}
              disabled={pending}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={`tag-input-${inquiryId}`}
          value={draft}
          disabled={pending}
          placeholder={t('tagsAddPlaceholder')}
          maxLength={32}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleAdd()
            }
          }}
          className="max-w-48"
        />
        <Button size="sm" variant="outline" disabled={pending || !draft.trim()} onClick={handleAdd}>
          {t('tagsAddButton')}
        </Button>
      </div>
      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
    </Field>
  )
}
