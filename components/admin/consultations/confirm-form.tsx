'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { confirmConsultationAction, type ConfirmChoice } from '@/app/actions/consultation-admin'
import { adminActionMessageKey } from '@/components/admin/consultations/admin-action-message'
import { useClientClock } from '@/components/consultation/windows-editor'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Textarea } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useRouter } from '@/i18n/navigation'
import { MAX_MEETING_DETAILS_LENGTH, TIME_STEP_MINUTES } from '@/lib/consultation/config'
import { dateOptions, describeInstant, describeUtcRange, slotStarts, timeInZone, timeOptions } from '@/lib/consultation/time'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'
import type { AdminActionCode, ConsultationWindow } from '@/types/consultation'

const CUSTOM = 'custom'
const TIMES = timeOptions(TIME_STEP_MINUTES)

function allZones(): string[] {
  const list = typeof Intl.supportedValuesOf === 'function' ? (Intl.supportedValuesOf('timeZone') as string[]) : []
  return list.includes('UTC') ? list : ['UTC', ...list]
}

/**
 * The owner confirms a time — or, on a call that is already confirmed, moves it
 * or changes how it happens. A time is chosen from the start times inside the
 * windows the client offered (one click), or entered as wall-clock in a zone
 * the owner picks (defaulting to the client's, so the numbers match what the
 * client wrote). Everything is re-validated on the server, including that a
 * "slot" really lies inside an offered window.
 */
export function ConfirmForm({
  consultationId,
  status,
  timezone,
  durationMinutes,
  windows,
  meetingDetails,
  locale,
}: {
  consultationId: string
  status: 'requested' | 'confirmed' | 'rescheduled'
  timezone: string
  durationMinutes: number
  windows: ConsultationWindow[]
  meetingDetails: string | null
  locale: Locale
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const { now } = useClientClock()

  const slots = useMemo(
    () =>
      now
        ? windows.flatMap((window) => slotStarts(window, durationMinutes, TIME_STEP_MINUTES)).filter((iso) => new Date(iso) > now)
        : [],
    [windows, durationMinutes, now],
  )

  const [choice, setChoice] = useState('')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [customZone, setCustomZone] = useState(timezone)
  const [details, setDetails] = useState(meetingDetails ?? '')
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<AdminActionCode | 'network' | null>(null)
  const [done, setDone] = useState(false)

  const effective = choice || (slots.length > 0 ? `slot:${slots[0]}` : CUSTOM)
  const isCustom = effective === CUSTOM
  const zones = useMemo(() => {
    const list = allZones()
    return list.includes(timezone) ? list : [timezone, ...list]
  }, [timezone])
  const days = useMemo(() => (now ? dateOptions(customZone, now, 90) : []), [now, customZone])

  const canSubmit = details.trim().length > 0 && (isCustom ? Boolean(customDate && customTime && customZone) : true)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) {
      setCode('invalid')
      return
    }
    const payload: ConfirmChoice = isCustom
      ? { kind: 'custom', date: customDate, time: customTime, timezone: customZone }
      : { kind: 'slot', start: effective.slice('slot:'.length) }

    setPending(true)
    setCode(null)
    setDone(false)
    try {
      const result = await confirmConsultationAction(consultationId, payload, details)
      if (!result.ok) {
        setCode(result.code)
        // Somebody (the client, another tab) acted first — show the truth.
        if (result.code === 'conflict' || result.code === 'invalid-transition') router.refresh()
        return
      }
      setDone(true)
      router.refresh()
    } catch {
      setCode('network')
    } finally {
      setPending(false)
    }
  }

  const moving = status === 'confirmed'

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <p className="text-sm text-muted-foreground">{t('consultationConfirmHint')}</p>

      <Field>
        <FieldLabel htmlFor="confirm-choice">{t('consultationChoiceLabel')}</FieldLabel>
        <NativeSelect id="confirm-choice" value={effective} disabled={pending || !now} onChange={(event) => setChoice(event.target.value)}>
          {slots.map((iso) => (
            <option key={iso} value={`slot:${iso}`}>
              {describeInstant(iso, timezone, locale).date} · {timeInZone(iso, timezone)} ({timezone}) — {timeInZone(iso, 'UTC')} UTC
            </option>
          ))}
          <option value={CUSTOM}>{t('consultationChoiceCustom')}</option>
        </NativeSelect>
        {now && slots.length === 0 ? <FieldDescription>{t('consultationNoFutureSlots')}</FieldDescription> : null}
      </Field>

      {isCustom ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="confirm-date">{t('consultationCustomDate')}</FieldLabel>
            <NativeSelect id="confirm-date" value={customDate} disabled={pending} onChange={(event) => setCustomDate(event.target.value)}>
              <option value="">—</option>
              {days.map((date) => (
                <option key={date} value={date}>
                  {formatDate(`${date}T12:00:00Z`, locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-time">{t('consultationCustomTime')}</FieldLabel>
            <NativeSelect id="confirm-time" dir="ltr" value={customTime} disabled={pending} onChange={(event) => setCustomTime(event.target.value)}>
              <option value="">—</option>
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-zone">{t('consultationCustomZone')}</FieldLabel>
            <NativeSelect id="confirm-zone" dir="ltr" value={customZone} disabled={pending} onChange={(event) => { setCustomZone(event.target.value); setCustomDate('') }}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <bdi dir="ltr">
            {describeUtcRange({ start: effective.slice('slot:'.length), end: new Date(new Date(effective.slice('slot:'.length)).getTime() + durationMinutes * 60_000).toISOString() })}
          </bdi>
        </p>
      )}

      <Field>
        <FieldLabel htmlFor="confirm-details">{t('consultationDetailsLabel')}</FieldLabel>
        <Textarea
          id="confirm-details"
          rows={3}
          dir="auto"
          value={details}
          maxLength={MAX_MEETING_DETAILS_LENGTH}
          placeholder={t('consultationDetailsPlaceholder')}
          disabled={pending}
          onChange={(event) => setDetails(event.target.value)}
        />
        <FieldDescription>{t('consultationDetailsHint')}</FieldDescription>
      </Field>

      {code ? <FormMessage variant="destructive">{code === 'network' ? t('consultationErrorGeneric') : t(adminActionMessageKey(code))}</FormMessage> : null}
      {done ? <FormMessage variant="success">{t('consultationConfirmedNote')}</FormMessage> : null}

      <Button type="submit" className="self-start" disabled={pending || !now}>
        {pending ? t('consultationConfirming') : moving ? t('consultationMoveSubmit') : t('consultationConfirmSubmit')}
      </Button>
    </form>
  )
}
