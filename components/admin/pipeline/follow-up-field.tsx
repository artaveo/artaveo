'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { updateInquiryFollowUp } from '@/app/actions/pipeline'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'

/** `followUpAt` — ISO datetime string from the database, or `null`. */
export function FollowUpField({ inquiryId, followUpAt }: { inquiryId: string; followUpAt: string | null }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [value, setValue] = useState(followUpAt ? followUpAt.slice(0, 10) : '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function save(nextValue: string) {
    setPending(true)
    setError(false)

    const iso = nextValue ? new Date(`${nextValue}T00:00:00Z`).toISOString() : null
    const result = await updateInquiryFollowUp(inquiryId, iso)

    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  return (
    <Field>
      <FieldLabel htmlFor={`follow-up-${inquiryId}`}>{t('followUpLabel')}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={`follow-up-${inquiryId}`}
          type="date"
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          className="max-w-44"
        />
        <Button size="sm" variant="outline" disabled={pending} onClick={() => save(value)}>
          {t('followUpSaveButton')}
        </Button>
        {value ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setValue('')
              void save('')
            }}
          >
            {t('followUpClearButton')}
          </Button>
        ) : null}
      </div>
      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
    </Field>
  )
}
