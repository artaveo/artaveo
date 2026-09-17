'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { createRecommendation, deleteRecommendation, moderateRecommendation, updateRecommendation } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FieldDescription, FormMessage } from '@/components/ui/form-controls'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { LocalizedTextareaField, emptyLocalized } from '@/components/admin/content/localized-fields'
import { RecommendationStatusBadge } from '@/components/admin/content/recommendation-status-badge'
import { t as tLocalized, type Locale, type LocalizedText, type RecommendationVerification } from '@/types/content'
import type { AdminRecommendation, RecommendationInput } from '@/types/cms'

type EntityOption = { id: string; title: LocalizedText }

function inputFromRecommendation(rec: AdminRecommendation): RecommendationInput {
  return {
    personName: rec.personName,
    personTitle: rec.personTitle,
    company: rec.company,
    relationship: rec.relationship,
    statement: rec.statement,
    recommendationDate: rec.recommendationDate,
    sourceUrl: rec.sourceUrl,
    verification: rec.verification ?? 'platform-review',
    relatedProjectId: rec.relatedProjectId,
    relatedServiceId: rec.relatedServiceId,
    consentToPublish: rec.consentToPublish,
  }
}

function EntitySelect({
  id,
  label,
  noneLabel,
  value,
  options,
  locale,
  disabled,
  onChange,
}: {
  id: string
  label: string
  noneLabel: string
  value: string | null
  options: EntityOption[]
  locale: Locale
  disabled?: boolean
  onChange: (next: string | null) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value ?? 'none'} onValueChange={(next) => onChange(!next || next === 'none' ? null : next)} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="none">{noneLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {tLocalized(option.title, locale)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

/** One recommendation's read/edit/moderate card — request-flow submissions and the admin's own manual entries share this same UI, the only difference being whether `verification` is editable (see the field below). */
function RecommendationCard({
  rec,
  projects,
  services,
  locale,
  onDone,
}: {
  rec: AdminRecommendation & { completeness: { en: boolean; fa: boolean } }
  projects: EntityOption[]
  services: EntityOption[]
  locale: Locale
  onDone: () => void
}) {
  const t = useTranslations('Admin')
  const [draft, setDraft] = useState<RecommendationInput>(inputFromRecommendation(rec))
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromRequest = rec.verification === 'verified-request'

  async function handleSave() {
    setPending(true)
    setError(null)
    const result = await updateRecommendation(rec.id, draft)
    if (!result.ok) setError(t('errorForbidden'))
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deleteRecommendation(rec.id)
    if (!result.ok) setError(t('errorForbidden'))
    setPending(false)
    onDone()
  }

  async function handleModerate(action: 'approve' | 'reject' | 'request-change') {
    setPending(true)
    setError(null)
    const result = await moderateRecommendation(rec.id, action, note)
    if (!result.ok) {
      if (result.code === 'not-complete') setError(t('cmsErrorNotComplete'))
      else if (result.code === 'no-consent') setError(t('cmsRecErrorNoConsent'))
      else if (result.code === 'note-required') setError(t('cmsRecErrorNoteRequired'))
      else setError(t('errorForbidden'))
      setPending(false)
      return
    }
    setNote('')
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RecommendationStatusBadge status={rec.status} />
            <CompletenessBadges completeness={rec.completeness} />
            {!rec.consentToPublish ? <span className="text-xs text-warning-text">{t('cmsRecNoConsentNote')}</span> : null}
          </div>
          <span className="text-xs text-muted-foreground">{new Date(rec.createdAt).toLocaleDateString(locale)}</span>
        </div>

        {rec.moderationNote ? (
          <FormMessage variant="warning">
            {t('cmsRecModerationNoteLabel')}: {rec.moderationNote}
          </FormMessage>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-name`}>{t('cmsRecFieldName')}</FieldLabel>
            <Input id={`rec-${rec.id}-name`} value={draft.personName} disabled={pending} onChange={(event) => setDraft({ ...draft, personName: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-title`}>{t('cmsRecFieldRole')}</FieldLabel>
            <Input id={`rec-${rec.id}-title`} value={draft.personTitle ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, personTitle: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-company`}>{t('cmsRecFieldCompany')}</FieldLabel>
            <Input id={`rec-${rec.id}-company`} value={draft.company ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, company: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-relationship`}>{t('cmsRecFieldRelationship')}</FieldLabel>
            <Input id={`rec-${rec.id}-relationship`} value={draft.relationship} disabled={pending} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })} />
          </Field>
        </div>

        <LocalizedTextareaField
          id={`rec-${rec.id}-statement`}
          label={t('cmsRecFieldStatement')}
          value={draft.statement}
          disabled={pending}
          rows={3}
          onChange={(statement) => setDraft({ ...draft, statement })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-source`}>{t('cmsRecFieldSourceUrl')}</FieldLabel>
            <Input id={`rec-${rec.id}-source`} dir="ltr" value={draft.sourceUrl ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`rec-${rec.id}-verification`}>{t('cmsRecFieldVerification')}</FieldLabel>
            {fromRequest ? (
              <>
                <Input id={`rec-${rec.id}-verification`} disabled value={t('cmsRecVerificationVerifiedRequest')} />
                <FieldDescription>{t('cmsRecVerificationLockedNote')}</FieldDescription>
              </>
            ) : (
              <Select value={draft.verification} onValueChange={(next) => next && setDraft({ ...draft, verification: next as RecommendationVerification })} disabled={pending}>
                <SelectTrigger id={`rec-${rec.id}-verification`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="platform-review">{t('cmsRecVerificationPlatformReview')}</SelectItem>
                    <SelectItem value="public-profile">{t('cmsRecVerificationPublicProfile')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <EntitySelect
            id={`rec-${rec.id}-project`}
            label={t('cmsRecFieldRelatedProject')}
            noneLabel={t('cmsRecRequestNoProject')}
            value={draft.relatedProjectId}
            options={projects}
            locale={locale}
            disabled={pending}
            onChange={(relatedProjectId) => setDraft({ ...draft, relatedProjectId })}
          />
          <EntitySelect
            id={`rec-${rec.id}-service`}
            label={t('cmsRecFieldRelatedService')}
            noneLabel={t('cmsRecRequestNoService')}
            value={draft.relatedServiceId}
            options={services}
            locale={locale}
            disabled={pending}
            onChange={(relatedServiceId) => setDraft({ ...draft, relatedServiceId })}
          />
        </div>

        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
            {t('cmsSaveChanges')}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleDelete} className="text-destructive-text">
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            {t('cmsDelete')}
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <FieldLabel htmlFor={`rec-${rec.id}-note`}>{t('cmsRecModerationNoteField')}</FieldLabel>
          <Textarea id={`rec-${rec.id}-note`} rows={2} value={note} disabled={pending} onChange={(event) => setNote(event.target.value)} placeholder={t('cmsRecModerationNotePlaceholder')} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending || rec.status === 'approved'} onClick={() => handleModerate('approve')}>
              {t('cmsRecApprove')}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending || rec.status === 'changes-requested'} onClick={() => handleModerate('request-change')}>
              {t('cmsRecRequestChange')}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending || rec.status === 'rejected'} onClick={() => handleModerate('reject')} className="text-destructive-text">
              {t('cmsRecReject')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AddRecommendationCard({ projects, services, locale, onDone }: { projects: EntityOption[]; services: EntityOption[]; locale: Locale; onDone: () => void }) {
  const t = useTranslations('Admin')
  const empty: RecommendationInput = {
    personName: '',
    personTitle: '',
    company: '',
    relationship: '',
    statement: emptyLocalized(),
    recommendationDate: null,
    sourceUrl: '',
    verification: 'platform-review',
    relatedProjectId: null,
    relatedServiceId: null,
    consentToPublish: true,
  }
  const [draft, setDraft] = useState<RecommendationInput>(empty)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createRecommendation(draft)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setDraft(empty)
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <p className="text-sm font-medium text-foreground">{t('cmsRecAddManualTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('cmsRecAddManualNote')}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="new-rec-name">{t('cmsRecFieldName')}</FieldLabel>
            <Input id="new-rec-name" value={draft.personName} disabled={pending} onChange={(event) => setDraft({ ...draft, personName: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-rec-title">{t('cmsRecFieldRole')}</FieldLabel>
            <Input id="new-rec-title" value={draft.personTitle ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, personTitle: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-rec-company">{t('cmsRecFieldCompany')}</FieldLabel>
            <Input id="new-rec-company" value={draft.company ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, company: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-rec-relationship">{t('cmsRecFieldRelationship')}</FieldLabel>
            <Input id="new-rec-relationship" value={draft.relationship} disabled={pending} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })} />
          </Field>
        </div>

        <LocalizedTextareaField id="new-rec-statement" label={t('cmsRecFieldStatement')} value={draft.statement} disabled={pending} rows={3} onChange={(statement) => setDraft({ ...draft, statement })} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="new-rec-source">{t('cmsRecFieldSourceUrl')}</FieldLabel>
            <Input id="new-rec-source" dir="ltr" value={draft.sourceUrl ?? ''} disabled={pending} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} />
            <FieldDescription>{t('cmsRecFieldSourceUrlManualHint')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-rec-verification">{t('cmsRecFieldVerification')}</FieldLabel>
            <Select value={draft.verification} onValueChange={(next) => next && setDraft({ ...draft, verification: next as RecommendationVerification })} disabled={pending}>
              <SelectTrigger id="new-rec-verification">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="platform-review">{t('cmsRecVerificationPlatformReview')}</SelectItem>
                  <SelectItem value="public-profile">{t('cmsRecVerificationPublicProfile')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <EntitySelect
            id="new-rec-project"
            label={t('cmsRecFieldRelatedProject')}
            noneLabel={t('cmsRecRequestNoProject')}
            value={draft.relatedProjectId}
            options={projects}
            locale={locale}
            disabled={pending}
            onChange={(relatedProjectId) => setDraft({ ...draft, relatedProjectId })}
          />
          <EntitySelect
            id="new-rec-service"
            label={t('cmsRecFieldRelatedService')}
            noneLabel={t('cmsRecRequestNoService')}
            value={draft.relatedServiceId}
            options={services}
            locale={locale}
            disabled={pending}
            onChange={(relatedServiceId) => setDraft({ ...draft, relatedServiceId })}
          />
        </div>

        <Button type="button" size="sm" disabled={pending} onClick={handleAdd} className="self-start">
          {t('cmsRecAddManual')}
        </Button>
        {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
      </CardContent>
    </Card>
  )
}

export function RecommendationsEditor({
  recommendations,
  projects,
  services,
  locale,
}: {
  recommendations: (AdminRecommendation & { completeness: { en: boolean; fa: boolean } })[]
  projects: EntityOption[]
  services: EntityOption[]
  locale: Locale
}) {
  const t = useTranslations('Admin')
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3">
      {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsRecNoneYet')}</p> : null}
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} projects={projects} services={services} locale={locale} onDone={() => router.refresh()} />
      ))}
      <AddRecommendationCard projects={projects} services={services} locale={locale} onDone={() => router.refresh()} />
    </div>
  )
}
