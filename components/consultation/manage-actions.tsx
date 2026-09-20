'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { cancelMyConsultation, rescheduleMyConsultation } from '@/app/actions/consultations'
import {
  checkWindowRows,
  emptyWindowRow,
  rowsToInputs,
  useClientClock,
  WindowsEditor,
  type WindowRow,
} from '@/components/consultation/windows-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Textarea } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { CONSULTATION_DURATION_MINUTES, MAX_CANCEL_REASON_LENGTH, MAX_LEAD_DAYS, MAX_RESCHEDULE_REQUESTS, MIN_LEAD_HOURS } from '@/lib/consultation/config'
import { siteConfig } from '@/lib/site'
import type { Locale } from '@/types/content'
import type { ClientActionCode } from '@/types/consultation'

type Mode = 'idle' | 'change' | 'cancel'

/**
 * The client's two actions on their own consultation: ask for a different
 * time, or cancel. Both go through the private token; the server decides
 * whether they are still allowed (`not-allowed` is a normal answer — the owner
 * may have confirmed or cancelled a moment ago), and the page is refreshed
 * from the server after every success so what is shown is what is stored.
 */
export function ManageActions({
  token,
  locale,
  timezone: initialZone,
  rescheduleRequests,
}: {
  token: string
  locale: Locale
  timezone: string
  rescheduleRequests: number
}) {
  const t = useTranslations('ConsultationManage')
  const tForm = useTranslations('ConsultationPage')
  const router = useRouter()
  const { now } = useClientClock()

  const [mode, setMode] = useState<Mode>('idle')
  const [rows, setRows] = useState<WindowRow[]>([emptyWindowRow()])
  const [timezone, setTimezone] = useState(initialZone)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<ClientActionCode | 'network' | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [done, setDone] = useState<'changed' | null>(null)

  const left = Math.max(0, MAX_RESCHEDULE_REQUESTS - rescheduleRequests)

  const message = (value: ClientActionCode | 'network') => {
    switch (value) {
      case 'not-allowed':
        return t('errorNotAllowed')
      case 'limit-reached':
        return t('errorLimit')
      case 'not-found':
        return t('errorNotFound')
      case 'expired':
        return t('errorExpired')
      case 'not-configured':
        return t('errorNotConfigured')
      case 'network':
        return t('errorNetwork')
      case 'invalid':
      case 'rejected':
      case 'error':
        return t('errorGeneric')
      default:
        return tForm(`errorWindow_${value}` as 'errorWindow_window-order', {
          minutes: CONSULTATION_DURATION_MINUTES,
          hours: MIN_LEAD_HOURS,
          days: MAX_LEAD_DAYS,
        })
    }
  }

  async function run(action: () => Promise<{ ok: true } | { ok: false; code: ClientActionCode }>, then?: () => void) {
    setPending(true)
    setCode(null)
    try {
      const result = await action()
      if (!result.ok) {
        setCode(result.code)
        // The page the client is looking at may be stale — the owner acted first.
        if (result.code === 'not-allowed' || result.code === 'expired') router.refresh()
        return
      }
      then?.()
      setMode('idle')
      router.refresh()
    } catch {
      setCode('network')
    } finally {
      setPending(false)
    }
  }

  function submitChange(event: React.FormEvent) {
    event.preventDefault()
    if (!now || !checkWindowRows(timezone, rows, now).ok) {
      setShowErrors(true)
      return
    }
    void run(() => rescheduleMyConsultation(token, timezone, rowsToInputs(rows)), () => {
      setDone('changed')
      setRows([emptyWindowRow()])
      setShowErrors(false)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {done === 'changed' && mode === 'idle' ? <FormMessage variant="success">{t('changeSuccess')}</FormMessage> : null}

      {mode === 'idle' ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>{t('changeTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {left > 0 ? (
                <>
                  <p className="text-muted-foreground">{t('changeHint', { left })}</p>
                  <Button type="button" variant="outline" className="self-start" onClick={() => { setMode('change'); setDone(null) }}>
                    {t('changeOpen')}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">{t('changeLimit', { email: siteConfig.email })}</p>
              )}
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>{t('cancelTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">{t('cancelHint')}</p>
              <Button type="button" variant="outline" className="self-start" onClick={() => { setMode('cancel'); setDone(null) }}>
                {t('cancelOpen')}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {mode === 'change' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('changeTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="post" className="flex flex-col gap-5" onSubmit={submitChange} noValidate>
              <WindowsEditor
                idPrefix="manage"
                locale={locale}
                timezone={timezone}
                onTimezoneChange={setTimezone}
                rows={rows}
                onChange={setRows}
                now={now}
                disabled={pending}
                showErrors={showErrors}
              />
              {code ? <FormMessage variant="destructive">{message(code)}</FormMessage> : null}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? t('changeSubmitting') : t('changeSubmit')}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => { setMode('idle'); setCode(null) }}>
                  {t('cancelKeep')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {mode === 'cancel' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('cancelTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="manage-reason">{t('cancelReasonLabel')}</FieldLabel>
              <Textarea id="manage-reason" rows={3} value={reason} maxLength={MAX_CANCEL_REASON_LENGTH} disabled={pending} onChange={(event) => setReason(event.target.value)} />
            </Field>
            {code ? <FormMessage variant="destructive">{message(code)}</FormMessage> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="destructive" disabled={pending} onClick={() => void run(() => cancelMyConsultation(token, reason))}>
                {pending ? t('cancelling') : t('cancelConfirm')}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => { setMode('idle'); setCode(null) }}>
                {t('cancelKeep')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mode === 'idle' && code ? <FormMessage variant="destructive">{message(code)}</FormMessage> : null}
    </div>
  )
}
