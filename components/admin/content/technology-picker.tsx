'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createTechnology } from '@/app/actions/content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { TECHNOLOGY_CATEGORIES } from '@/types/content'
import type { AdminTechnology } from '@/types/cms'

/**
 * § 15.2's technology picker — chips grouped by category, picked from the
 * `technologies` table (proper nouns, never translated). Phase 27: the owner can
 * add a technology that is not in the list yet, right here — it is created,
 * added to the list and selected for this project.
 */
export function TechnologyPicker({
  technologies,
  selectedIds,
  onChange,
  disabled,
}: {
  technologies: AdminTechnology[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const t = useTranslations('Admin')
  const tCategory = useTranslations('TechCategories')
  const [list, setList] = useState(technologies)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('frontend')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createTechnology({ name, category })
    setPending(false)
    if (!result.ok) {
      setError(true)
      return
    }
    const tech = result.technology
    if (!list.some((item) => item.id === tech.id)) setList([...list, tech])
    if (!selectedIds.includes(tech.id)) onChange([...selectedIds, tech.id])
    setName('')
  }

  const byCategory = new Map<string, AdminTechnology[]>()
  for (const tech of list) {
    const group = byCategory.get(tech.category) ?? []
    group.push(tech)
    byCategory.set(tech.category, group)
  }
  const categoryLabel = (value: string) => ((TECHNOLOGY_CATEGORIES as readonly string[]).includes(value) ? tCategory(value as (typeof TECHNOLOGY_CATEGORIES)[number]) : value)

  return (
    <Field>
      <FieldLabel>{t('cmsFieldTechnologies')}</FieldLabel>
      <FieldDescription>{t('cmsTechnologiesHint')}</FieldDescription>
      <div className="flex flex-col gap-3">
        {[...byCategory.entries()].map(([group, techs]) => (
          <div key={group} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{categoryLabel(group)}:</span>
            {techs.map((tech) => {
              const selected = selectedIds.includes(tech.id)
              return (
                <button key={tech.id} type="button" disabled={disabled} onClick={() => toggle(tech.id)} aria-pressed={selected}>
                  <Badge variant={selected ? 'brand' : 'outline'} className="cursor-pointer select-none">
                    <span dir="ltr">{tech.name}</span>
                  </Badge>
                </button>
              )
            })}
          </div>
        ))}
        {list.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsNoTechnologies')}</p> : null}

        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
          <Field className="min-w-40 flex-1">
            <FieldLabel htmlFor="new-technology-name">{t('cmsNewTechnologyName')}</FieldLabel>
            <Input id="new-technology-name" dir="ltr" value={name} maxLength={40} placeholder="Flutter, Laravel, SQL Server…" disabled={disabled || pending} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field className="min-w-36">
            <FieldLabel htmlFor="new-technology-category">{t('cmsNewTechnologyCategory')}</FieldLabel>
            <NativeSelect id="new-technology-category" value={category} disabled={disabled || pending} onChange={(event) => setCategory(event.target.value)}>
              {TECHNOLOGY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {tCategory(value)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="button" size="sm" variant="outline" disabled={disabled || pending || !name.trim()} onClick={handleAdd}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsAddTechnology')}
          </Button>
        </div>
        {error ? <FormMessage variant="destructive">{t('cmsErrorInvalid')}</FormMessage> : null}
      </div>
    </Field>
  )
}
