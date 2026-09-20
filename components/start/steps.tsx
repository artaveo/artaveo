'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  Checkbox,
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Radio,
  RadioGroup,
} from '@/components/ui/form-controls'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { t, type Locale, type EngagementModel, type Service } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import {
  budgetBandOptions,
  featureTagOptions,
  preferredChannelOptions,
  projectTypeOptions,
  timelineOptions,
} from '@/lib/inquiry-content'
import type { StepErrors } from '@/lib/inquiry-validation'
import { removeInquiryAttachment, uploadInquiryAttachment } from '@/app/actions/inquiry-attachments'
import { X } from 'lucide-react'

type StepProps = {
  draft: InquiryDraft
  errors: StepErrors
  locale: Locale
  onChange: (patch: Partial<InquiryDraft>) => void
}

/** Small helper: resolves a translated error message key into copy, or nothing when the field is clean. */
function useFieldError() {
  const t18n = useTranslations('BriefBuilder')
  return (code: string | undefined) => {
    if (!code) return null
    if (code === 'required') return t18n('errorRequired')
    if (code === 'tooShort') return t18n('errorTooShort')
    if (code === 'invalidEmail') return t18n('errorInvalidEmail')
    if (code === 'invalidUrl') return t18n('errorInvalidUrl')
    return t18n('errorRequired')
  }
}

/* -------------------------------------------------------------------------
 * Step 1 — Service & engagement model
 * ---------------------------------------------------------------------- */

