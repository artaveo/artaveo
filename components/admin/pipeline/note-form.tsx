'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { addInquiryNote } from '@/app/actions/pipeline'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'

export function NoteForm({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = note.trim()
    if (!trimmed) return

    setPending(true)
    setError(false)

    const result = await addInquiryNote(inquiryId, trimmed)

    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }

    setNote('')
    setPending(false)
    router.refresh()
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={`note-${inquiryId}`}>{t('noteFormLabel')}</FieldLabel>
        <Textarea
          id={`note-${inquiryId}`}
          value={note}
          disabled={pending}
          placeholder={t('noteFormPlaceholder')}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
      <Button type="submit" size="sm" disabled={pending || !note.trim()} className="self-start">
        {pending ? t('noteFormSubmitting') : t('noteFormSubmit')}
      </Button>
    </form>
  )
}
