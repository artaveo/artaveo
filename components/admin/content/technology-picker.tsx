'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldLabel } from '@/components/ui/form-controls'
import { Badge } from '@/components/ui/badge'
import type { AdminTechnology } from '@/types/cms'

/**
 * § 15.2's technology stack picker — checkboxes against the existing,
 * curated `technologies` table (§ 12's "proper noun — never translated"
 * reference list), not a freetext field. Adding a *new* technology to the
 * curated list isn't part of this admin surface yet — see
 * `docs/phases/PHASE-15-README.md` — so a stack that genuinely needs
 * one not yet in the list can't be fully represented here today.
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

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  const byCategory = new Map<string, AdminTechnology[]>()
  for (const tech of technologies) {
    const list = byCategory.get(tech.category) ?? []
    list.push(tech)
    byCategory.set(tech.category, list)
  }

  return (
    <Field>
      <FieldLabel>{t('cmsFieldTechnologies')}</FieldLabel>
      <div className="flex flex-col gap-3">
        {[...byCategory.entries()].map(([category, techs]) => (
          <div key={category} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground capitalize">{category}:</span>
            {techs.map((tech) => {
              const selected = selectedIds.includes(tech.id)
              return (
                <button
                  key={tech.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(tech.id)}
                  aria-pressed={selected}
                >
                  <Badge variant={selected ? 'brand' : 'outline'} className="cursor-pointer select-none">
                    {tech.name}
                  </Badge>
                </button>
              )
            })}
          </div>
        ))}
        {technologies.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsNoTechnologies')}</p> : null}
      </div>
    </Field>
  )
}
