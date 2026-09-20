'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/form-controls'
import { NativeSelect } from '@/components/ui/native-select'
import {
  CONSULTATION_DURATION_MINUTES,
  MAX_LEAD_DAYS,
  MAX_WINDOW_MINUTES,
  MAX_WINDOWS,
  MIN_LEAD_HOURS,
  TIME_STEP_MINUTES,
} from '@/lib/consultation/config'
import { dateOptions, describeUtcRange, timeOptions, zoneLabel } from '@/lib/consultation/time'
import { resolveWindows } from '@/lib/consultation/windows'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'
import type { WindowErrorCode, WindowInput } from '@/types/consultation'

/**
 * Phase 20 — the time-window picker shared by the request form and the
 * client's "ask for a different time" panel.
 *
 * The client describes availability the way a person does — a date, a start
 * and an end, in a time zone they can see and change — and the server converts
 * it (`lib/consultation/windows.ts`); this component only ever holds wall-clock
 * strings. The same `resolveWindows` runs here to preview and to explain, so
 * what the visitor is told and what the server accepts cannot disagree.
 *
 * Everything that depends on the visitor's own clock or zone (the detected
 * zone, "today", the offset labels) is set after mount, so the server-rendered
 * HTML and the first client render are identical and hydration cannot mismatch.
 */

export type WindowRow = { date: string; from: string; to: string }

export const emptyWindowRow = (): WindowRow => ({ date: '', from: '', to: '' })

const isComplete = (row: WindowRow) => Boolean(row.date && row.from && row.to)

/** Complete rows as the server expects them. */
export const rowsToInputs = (rows: WindowRow[]): WindowInput[] => rows.filter(isComplete)

export type WindowsCheck =
  | { ok: true }
  | { ok: false; code: WindowErrorCode | 'incomplete'; index?: number }

/** One verdict for the whole set: every row must be complete, and the set must pass the server's own rules. */
export function checkWindowRows(timezone: string, rows: WindowRow[], now: Date): WindowsCheck {
  const incomplete = rows.findIndex((row) => !isComplete(row))
  if (incomplete !== -1) return { ok: false, code: 'incomplete', index: incomplete }
  const result = resolveWindows(timezone, rows, now)
  return result.ok ? { ok: true } : { ok: false, code: result.code, index: result.index }
}

const TIMES = timeOptions(TIME_STEP_MINUTES)

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function allTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? (Intl.supportedValuesOf('timeZone') as string[]) : []
  return supported.includes('UTC') ? supported : ['UTC', ...supported]
}

export function useClientClock(): { now: Date | null; detectedZone: string | null } {
  const [state, setState] = useState<{ now: Date | null; detectedZone: string | null }>({ now: null, detectedZone: null })
  useEffect(() => {
    setState({ now: new Date(), detectedZone: detectTimeZone() })
  }, [])
  return state
}

