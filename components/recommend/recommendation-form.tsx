'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { submitRecommendation } from '@/app/actions/recommendations'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox, Field, FieldDescription, FieldError, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input, Textarea, Label } from '@/components/ui/input'
import { SuccessState } from '@/components/ui/states'
import { t as tLocalized, type Locale, type LocalizedText } from '@/types/content'
import type { RecommendationSubmissionInput } from '@/types/cms'

type PriorSubmission = {
  personName: string
  personTitle: string
  company: string
  relationship: string
  statement: string
  sourceUrl: string
} | null

export function RecommendationForm({
  token,
  locale,
  priorSubmission,
  moderationNote,
  suggestedRelatedProjectTitle,
  suggestedRelatedServiceTitle,
}: {
  token: string
  locale: Locale
  priorSubmission: PriorSubmission
  moderationNote: string | null
  suggestedRelatedProjectTitle: LocalizedText | null
  suggestedRelatedServiceTitle: LocalizedText | null
}) {
  const t = useTranslations('RecommendPage')

  const [draft, setDraft] = useState<RecommendationSubmissionInput>({
    personName: priorSubmission?.personName ?? '',
    personTitle: priorSubmission?.personTitle ?? '',
    company: priorSubmission?.company ?? '',
    relationship: priorSubmission?.relationship ?? '',
    statement: priorSubmission?.statement ?? '',
    profileUrl: priorSubmission?.sourceUrl ?? '',
    consentToPublish: Boolean(priorSubmission),
  })
  const [honeypot, setHoneypot] = useState('')
  const formRenderedAt = useRef(Date.now())
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const forLabel = suggestedRelatedProjectTitle
    ? tLocalized(suggestedRelatedProjectTitle, locale)
    : suggestedRelatedServiceTitle
      ? tLocalized(suggestedRelatedServiceTitle, locale)
      : null

  const errors = {
    personName: draft.personName.trim() ? null : t('errorRequired'),
    relationship: draft.relationship.trim() ? null : t('errorRequired'),
    statement: draft.statement.trim() ? null : t('errorRequired'),
    consentToPublish: draft.consentToPublish ? null : t('errorConsentRequired'),
  }
  const hasErrors = Object.values(errors).some(Boolean)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (hasErrors) {
      setShowErrors(true)
      return
    }

    setStatus('submitting')
    setErrorCode(null)
    const result = await submitRecommendation(token, locale, draft, { honeypot, formRenderedAt: formRenderedAt.current })

    if (!result.ok) {
      setErrorCode(result.code)
      setStatus('error')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return <SuccessState title={t('successTitle')} description={t('successDescription')} />
  }

  const fieldErrors = showErrors ? errors : { personName: null, relationship: null, statement: null, consentToPublish: null }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{forLabel ? t('introForProject', { name: forLabel }) : t('intro')}</p>
        </div>

        {moderationNote ? <FormMessage variant="warning">{t('moderationNoteIntro', { note: moderationNote })}</FormMessage> : null}

        <form method="post" className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {/* Honeypot — same off-screen pattern as the Brief Builder (components/start/brief-builder.tsx). A real visitor never sees or fills this. */}
          <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <Label htmlFor="rec-website">Leave this field blank</Label>
            <input id="rec-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </div>

          <Field invalid={Boolean(fieldErrors.personName)}>
            <FieldLabel htmlFor="rec-name">
              {t('fieldName')} <span className="text-destructive-text">*</span>
            </FieldLabel>
            <Input id="rec-name" value={draft.personName} onChange={(event) => setDraft({ ...draft, personName: event.target.value })} disabled={status === 'submitting'} />
            {fieldErrors.personName ? <FieldError>{fieldErrors.personName}</FieldError> : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rec-title">{t('fieldRole')}</FieldLabel>
              <Input id="rec-title" value={draft.personTitle} onChange={(event) => setDraft({ ...draft, personTitle: event.target.value })} disabled={status === 'submitting'} />
            </Field>
            <Field>
              <FieldLabel htmlFor="rec-company">{t('fieldCompany')}</FieldLabel>
              <Input id="rec-company" value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} disabled={status === 'submitting'} />
            </Field>
          </div>

          <Field invalid={Boolean(fieldErrors.relationship)}>
            <FieldLabel htmlFor="rec-relationship">
              {t('fieldRelationship')} <span className="text-destructive-text">*</span>
            </FieldLabel>
            <Input
              id="rec-relationship"
              value={draft.relationship}
              placeholder={t('fieldRelationshipPlaceholder')}
              onChange={(event) => setDraft({ ...draft, relationship: event.target.value })}
              disabled={status === 'submitting'}
            />
            {fieldErrors.relationship ? <FieldError>{fieldErrors.relationship}</FieldError> : null}
          </Field>

          <Field invalid={Boolean(fieldErrors.statement)}>
            <FieldLabel htmlFor="rec-statement">
              {t('fieldStatement')} <span className="text-destructive-text">*</span>
            </FieldLabel>
            <Textarea id="rec-statement" rows={6} value={draft.statement} onChange={(event) => setDraft({ ...draft, statement: event.target.value })} disabled={status === 'submitting'} />
            {fieldErrors.statement ? <FieldError>{fieldErrors.statement}</FieldError> : <FieldDescription>{t('fieldStatementHint')}</FieldDescription>}
          </Field>

          <Field>
            <FieldLabel htmlFor="rec-profile-url">{t('fieldProfileUrl')}</FieldLabel>
            <Input id="rec-profile-url" dir="ltr" value={draft.profileUrl} onChange={(event) => setDraft({ ...draft, profileUrl: event.target.value })} disabled={status === 'submitting'} />
            <FieldDescription>{t('fieldProfileUrlHint')}</FieldDescription>
          </Field>

          <Field invalid={Boolean(fieldErrors.consentToPublish)}>
            <div className="flex items-start gap-2">
              <Checkbox id="rec-consent" checked={draft.consentToPublish} onCheckedChange={(checked) => setDraft({ ...draft, consentToPublish: checked === true })} disabled={status === 'submitting'} />
              <FieldLabel htmlFor="rec-consent" className="font-normal">
                {t('consentLabel')}
              </FieldLabel>
            </div>
            {fieldErrors.consentToPublish ? <FieldError>{fieldErrors.consentToPublish}</FieldError> : null}
          </Field>

          {status === 'error' ? (
            <FormMessage variant="destructive">
              {errorCode === 'closed' ? t('errorClosed') : errorCode === 'not-configured' ? t('errorNotConfigured') : errorCode === 'rejected' ? t('errorRejected') : t('errorGeneric')}
            </FormMessage>
          ) : null}

          <Button type="submit" disabled={status === 'submitting'} className="self-start">
            {status === 'submitting' ? t('submitting') : t('submitButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
