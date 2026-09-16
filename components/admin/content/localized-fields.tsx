'use client'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/form-controls'
import { Input, Textarea } from '@/components/ui/input'
import type { LocalizedText } from '@/types/content'

/**
 * Shared bilingual editing controls for the § 15.1 content CMS. Every
 * prose field on `services`/`service_packages`/`service_addons`/`faqs`/
 * `engagement_models` is `{en, fa}` jsonb (roadmap § 3.2's bilingual
 * shape) — these are the two shapes that cover all of them: a single
 * `{en, fa}` pair (`LocalizedTextField`/`LocalizedTextareaField`) or a
 * list of pairs (`LocalizedListField`, for the `LocalizedText[]` bullet
 * fields like `forWhom`/`included`/`whatIDo`).
 *
 * All three are plain controlled components (value + onChange) — they
 * hold no state and call no Server Action themselves. The service editor
 * (and package/add-on/FAQ editors) own one form-wide state object and
 * submit it in a single mutation, same as any other multi-field form; the
 * per-tag Server-Action-per-keystroke pattern `TagsEditor` uses for leads
 * doesn't fit here because these fields aren't independently persisted.
 */

const emptyLocalized = (): LocalizedText => ({ en: '', fa: '' })

export function LocalizedTextField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  placeholderEn,
  placeholderFa,
}: {
  id: string
  label: string
  value: LocalizedText
  onChange: (next: LocalizedText) => void
  required?: boolean
  disabled?: boolean
  placeholderEn?: string
  placeholderFa?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-en`}>
        {label}
        {required ? <span className="text-destructive-text"> *</span> : null}
      </FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          id={`${id}-en`}
          dir="ltr"
          value={value.en}
          disabled={disabled}
          placeholder={placeholderEn ?? 'English'}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
        <Input
          id={`${id}-fa`}
          dir="rtl"
          value={value.fa}
          disabled={disabled}
          placeholder={placeholderFa ?? 'فارسی'}
          onChange={(event) => onChange({ ...value, fa: event.target.value })}
        />
      </div>
    </Field>
  )
}

export function LocalizedTextareaField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  rows = 3,
}: {
  id: string
  label: string
  value: LocalizedText
  onChange: (next: LocalizedText) => void
  required?: boolean
  disabled?: boolean
  rows?: number
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-en`}>
        {label}
        {required ? <span className="text-destructive-text"> *</span> : null}
      </FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        <Textarea
          id={`${id}-en`}
          dir="ltr"
          rows={rows}
          value={value.en}
          disabled={disabled}
          placeholder="English"
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
        <Textarea
          id={`${id}-fa`}
          dir="rtl"
          rows={rows}
          value={value.fa}
          disabled={disabled}
          placeholder="فارسی"
          onChange={(event) => onChange({ ...value, fa: event.target.value })}
        />
      </div>
    </Field>
  )
}

export function LocalizedListField({
  id,
  label,
  items,
  onChange,
  disabled,
  addLabel,
}: {
  id: string
  label: string
  items: LocalizedText[]
  onChange: (next: LocalizedText[]) => void
  disabled?: boolean
  addLabel: string
}) {
  function updateItem(index: number, next: LocalizedText) {
    onChange(items.map((item, i) => (i === index ? next : item)))
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }
  function addItem() {
    onChange([...items, emptyLocalized()])
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <Input
                id={`${id}-${index}-en`}
                dir="ltr"
                value={item.en}
                disabled={disabled}
                placeholder="English"
                onChange={(event) => updateItem(index, { ...item, en: event.target.value })}
              />
              <Input
                id={`${id}-${index}-fa`}
                dir="rtl"
                value={item.fa}
                disabled={disabled}
                placeholder="فارسی"
                onChange={(event) => updateItem(index, { ...item, fa: event.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => removeItem(index)}
              aria-label={`${label} — ${index + 1}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addItem} className="self-start">
          <Plus aria-hidden="true" data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
    </Field>
  )
}

export function StringListField({
  id,
  label,
  items,
  onChange,
  disabled,
  addLabel,
  placeholder,
}: {
  id: string
  label: string
  items: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  addLabel: string
  placeholder?: string
}) {
  function updateItem(index: number, next: string) {
    onChange(items.map((item, i) => (i === index ? next : item)))
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              id={`${id}-${index}`}
              value={item}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => updateItem(index, event.target.value)}
              className="max-w-72"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => removeItem(index)}
              aria-label={`${label} — ${index + 1}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([...items, ''])} className="self-start">
          <Plus aria-hidden="true" data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
    </Field>
  )
}

export { emptyLocalized }