export function WindowsEditor({
  idPrefix,
  locale,
  timezone,
  onTimezoneChange,
  rows,
  onChange,
  now,
  disabled,
  showErrors,
}: {
  idPrefix: string
  locale: Locale
  timezone: string
  onTimezoneChange: (timezone: string) => void
  rows: WindowRow[]
  onChange: (rows: WindowRow[]) => void
  /** `null` until the browser has mounted. */
  now: Date | null
  disabled?: boolean
  showErrors: boolean
}) {
  const t = useTranslations('ConsultationPage')
  const ready = now !== null && timezone !== ''

  const zones = useMemo(() => {
    const list = allTimeZones()
    return timezone && !list.includes(timezone) ? [timezone, ...list] : list
  }, [timezone])

  const dates = useMemo(
    () => (ready ? dateOptions(timezone, now, MAX_LEAD_DAYS + 1) : []),
    [ready, timezone, now],
  )

  function setRow(index: number, patch: Partial<WindowRow>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    // Keep the range coherent: moving "from" past "to" clears "to" rather than leaving an impossible pair.
    const row = next[index]
    if (row.from && row.to && row.to <= row.from) next[index] = { ...row, to: '' }
    onChange(next)
  }

  const errorText = (code: WindowErrorCode) =>
    t(`errorWindow_${code}` as 'errorWindow_window-order', {
      minutes: CONSULTATION_DURATION_MINUTES,
      hours: code === 'window-too-long' ? MAX_WINDOW_MINUTES / 60 : MIN_LEAD_HOURS,
      days: MAX_LEAD_DAYS,
    })

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-tz`}>{t('fieldTimezone')}</FieldLabel>
        <NativeSelect
          id={`${idPrefix}-tz`}
          dir="ltr"
          value={timezone}
          disabled={disabled || !ready}
          onChange={(event) => onTimezoneChange(event.target.value)}
        >
          {!ready ? <option value="">…</option> : null}
          {ready
            ? zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zoneLabel(zone, now)}
                </option>
              ))
            : null}
        </NativeSelect>
      </Field>

      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const complete = isComplete(row)
          const verdict = ready && complete ? resolveWindows(timezone, [row], now) : null
          const preview = verdict?.ok ? describeUtcRange(verdict.windows[0]) : null
          const rowError =
            verdict && !verdict.ok
              ? errorText(verdict.code)
              : showErrors && !complete
                ? t('errorWindowIncomplete')
                : null
          const toOptions = TIMES.filter((time) => !row.from || time > row.from)

          return (
            <li key={index} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t('windowLabel', { n: index + 1 })}</span>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    aria-label={`${t('removeWindow')} (${t('windowLabel', { n: index + 1 })})`}
                  >
                    <X aria-hidden="true" className="size-4" />
                    <span className="sr-only sm:not-sr-only">{t('removeWindow')}</span>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}-date-${index}`}>{t('fieldDate')}</FieldLabel>
                  <NativeSelect
                    id={`${idPrefix}-date-${index}`}
                    value={row.date}
                    disabled={disabled || !ready}
                    aria-invalid={rowError ? true : undefined}
                    onChange={(event) => setRow(index, { date: event.target.value })}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {dates.map((date) => (
                      <option key={date} value={date}>
                        {formatDate(`${date}T12:00:00Z`, locale, {
                          timeZone: 'UTC',
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: undefined,
                        })}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}-from-${index}`}>{t('fieldFrom')}</FieldLabel>
                  <NativeSelect
                    id={`${idPrefix}-from-${index}`}
                    dir="ltr"
                    value={row.from}
                    disabled={disabled || !ready}
                    aria-invalid={rowError ? true : undefined}
                    onChange={(event) => setRow(index, { from: event.target.value })}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {TIMES.slice(0, -1).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}-to-${index}`}>{t('fieldTo')}</FieldLabel>
                  <NativeSelect
                    id={`${idPrefix}-to-${index}`}
                    dir="ltr"
                    value={row.to}
                    disabled={disabled || !ready}
                    aria-invalid={rowError ? true : undefined}
                    onChange={(event) => setRow(index, { to: event.target.value })}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {toOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                    {row.to === '' || toOptions.includes(row.to) ? null : <option value={row.to}>{row.to}</option>}
                  </NativeSelect>
                </Field>
              </div>

              {rowError ? (
                <p role="alert" className="text-xs text-destructive-text">
                  {rowError}
                </p>
              ) : preview ? (
                <p className="text-xs text-muted-foreground">
                  {/* U+2066 … U+2069: the English UTC line stays left-to-right inside a right-to-left sentence. */}
                  {t('previewUtc', { utc: `\u2066${preview}\u2069` })}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>

      {rows.length < MAX_WINDOWS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={disabled}
          onClick={() => onChange([...rows, emptyWindowRow()])}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('addWindow')}
        </Button>
      ) : null}
    </div>
  )
}
