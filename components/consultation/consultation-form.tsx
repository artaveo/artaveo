'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { submitConsultationRequest } from '@/app/actions/consultations'
import {
  checkWindowRows,
  emptyWindowRow,
  rowsToInputs,
  useClientClock,
  WindowsEditor,
  type WindowRow,
} from '@/components/consultation/windows-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox, Field, FieldDescription, FieldError, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input, Label, Textarea } from '@/components/ui/input'
import { SuccessState } from '@/components/ui/states'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { CONSULTATION_DURATION_MINUTES, MAX_GOAL_LENGTH, MIN_GOAL_LENGTH, MAX_LEAD_DAYS, MIN_LEAD_HOURS } from '@/lib/consultation/config'
import type { Locale } from '@/types/content'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Phase 20 — the consultation request form (`/consultation`).
 *
 * Follows the Brief Builder's rules: the server re-validates everything and is
 * the only judge; a success screen is shown only after the request is really
 * saved (principle 15); a honeypot and a minimum fill time guard against
 * scripted submissions; the form's idempotency key means a double click or a
 * retry can never create two requests. Unlike the Brief Builder there is no
 * offline queue — a call request is time-sensitive (its windows are relative to
 * "now"), so being offline is said plainly and nothing is pretended.
 */
export function ConsultationForm({ locale }: { locale: Locale }) {
  const t = useTranslations('ConsultationPage')
  const { now, detectedZone } = useClientClock()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState('')
  const [consent, setConsent] = useState(false)
  const [rows, setRows] = useState<WindowRow[]>([emptyWindowRow()])
  const [chosenZone, setChosenZone] = useState<string | null>(null)
  const timezone = chosenZone ?? detectedZone ?? ''

  const [honeypot, setHoneypot] = useState('')
  const formRenderedAt = useRef(Date.now())
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID())
  const [status, setStatus] = useState<Status>('idle')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const windowsCheck = now && timezone ? checkWindowRows(timezone, rows, now) : { ok: false as const, code: 'incomplete' as const }
  const errors = {
    name: name.trim() ? null : t('errorRequired'),
    email: !email.trim() ? t('errorRequired') : EMAIL_PATTERN.test(email.trim()) ? null : t('errorEmail'),
    goal: goal.trim().length >= MIN_GOAL_LENGTH ? null : t('errorGoalShort', { min: MIN_GOAL_LENGTH }),
    consent: consent ? null : t('errorConsent'),
  }
  const hasErrors = Object.values(errors).some(Boolean) || !windowsCheck.ok

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (hasErrors || !now) {
      setShowErrors(true)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorCode('offline')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorCode(null)
    try {
      const result = await submitConsultationRequest(
        locale,
        { name, email, phone, goal, timezone, windows: rowsToInputs(rows), consent },
        {
          honeypot,
          formRenderedAt: formRenderedAt.current,
          idempotencyKey,
          sourceReferrer: typeof document !== 'undefined' ? document.referrer || null : null,
        },
      )
      if (!result.ok) {
        setErrorCode(result.code)
        setStatus('error')
        return
      }
      // Only after the server confirmed the request is saved — never on optimism.
      trackEvent('consultation_request', { locale, windows: rowsToInputs(rows).length })
      setToken(result.token)
      setStatus('success')
    } catch {
      // The call itself failed (connection dropped): nothing was confirmed, so nothing is claimed.
      setErrorCode('network')
      setStatus('error')
    }
  }

  if (status === 'success' && token) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <SuccessState title={t('successTitle')} description={t('successDescription')} />
          <Button render={<Link href={`/consultation/${token}`} />}>{t('successManage')}</Button>
        </CardContent>
      </Card>
    )
  }

  const submitting = status === 'submitting'
  const field = showErrors ? errors : { name: null, email: null, goal: null, consent: null }
  const windowCode = windowsCheck.ok || windowsCheck.code === 'incomplete' ? null : windowsCheck.code

  const submitError = (() => {
    switch (errorCode) {
      case null:
        return null
      case 'rejected':
        return t('errorRejected')
      case 'not-configured':
        return t('errorNotConfigured')
      case 'network':
        return t('errorNetwork')
      case 'offline':
        return t('errorOffline')
      case 'invalid':
        return t('errorGeneric')
      case 'error':
        return t('errorGeneric')
      default:
        return t(`errorWindow_${errorCode}` as 'errorWindow_window-order', {
          minutes: CONSULTATION_DURATION_MINUTES,
          hours: MIN_LEAD_HOURS,
          days: MAX_LEAD_DAYS,
        })
    }
  })()

  return (
    <Card>
      <CardContent className="pt-6">
        <form method="post" className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          {/* Honeypot — same off-screen pattern as the Brief Builder. A real visitor never sees or fills this. */}
          <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <Label htmlFor="consult-website">Leave this field blank</Label>
            <input id="consult-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={Boolean(field.name)}>
              <FieldLabel htmlFor="consult-name">
                {t('fieldName')} <span className="text-destructive-text">*</span>
              </FieldLabel>
              <Input id="consult-name" name="name" autoComplete="name" value={name} disabled={submitting} maxLength={200} onChange={(event) => setName(event.target.value)} />
              {field.name ? <FieldError>{field.name}</FieldError> : null}
            </Field>
            <Field invalid={Boolean(field.email)}>
              <FieldLabel htmlFor="consult-email">
                {t('fieldEmail')} <span className="text-destructive-text">*</span>
              </FieldLabel>
              <Input id="consult-email" name="email" type="email" dir="ltr" autoComplete="email" value={email} disabled={submitting} maxLength={320} onChange={(event) => setEmail(event.target.value)} />
              {field.email ? <FieldError>{field.email}</FieldError> : null}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="consult-phone">{t('fieldPhone')}</FieldLabel>
            <Input id="consult-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" value={phone} disabled={submitting} maxLength={60} onChange={(event) => setPhone(event.target.value)} />
            <FieldDescription>{t('fieldPhoneHint')}</FieldDescription>
          </Field>

          <Field invalid={Boolean(field.goal)}>
            <FieldLabel htmlFor="consult-goal">
              {t('fieldGoal')} <span className="text-destructive-text">*</span>
            </FieldLabel>
            <Textarea id="consult-goal" name="goal" rows={4} value={goal} disabled={submitting} maxLength={MAX_GOAL_LENGTH} onChange={(event) => setGoal(event.target.value)} />
            {field.goal ? <FieldError>{field.goal}</FieldError> : <FieldDescription>{t('fieldGoalHint')}</FieldDescription>}
          </Field>

          <fieldset className="flex flex-col gap-4" disabled={submitting}>
            <legend className="text-base font-semibold tracking-tight">{t('timesTitle')}</legend>
            <p className="-mt-2 text-sm text-muted-foreground">
              {t('timesHint', { minutes: CONSULTATION_DURATION_MINUTES, hours: MIN_LEAD_HOURS, days: MAX_LEAD_DAYS })}
            </p>
            <WindowsEditor
              idPrefix="consult"
              locale={locale}
              timezone={timezone}
              onTimezoneChange={setChosenZone}
              rows={rows}
              onChange={setRows}
              now={now}
              disabled={submitting}
              showErrors={showErrors}
            />
            {/* Set-level problems (overlap, count) that no single row owns. */}
            {windowCode === 'window-overlap' || windowCode === 'window-count' ? (
              <p role="alert" className="text-xs text-destructive-text">
                {t(`errorWindow_${windowCode}`)}
              </p>
            ) : null}
          </fieldset>

          <Field invalid={Boolean(field.consent)}>
            <div className="flex items-start gap-2">
              <Checkbox id="consult-consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} disabled={submitting} />
              <FieldLabel htmlFor="consult-consent" className="font-normal">
                {t('consentLabel')}
              </FieldLabel>
            </div>
            {field.consent ? <FieldError>{field.consent}</FieldError> : null}
          </Field>

          {status === 'error' && submitError ? <FormMessage variant="destructive">{submitError}</FormMessage> : null}

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
