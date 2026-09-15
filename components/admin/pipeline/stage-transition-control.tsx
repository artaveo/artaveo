'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { transitionInquiryStage } from '@/app/actions/pipeline'
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
import { StageBadge, stageLabelKey } from '@/components/admin/pipeline/stage-badge'
import { ALLOWED_STAGE_TRANSITIONS, type InquiryStage } from '@/types/pipeline'

export function StageTransitionControl({ inquiryId, stage }: { inquiryId: string; stage: InquiryStage }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'forbidden' | 'not-configured' | 'invalid-transition' | 'error' | null>(null)

  const nextStages = ALLOWED_STAGE_TRANSITIONS[stage]

  async function handleChange(value: string | null) {
    if (!value || value === stage) return
    setPending(true)
    setError(null)

    const result = await transitionInquiryStage(inquiryId, value as InquiryStage)

    if (!result.ok) {
      setError(result.code)
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  if (nextStages.length === 0) {
    return <StageBadge stage={stage} />
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <StageBadge stage={stage} />
        <Select value="" onValueChange={handleChange} disabled={pending}>
          <SelectTrigger size="sm" className="max-w-48">
            <SelectValue placeholder={t('stageMovePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {nextStages.map((next) => (
                <SelectItem key={next} value={next}>
                  {t(stageLabelKey(next))}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <FormMessage variant="destructive" className="text-xs">
          {error === 'invalid-transition' ? t('errorInvalidTransition') : t('errorForbidden')}
        </FormMessage>
      ) : null}
    </div>
  )
}
