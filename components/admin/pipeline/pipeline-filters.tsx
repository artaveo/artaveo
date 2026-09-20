'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/form-controls'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { stageLabelKey } from '@/components/admin/pipeline/stage-badge'
import { PRIORITY_ORDER, STAGE_ORDER, type InquiryPriority, type InquiryStage } from '@/types/pipeline'

const PRIORITY_KEY: Record<InquiryPriority, string> = {
  low: 'priorityLow',
  normal: 'priorityNormal',
  high: 'priorityHigh',
}

const NONE = '__none__'

export function PipelineFiltersBar({
  stage,
  priority,
  tag,
  q,
}: {
  stage?: InquiryStage
  priority?: InquiryPriority
  tag?: string
  q?: string
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const pathname = usePathname()
  const [tagDraft, setTagDraft] = useState(tag ?? '')
  const [qDraft, setQDraft] = useState(q ?? '')

  function push(next: { stage?: string; priority?: string; tag?: string; q?: string }) {
    const merged = { stage, priority, tag, q, ...next }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const hasFilters = Boolean(stage || priority || tag || q)

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        push({ tag: tagDraft.trim() || undefined, q: qDraft.trim() || undefined })
      }}
    >
      <Field className="w-40">
        <FieldLabel htmlFor="filter-stage">{t('filterStageLabel')}</FieldLabel>
        <Select
          value={stage ?? NONE}
          onValueChange={(value) => push({ stage: !value || value === NONE ? undefined : value })}
        >
          <SelectTrigger id="filter-stage" size="sm">
            <SelectValue placeholder={t('filterStageAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>{t('filterStageAll')}</SelectItem>
              {STAGE_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(stageLabelKey(value))}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-40">
        <FieldLabel htmlFor="filter-priority">{t('filterPriorityLabel')}</FieldLabel>
        <Select
          value={priority ?? NONE}
          onValueChange={(value) => push({ priority: !value || value === NONE ? undefined : value })}
        >
          <SelectTrigger id="filter-priority" size="sm">
            <SelectValue placeholder={t('filterPriorityAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>{t('filterPriorityAll')}</SelectItem>
              {PRIORITY_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(PRIORITY_KEY[value])}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-40">
        <FieldLabel htmlFor="filter-tag">{t('filterTagLabel')}</FieldLabel>
        <Input
          id="filter-tag"
          value={tagDraft}
          placeholder={t('filterTagPlaceholder')}
          onChange={(event) => setTagDraft(event.target.value)}
        />
      </Field>

      <Field className="w-48">
        <FieldLabel htmlFor="filter-q">{t('filterSearchLabel')}</FieldLabel>
        <Input
          id="filter-q"
          value={qDraft}
          placeholder={t('filterSearchPlaceholder')}
          onChange={(event) => setQDraft(event.target.value)}
        />
      </Field>

      <Button type="submit" size="sm" variant="outline">
        {t('filterApplyButton')}
      </Button>

      {hasFilters ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setTagDraft('')
            setQDraft('')
            router.push(pathname)
          }}
        >
          {t('clearFiltersButton')}
        </Button>
      ) : null}
    </form>
  )
}