export function ServiceStep({
  draft,
  locale,
  onChange,
  services,
  engagementModels,
}: StepProps & { services: Service[]; engagementModels: EngagementModel[] }) {
  const t18n = useTranslations('BriefBuilder')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('serviceStepTitle')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          {t18n('serviceStepDescription')}
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="brief-service">{t18n('serviceLabel')}</FieldLabel>
        <Select
          value={draft.serviceSlug ?? '__none__'}
          onValueChange={(value) =>
            onChange({ serviceSlug: value === '__none__' ? undefined : (value as string) })
          }
        >
          <SelectTrigger id="brief-service">
            {/* Render-prop form (not a bare placeholder): resolves the
                label from `value` directly, so a prefilled `?service=`
                slug shows its real title immediately on first paint
                instead of the raw slug flashing before the popup's own
                items have registered. */}
            <SelectValue placeholder={t18n('servicePlaceholder')}>
              {(value: string | null) => {
                if (!value || value === '__none__') return t18n('noServiceOption')
                const service = services.find((s) => s.slug === value)
                return service ? t(service.title, locale) : t18n('servicePlaceholder')
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__none__">{t18n('noServiceOption')}</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.slug} value={service.slug}>
                  {t(service.title, locale)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {draft.packageId ? (
          <FieldDescription>{t18n('packagePrefilledNote', { package: draft.packageId })}</FieldDescription>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="brief-engagement">{t18n('engagementModelLabel')}</FieldLabel>
        <Select
          value={draft.engagementModelId ?? '__none__'}
          onValueChange={(value) =>
            onChange({ engagementModelId: value === '__none__' ? undefined : (value as string) })
          }
        >
          <SelectTrigger id="brief-engagement">
            <SelectValue placeholder={t18n('engagementModelPlaceholder')}>
              {(value: string | null) => {
                if (!value || value === '__none__') return t18n('noEngagementOption')
                const model = engagementModels.find((m) => m.id === value)
                return model ? t(model.name, locale) : t18n('engagementModelPlaceholder')
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__none__">{t18n('noEngagementOption')}</SelectItem>
              {engagementModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {t(model.name, locale)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Step 2 — Project type & goal
 * ---------------------------------------------------------------------- */

export function ProjectStep({ draft, errors, locale, onChange }: StepProps) {
  const t18n = useTranslations('BriefBuilder')
  const fieldError = useFieldError()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('projectStepTitle')}</h2>
      </div>

      <Field invalid={Boolean(errors.projectType)}>
        <FieldLabel>{t18n('projectTypeLabel')}</FieldLabel>
        <RadioGroup
          value={draft.projectType}
          onValueChange={(value) => onChange({ projectType: value as InquiryDraft['projectType'] })}
          className="gap-3"
        >
          {projectTypeOptions.map((option) => (
            <FieldItem key={option.id} className="flex items-start gap-2.5">
              <Radio value={option.id} className="mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <FieldLabel className="font-normal">
                  {t(option.label, locale)}
                </FieldLabel>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">{t(option.description, locale)}</span>
                ) : null}
              </div>
            </FieldItem>
          ))}
        </RadioGroup>
        {errors.projectType ? <FieldError>{fieldError(errors.projectType)}</FieldError> : null}
      </Field>

      <Field invalid={Boolean(errors.goal)}>
        <FieldLabel htmlFor="brief-goal">{t18n('goalLabel')}</FieldLabel>
        <Textarea
          id="brief-goal"
          rows={4}
          value={draft.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
          placeholder={t18n('goalPlaceholder')}
          aria-invalid={Boolean(errors.goal)}
        />
        {errors.goal ? <FieldError>{fieldError(errors.goal)}</FieldError> : <FieldDescription>{t18n('goalHint')}</FieldDescription>}
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Step 3 — Scope / key features
 * ---------------------------------------------------------------------- */

export function ScopeStep({ draft, errors, locale, onChange }: StepProps) {
  const t18n = useTranslations('BriefBuilder')
  const fieldError = useFieldError()

  function toggleFeature(id: InquiryDraft['featureTags'][number], checked: boolean) {
    const next = checked
      ? [...draft.featureTags, id]
      : draft.featureTags.filter((tag) => tag !== id)
    onChange({ featureTags: next })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('scopeStepTitle')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          {t18n('scopeStepDescription')}
        </p>
      </div>

      <Field>
        <FieldLabel>{t18n('featuresLabel')}</FieldLabel>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {featureTagOptions.map((option) => (
            <div key={option.id} className="flex items-center gap-2.5">
              <Checkbox
                id={`brief-feature-${option.id}`}
                checked={draft.featureTags.includes(option.id)}
                onCheckedChange={(checked) => toggleFeature(option.id, checked === true)}
              />
              <FieldLabel htmlFor={`brief-feature-${option.id}`} className="font-normal">
                {t(option.label, locale)}
              </FieldLabel>
            </div>
          ))}
        </div>
      </Field>

      {draft.featureTags.includes('other') ? (
        <Field invalid={Boolean(errors.featureOtherNote)}>
          <FieldLabel htmlFor="brief-feature-other-note">{t18n('featureOtherLabel')}</FieldLabel>
          <Input
            id="brief-feature-other-note"
            value={draft.featureOtherNote}
            onChange={(e) => onChange({ featureOtherNote: e.target.value })}
            placeholder={t18n('featureOtherPlaceholder')}
            aria-invalid={Boolean(errors.featureOtherNote)}
          />
          {errors.featureOtherNote ? <FieldError>{fieldError(errors.featureOtherNote)}</FieldError> : null}
        </Field>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Step 4 — Timeline & budget
 * ---------------------------------------------------------------------- */

export function TimelineStep({ draft, errors, locale, onChange }: StepProps) {
  const t18n = useTranslations('BriefBuilder')
  const fieldError = useFieldError()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('timelineStepTitle')}</h2>
      </div>

      <Field invalid={Boolean(errors.timeline)}>
        <FieldLabel>{t18n('timelineLabel')}</FieldLabel>
        <RadioGroup
          value={draft.timeline}
          onValueChange={(value) => onChange({ timeline: value as InquiryDraft['timeline'] })}
          className="gap-2.5"
        >
          {timelineOptions.map((option) => (
            <FieldItem key={option.id} className="flex items-center gap-2.5">
              <Radio value={option.id} />
              <FieldLabel className="font-normal">
                {t(option.label, locale)}
              </FieldLabel>
            </FieldItem>
          ))}
        </RadioGroup>
        {errors.timeline ? <FieldError>{fieldError(errors.timeline)}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="brief-budget">{t18n('budgetLabel')}</FieldLabel>
        <Select
          value={draft.budgetBand ?? '__none__'}
          onValueChange={(value) =>
            onChange({ budgetBand: value === '__none__' ? undefined : (value as InquiryDraft['budgetBand']) })
          }
        >
          <SelectTrigger id="brief-budget">
            <SelectValue placeholder="—">
              {(value: string | null) => {
                if (!value || value === '__none__') return '—'
                const band = budgetBandOptions.find((b) => b.id === value)
                return band ? t(band.label, locale) : '—'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__none__">—</SelectItem>
              {budgetBandOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {t(option.label, locale)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>{t18n('budgetHint')}</FieldDescription>
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Step 5 — Links & references
 * ---------------------------------------------------------------------- */

export function LinksStep({ draft, errors, onChange }: StepProps) {
  const t18n = useTranslations('BriefBuilder')
  const fieldError = useFieldError()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateLink(id: string, url: string) {
    onChange({ links: draft.links.map((link) => (link.id === id ? { ...link, url } : link)) })
  }

  function addLink() {
    onChange({ links: [...draft.links, { id: crypto.randomUUID(), url: '' }] })
  }

  function removeLink(id: string) {
    onChange({ links: draft.links.filter((link) => link.id !== id) })
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (draft.attachmentMediaIds.length >= 3) {
      setUploadError(t18n('attachmentLimitReached'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setUploadError(null)
    const formData = new FormData()
    formData.set('file', file)
    const result = await uploadInquiryAttachment(formData)
    if (!result.ok) {
      const messages: Record<string, string> = {
        'invalid-type': t18n('attachmentInvalidType'),
        'too-large': t18n('attachmentTooLarge'),
        rejected: t18n('attachmentRejected'),
      }
      setUploadError(messages[result.code] ?? t18n('attachmentUploadFailed'))
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFileNames((current) => ({ ...current, [result.mediaId]: result.fileName }))
    onChange({ attachmentMediaIds: [...draft.attachmentMediaIds, result.mediaId] })
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRemoveAttachment(mediaId: string) {
    onChange({ attachmentMediaIds: draft.attachmentMediaIds.filter((id) => id !== mediaId) })
    await removeInquiryAttachment(mediaId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('linksStepTitle')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          {t18n('linksStepDescription')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {draft.links.map((link, index) => (
          <Field key={link.id} invalid={Boolean(errors[`link-${index}`])}>
            <div className="flex items-center gap-2">
              <Input
                dir="ltr"
                value={link.url}
                onChange={(e) => updateLink(link.id, e.target.value)}
                placeholder={t18n('linkPlaceholder')}
                aria-invalid={Boolean(errors[`link-${index}`])}
                className="text-start"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t18n('removeLink')}
                onClick={() => removeLink(link.id)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {errors[`link-${index}`] ? <FieldError>{fieldError(errors[`link-${index}`])}</FieldError> : null}
          </Field>
        ))}

        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLink}>
          {t18n('addLink')}
        </Button>
      </div>

      {/* Must be a Field: FieldLabel / FieldDescription / FieldError throw ("FieldRootContext is missing") outside one, which crashed the whole builder at this step. */}
      <Field className="gap-3" invalid={Boolean(uploadError)}>
        <FieldLabel>{t18n('attachmentsLabel')}</FieldLabel>
        <FieldDescription>{t18n('attachmentsDescription')}</FieldDescription>

        {draft.attachmentMediaIds.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {draft.attachmentMediaIds.map((mediaId) => (
              <li key={mediaId} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <span className="truncate">{fileNames[mediaId] ?? mediaId}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t18n('removeAttachment')} onClick={() => handleRemoveAttachment(mediaId)}>
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {draft.attachmentMediaIds.length < 3 ? (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            disabled={uploading}
            onChange={handleFileSelected}
            aria-label={t18n('attachmentsLabel')}
            className="text-sm"
          />
        ) : null}
        {uploadError ? <FieldError>{uploadError}</FieldError> : null}
        <FieldDescription>{t18n('attachmentsRules')}</FieldDescription>
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Step 6 — Contact details, preferred channel & consent
 * ---------------------------------------------------------------------- */

export function ContactStep({ draft, errors, locale, onChange }: StepProps) {
  const t18n = useTranslations('BriefBuilder')
  const fieldError = useFieldError()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{t18n('contactStepTitle')}</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="brief-name">{t18n('nameLabel')}</FieldLabel>
          <Input
            id="brief-name"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t18n('namePlaceholder')}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
          />
          {errors.name ? <FieldError>{fieldError(errors.name)}</FieldError> : null}
        </Field>

        <Field invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="brief-email">{t18n('emailLabel')}</FieldLabel>
          <Input
            id="brief-email"
            type="email"
            dir="ltr"
            className="text-start"
            value={draft.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={t18n('emailPlaceholder')}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
          />
          {errors.email ? <FieldError>{fieldError(errors.email)}</FieldError> : null}
        </Field>
      </div>

      <Field invalid={Boolean(errors.phone)}>
        <FieldLabel htmlFor="brief-phone">{t18n('phoneLabel')}</FieldLabel>
        <Input
          id="brief-phone"
          type="tel"
          dir="ltr"
          className="text-start"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder={t18n('phonePlaceholder')}
          aria-invalid={Boolean(errors.phone)}
          autoComplete="tel"
        />
        {errors.phone ? <FieldError>{fieldError(errors.phone)}</FieldError> : <FieldDescription>{t18n('phoneHint')}</FieldDescription>}
      </Field>

      <Field>
        <FieldLabel>{t18n('preferredChannelLabel')}</FieldLabel>
        <RadioGroup
          value={draft.preferredChannel}
          onValueChange={(value) => onChange({ preferredChannel: value as InquiryDraft['preferredChannel'] })}
          className="flex-row gap-5"
        >
          {preferredChannelOptions.map((option) => (
            <FieldItem key={option.id} className="flex items-center gap-2.5">
              <Radio value={option.id} />
              <FieldLabel className="font-normal">
                {t(option.label, locale)}
              </FieldLabel>
            </FieldItem>
          ))}
        </RadioGroup>
      </Field>

      <Field invalid={Boolean(errors.consent)}>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="brief-consent"
            className="mt-0.5"
            checked={draft.consent}
            onCheckedChange={(checked) => onChange({ consent: checked === true })}
          />
          <FieldLabel htmlFor="brief-consent" className="font-normal">
            {t18n('consentLabel')}
          </FieldLabel>
        </div>
        {errors.consent ? <FieldError>{fieldError(errors.consent)}</FieldError> : null}
      </Field>
    </div>
  )
}

export type { StepProps }
