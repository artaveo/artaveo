import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'

/**
 * Phase 20 — time-zone arithmetic for consultations, with no dependency.
 *
 * A client describes their availability the way a person does: "Thursday,
 * 2 to 4 pm, where I am". The server stores instants. Converting between the
 * two needs the IANA time-zone database, which `Intl` already ships; this file
 * is the thin, tested layer on top of it. Nothing here touches the network, the
 * clock (callers pass `now`) or the database.
 *
 * Edge cases the conversion handles on purpose:
 *  - a wall-clock time that does not exist (the hour skipped when clocks go
 *    forward) is rejected, never silently shifted;
 *  - a wall-clock time that happens twice (the hour repeated when clocks go
 *    back) resolves to the FIRST occurrence — deterministic, and harmless
 *    because every confirmation states the UTC time explicitly;
 *  - zones with half-hour or 45-minute offsets (Kabul, Kolkata, Kathmandu) and
 *    zones that have changed their rules (Tehran) come from the platform's
 *    database, not from a table kept here.
 */

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

/** `UTC`, or an IANA `Area/Location` name (up to three parts, e.g. `America/Argentina/Buenos_Aires`). */
const ZONE_NAME_PATTERN = /^(?:UTC|[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){1,2})$/

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatterCache.set(timeZone, formatter)
  }
  return formatter
}

/**
 * The canonical name of a valid IANA zone, or `null`. `Intl` accepts some things
 * that are not zone names (UTC offsets such as `+05:00`), so the shape is
 * checked first; it also accepts any letter case, so the platform's own
 * spelling is what gets stored.
 */
