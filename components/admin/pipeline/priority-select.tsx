'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { updateInquiryPriority } from '@/app/actions/pipeline'
import { useRouter } from '@/i18n/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormMessage } from '@/components/ui/form-controls'
import { PRIORITY_ORDER, type InquiryPriority } from '@/types/pipeline'

const PRIORITY_KEY: Record<InquiryPriority, string> = {
  low: 'priorityLow',
  normal: 'priorityNormal',
  high: 'priorityHigh',
}

export function PrioritySelect({ inquiryId, priority }: { inquiryId: string; priority: InquiryPriority }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleChange(value: string | null) {
    if (!value || value === priority) return
    setPending(true)
    setError(false)

    const result = await updateInquiryPriority(inquiryId, value as InquiryPriority)

    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={priority} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger size="sm" className="max-w-36">
          <SelectValue>{t(PRIORITY_KEY[priority])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {PRIORITY_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {t(PRIORITY_KEY[value])}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error ? (
        <FormMessage variant="destructive" className="text-xs">
          {t('errorForbidden')}
        </FormMessage>
      ) : null}
    </div>
  )
}
