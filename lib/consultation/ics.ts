import type { EmailAttachment } from '@/types/notifications'

/**
 * Phase 20 — the calendar invitation (RFC 5545 / iTIP, RFC 5546).
 *
 * Pure: everything the file says is passed in. Three methods are produced:
 *  - `REQUEST` — the invitation e-mailed with a confirmation. Sending the same
 *    UID again with a higher `SEQUENCE` moves the event (a reschedule).
 *  - `CANCEL` — same UID, higher `SEQUENCE`, `STATUS:CANCELLED`: mail clients
 *    remove the event from the client's calendar.
 *  - `PUBLISH` — the plain "add to calendar" download on the client's page and
 *    in the admin (no attendee, no response expected).
 *
 * Details that matter to a real calendar:
 *  - lines end in CRLF and are folded at 75 OCTETS (not characters — Persian
 *    text is two bytes per letter, and folding inside a multi-byte character
 *    corrupts it), continuation lines start with one space;
 *  - TEXT values escape backslash, semicolon, comma and newlines;
 *  - times are UTC (`…Z`), so the file needs no VTIMEZONE block and cannot
 *    disagree with itself about daylight saving;
 *  - a parameter value is quoted and stripped of characters that cannot appear
 *    in one, so a client's name can never inject a property line.
 */

export type IcsMethod = 'REQUEST' | 'CANCEL' | 'PUBLISH'

export type IcsInput = {
  method: IcsMethod
  /** Stable for the life of the consultation — never derived from the domain, which may change (D-01). */
  uid: string
  /** Must increase with every REQUEST/CANCEL for the same UID. */
  sequence: number
  start: Date
  end: Date
  summary: string
  description?: string
  /** Where or how the call happens, as the owner typed it. Omitted from LOCATION when it is not a single short line. */
  location?: string
  url?: string
  organizer: { email: string; name?: string }
  /** Required for REQUEST and CANCEL, ignored for PUBLISH. */
  attendee?: { email: string; name?: string }
  /** The moment the file was produced. */
  now: Date
}

const CRLF = '\r\n'
const MAX_OCTETS = 75

/** `20260924T093000Z` */
export function icsDateTime(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** RFC 5545 § 3.3.11 TEXT escaping. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** A parameter value: no quotes, no control characters; always quoted so `:;,` are safe. */
function paramValue(value: string): string {
  const cleaned = value.replace(/["\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return `"${cleaned}"`
}

/** An e-mail address inside `mailto:` — anything that could end the line or the value is dropped. */
function mailto(address: string): string {
  return `mailto:${address.replace(/[\s\u0000-\u001f\u007f<>"]/g, '')}`
}

const encoder = new TextEncoder()

/** Folds one content line at 75 octets without ever splitting a UTF-8 character. */
export function foldIcsLine(line: string): string {
  if (encoder.encode(line).length <= MAX_OCTETS) return line

  const pieces: string[] = []
  let current = ''
  let currentOctets = 0
  // The first line may use 75 octets; each continuation carries a leading
  // space that counts toward its own 75.
  let limit = MAX_OCTETS

  for (const char of line) {
    const octets = encoder.encode(char).length
    if (currentOctets + octets > limit) {
      pieces.push(current)
      current = char
      currentOctets = octets
      limit = MAX_OCTETS - 1
    } else {
      current += char
      currentOctets += octets
    }
  }
  pieces.push(current)
  return pieces.join(`${CRLF} `)
}

const isSingleShortLine = (value: string) => value.length > 0 && value.length <= 200 && !/[\r\n]/.test(value)

export function buildConsultationIcs(input: IcsInput): string {
  if (input.end.getTime() <= input.start.getTime()) {
    throw new RangeError('calendar event must end after it starts')
  }
  if (input.method !== 'PUBLISH' && !input.attendee) {
    throw new TypeError(`an ${input.method} needs an attendee`)
  }

  const cancelled = input.method === 'CANCEL'
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Artaveo//Consultations//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${input.method}`,
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${icsDateTime(input.now)}`,
    `DTSTART:${icsDateTime(input.start)}`,
    `DTEND:${icsDateTime(input.end)}`,
    `SEQUENCE:${Math.max(0, Math.trunc(input.sequence))}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
  ]

  if (input.description) lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`)
  if (input.location && isSingleShortLine(input.location) && !cancelled) {
    lines.push(`LOCATION:${escapeIcsText(input.location)}`)
  }
  if (input.url && !cancelled) lines.push(`URL:${input.url.replace(/[\s\u0000-\u001f\u007f]/g, '')}`)

  const organizerName = input.organizer.name ? `;CN=${paramValue(input.organizer.name)}` : ''
  lines.push(`ORGANIZER${organizerName}:${mailto(input.organizer.email)}`)

  if (input.method !== 'PUBLISH' && input.attendee) {
    const attendeeName = input.attendee.name ? `;CN=${paramValue(input.attendee.name)}` : ''
    lines.push(
      `ATTENDEE${attendeeName};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=${cancelled ? 'FALSE' : 'TRUE'}:${mailto(input.attendee.email)}`,
    )
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(foldIcsLine).join(CRLF) + CRLF
}

/** The `uid` for a consultation. Derived only from the row's id, so it survives a change of domain. */
export function consultationUid(consultationId: string): string {
  return `${consultationId}@consultations.artaveo`
}

export function icsAttachment(method: IcsMethod, content: string, filename = 'artaveo-intro-call.ics'): EmailAttachment {
  return { filename, contentType: `text/calendar; charset=utf-8; method=${method}`, content }
}