export function canonicalTimeZone(value: string): string | null {
  const candidate = value.trim()
  if (candidate.length === 0 || candidate.length > 64 || !ZONE_NAME_PATTERN.test(candidate)) return null
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

export function isValidTimeZone(value: string): boolean {
  return canonicalTimeZone(value) !== null
}

export type WallParts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

/** The wall-clock reading of an instant in a zone. */
export function wallParts(instantMs: number, timeZone: string): WallParts {
  const values: Record<string, number> = {}
  for (const part of partsFormatter(timeZone).formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    // Some engines render midnight as 24 under a 24-hour cycle.
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  }
}

/** How far ahead of UTC a zone's wall clock is at a given instant, in ms. */
function offsetMs(instantMs: number, timeZone: string): number {
  const p = wallParts(instantMs, timeZone)
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asIfUtc - Math.floor(instantMs / 1000) * 1000
}

/**
 * `2026-09-24` + `14:00` in `Asia/Kabul` → the instant it denotes. `null` for a
 * malformed value, an impossible date (31 February) or a wall-clock time that
 * does not exist in that zone.
 */
export function zonedWallTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(date)
  const timeMatch = TIME_PATTERN.exec(time)
  if (!dateMatch || !timeMatch) return null

  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])]
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])]
  if (hour > 23 || minute > 59) return null

  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute)
  const probe = new Date(asIfUtc)
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null

  // The zone's offset may differ across the day this falls in (a DST change),
  // so try every offset seen nearby and keep the candidates that really read
  // back as the requested wall-clock time.
  const offsets = new Set([
    offsetMs(asIfUtc - MS_PER_DAY, timeZone),
    offsetMs(asIfUtc, timeZone),
    offsetMs(asIfUtc + MS_PER_DAY, timeZone),
  ])

  const matches: number[] = []
  for (const offset of offsets) {
    const candidate = asIfUtc - offset
    const p = wallParts(candidate, timeZone)
    if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute) {
      matches.push(candidate)
    }
  }
  if (matches.length === 0) return null
  return new Date(Math.min(...matches))
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Today's date in a zone, as `YYYY-MM-DD`. */
export function todayInZone(timeZone: string, now: Date): string {
  const p = wallParts(now.getTime(), timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** `2026-09-30` + 1 → `2026-10-01`. Calendar arithmetic only — no zone involved. */
export function addDaysToDate(date: string, days: number): string {
  const match = DATE_PATTERN.exec(date)
  if (!match) throw new RangeError(`not a YYYY-MM-DD date: ${date}`)
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * MS_PER_DAY)
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

/** The next `count` calendar dates in a zone, starting today. */
export function dateOptions(timeZone: string, now: Date, count: number): string[] {
  const first = todayInZone(timeZone, now)
  return Array.from({ length: count }, (_, index) => addDaysToDate(first, index))
}

/** `00:00`, `00:30`, … `23:30` for a 30-minute step. */
export function timeOptions(stepMinutes: number): string[] {
  const options: string[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    options.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
  }
  return options
}

/** Minutes past midnight for an `HH:mm` string, or `NaN` when malformed. */
export function minutesOfDay(time: string): number {
  const match = TIME_PATTERN.exec(time)
  if (!match) return Number.NaN
  return Number(match[1]) * 60 + Number(match[2])
}

/** `HH:mm` of an instant in a zone — Latin digits always (a technical value, D-03). */
export function timeInZone(instant: Date | string, timeZone: string): string {
  const p = wallParts(new Date(instant).getTime(), timeZone)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** `YYYY-MM-DD` of an instant in a zone. */
export function dateInZone(instant: Date | string, timeZone: string): string {
  const p = wallParts(new Date(instant).getTime(), timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/**
 * The instants a call of `durationMinutes` could start at inside a window,
 * every `stepMinutes`, as ISO strings. A start is only offered if the whole
 * call still fits before the window closes.
 */
export function slotStarts(
  window: { start: string; end: string },
  durationMinutes: number,
  stepMinutes: number,
): string[] {
  const start = new Date(window.start).getTime()
  const end = new Date(window.end).getTime()
  const slots: string[] = []
  for (let t = start; t + durationMinutes * MS_PER_MINUTE <= end; t += stepMinutes * MS_PER_MINUTE) {
    slots.push(new Date(t).toISOString())
  }
  return slots
}

/**
 * How a time reads to a person, in the site's language. The date part follows
 * D-03 (Gregorian; Persian digits and month names on `fa`, via `formatDate`);
 * the clock part is `HH:mm` in Latin digits because it is a technical value
 * people compare against a calendar.
 */
export function describeInstant(instant: Date | string, timeZone: string, locale: Locale): { date: string; time: string } {
  return {
    date: formatDate(new Date(instant).toISOString(), locale, {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: timeInZone(instant, timeZone),
  }
}

/** `Thursday, September 24, 2026 · 14:00–16:00` style range, in a zone. */
export function describeRange(
  range: { start: string; end: string },
  timeZone: string,
  locale: Locale,
): { date: string; times: string } {
  const start = describeInstant(range.start, timeZone, locale)
  return { date: start.date, times: `${start.time}–${timeInZone(range.end, timeZone)}` }
}

/** The same range in UTC, always English and always Latin digits — the unambiguous line in every message. */
export function describeUtcRange(range: { start: string; end: string }): string {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(range.start))
  return `${day}, ${timeInZone(range.start, 'UTC')}–${timeInZone(range.end, 'UTC')} UTC`
}

/** A zone as it is written next to a time: `Asia/Kabul (UTC+4:30)`, or just `UTC` — never `UTC (UTC)`. */
export function zoneLabel(timeZone: string, at: Date): string {
  const offset = utcOffsetLabel(timeZone, at)
  return offset === timeZone ? timeZone : `${timeZone} (${offset})`
}

/** `Asia/Kabul` as people say it: the offset now, e.g. `UTC+4:30`. Used next to a zone name so it is checkable at a glance. */
export function utcOffsetLabel(timeZone: string, at: Date): string {
  const minutes = Math.round(offsetMs(at.getTime(), timeZone) / MS_PER_MINUTE)
  if (minutes === 0) return 'UTC'
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  return `UTC${sign}${hours}${rest ? `:${pad(rest)}` : ''}`
}
