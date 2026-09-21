#!/usr/bin/env node
/**
 * Phase 20 — tests for the consultation flow. Zero dependencies:
 *
 *   npm run test:consultations
 *
 * Covered: time-zone conversion (including DST gaps/overlaps and half-hour
 * zones), window validation, the state rules, the calendar file, every
 * consultation e-mail template, the enqueue functions and the provider's
 * attachment encoding. The database side (constraints, trigger, unique index)
 * and the application's PostgREST queries were exercised against a real
 * PostgreSQL 16 + PostgREST — see docs/phases/PHASE-20-README.md.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addDaysToDate,
  canonicalTimeZone,
  dateOptions,
  describeInstant,
  describeRange,
  describeUtcRange,
  isValidTimeZone,
  slotStarts,
  timeInZone,
  timeOptions,
  todayInZone,
  utcOffsetLabel,
  zoneLabel,
  zonedWallTimeToUtc,
} from '../lib/consultation/time.ts'
import {
  allWindowsPassed,
  canMarkCompleted,
  canOwnerConfirm,
  canTransition,
  isActive,
  isTerminal,
  linkExpired,
  looksLikeToken,
  resolveWindows,
} from '../lib/consultation/windows.ts'
import {
  buildConsultationIcs,
  consultationUid,
  escapeIcsText,
  foldIcsLine,
  icsAttachment,
  icsDateTime,
} from '../lib/consultation/ics.ts'
import { ALLOWED_CONSULTATION_TRANSITIONS, CONSULTATION_STATUSES } from '../types/consultation.ts'

// ── time ────────────────────────────────────────────────────────────────

test('zonedWallTimeToUtc: whole-hour, half-hour and 45-minute zones', () => {
  assert.equal(zonedWallTimeToUtc('2026-09-24', '14:00', 'UTC').toISOString(), '2026-09-24T14:00:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-09-24', '14:00', 'Asia/Kabul').toISOString(), '2026-09-24T09:30:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-09-24', '14:00', 'Asia/Kolkata').toISOString(), '2026-09-24T08:30:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-09-24', '14:00', 'Asia/Kathmandu').toISOString(), '2026-09-24T08:15:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-09-24', '02:00', 'Pacific/Auckland').toISOString(), '2026-09-23T14:00:00.000Z')
})

test('zonedWallTimeToUtc: daylight saving — summer, winter, and either side of a change', () => {
  assert.equal(zonedWallTimeToUtc('2026-07-01', '12:00', 'America/New_York').toISOString(), '2026-07-01T16:00:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-12-01', '12:00', 'America/New_York').toISOString(), '2026-12-01T17:00:00.000Z')
  // US clocks went forward on 8 March 2026 at 02:00.
  assert.equal(zonedWallTimeToUtc('2026-03-08', '01:30', 'America/New_York').toISOString(), '2026-03-08T06:30:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-03-08', '03:30', 'America/New_York').toISOString(), '2026-03-08T07:30:00.000Z')
  // Southern hemisphere, and Lord Howe's 30-minute shift.
  assert.equal(zonedWallTimeToUtc('2026-01-15', '10:00', 'Australia/Sydney').toISOString(), '2026-01-14T23:00:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-01-15', '10:00', 'Australia/Lord_Howe').toISOString(), '2026-01-14T23:00:00.000Z')
  assert.equal(zonedWallTimeToUtc('2026-07-15', '10:00', 'Australia/Lord_Howe').toISOString(), '2026-07-14T23:30:00.000Z')
})

test('zonedWallTimeToUtc: a time that does not exist is refused, a repeated one takes the first occurrence', () => {
  assert.equal(zonedWallTimeToUtc('2026-03-08', '02:30', 'America/New_York'), null)
  // US clocks go back on 1 November 2026 at 02:00 — 01:30 happens twice; the first is EDT (UTC-4).
  assert.equal(zonedWallTimeToUtc('2026-11-01', '01:30', 'America/New_York').toISOString(), '2026-11-01T05:30:00.000Z')
})

test('zonedWallTimeToUtc: malformed and impossible input', () => {
  assert.equal(zonedWallTimeToUtc('2026-02-31', '10:00', 'UTC'), null)
  assert.equal(zonedWallTimeToUtc('2026-9-24', '10:00', 'UTC'), null)
  assert.equal(zonedWallTimeToUtc('2026-09-24', '24:00', 'UTC'), null)
  assert.equal(zonedWallTimeToUtc('2026-09-24', '10:60', 'UTC'), null)
  assert.equal(zonedWallTimeToUtc('2026-09-24', '1000', 'UTC'), null)
})

test('canonicalTimeZone accepts zone names only', () => {
  assert.equal(canonicalTimeZone('Asia/Kabul'), 'Asia/Kabul')
  assert.equal(canonicalTimeZone('asia/kabul'), 'Asia/Kabul')
  assert.equal(canonicalTimeZone('UTC'), 'UTC')
  // ICU may report a deprecated alias under its preferred name — what matters is that the stored name is valid.
  assert.equal(isValidTimeZone(canonicalTimeZone('America/Argentina/Buenos_Aires')), true)
  for (const bad of ['', '+05:00', 'Mars/Olympus', 'Asia/Kabul; drop table', 'x'.repeat(80), ' ', '../etc/passwd']) {
    assert.equal(isValidTimeZone(bad), false, bad)
  }
})

test('date and time option lists', () => {
  const now = new Date('2026-09-24T22:30:00Z')
  assert.equal(todayInZone('UTC', now), '2026-09-24')
  assert.equal(todayInZone('Asia/Kabul', now), '2026-09-25') // 03:00 next day
  assert.equal(todayInZone('America/Los_Angeles', now), '2026-09-24')
  assert.equal(addDaysToDate('2026-09-30', 1), '2026-10-01')
  assert.equal(addDaysToDate('2026-12-31', 1), '2027-01-01')
  assert.equal(addDaysToDate('2028-02-28', 1), '2028-02-29')
  const days = dateOptions('UTC', now, 3)
  assert.deepEqual(days, ['2026-09-24', '2026-09-25', '2026-09-26'])
  const times = timeOptions(30)
  assert.equal(times.length, 48)
  assert.equal(times[0], '00:00')
  assert.equal(times[47], '23:30')
})

test('slotStarts only offers starts where the whole call fits', () => {
  const slots = slotStarts({ start: '2026-09-24T09:00:00.000Z', end: '2026-09-24T10:30:00.000Z' }, 30, 30)
  assert.deepEqual(slots, ['2026-09-24T09:00:00.000Z', '2026-09-24T09:30:00.000Z', '2026-09-24T10:00:00.000Z'])
  assert.deepEqual(slotStarts({ start: '2026-09-24T09:00:00.000Z', end: '2026-09-24T09:20:00.000Z' }, 30, 30), [])
})

test('describing instants: zone, digits, UTC line, offset label', () => {
  const start = '2026-09-24T09:30:00.000Z'
  assert.equal(timeInZone(start, 'Asia/Kabul'), '14:00')
  assert.equal(timeInZone('2026-09-24T00:00:00.000Z', 'UTC'), '00:00')
  const en = describeInstant(start, 'Asia/Kabul', 'en')
  assert.match(en.date, /Thursday/)
  assert.match(en.date, /September 24, 2026/)
  assert.equal(en.time, '14:00')
  const fa = describeInstant(start, 'Asia/Kabul', 'fa')
  assert.match(fa.date, /۲۴/) // Persian digits in the date…
  assert.match(fa.date, /۲۰۲۶/) // …Gregorian year (D-03)
  assert.equal(fa.time, '14:00') // …Latin digits in the clock time
  assert.deepEqual(describeRange({ start, end: '2026-09-24T11:30:00.000Z' }, 'Asia/Kabul', 'en').times, '14:00–16:00')
  assert.equal(describeUtcRange({ start, end: '2026-09-24T10:00:00.000Z' }), 'Thu, Sep 24, 2026, 09:30–10:00 UTC')
  assert.equal(utcOffsetLabel('Asia/Kabul', new Date(start)), 'UTC+4:30')
  assert.equal(utcOffsetLabel('UTC', new Date(start)), 'UTC')
  assert.equal(utcOffsetLabel('America/New_York', new Date('2026-07-01T00:00:00Z')), 'UTC-4')
  // A zone next to a time: named with its offset, and never "UTC (UTC)".
  assert.equal(zoneLabel('Asia/Kabul', new Date(start)), 'Asia/Kabul (UTC+4:30)')
  assert.equal(zoneLabel('UTC', new Date(start)), 'UTC')
})

// ── windows ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-09-20T10:00:00Z')

test('resolveWindows: a good request comes back as sorted UTC instants', () => {
  const result = resolveWindows('Asia/Kabul', [
    { date: '2026-09-25', from: '16:00', to: '18:00' },
    { date: '2026-09-24', from: '14:00', to: '16:00' },
  ], NOW)
  assert.equal(result.ok, true)
  assert.equal(result.timezone, 'Asia/Kabul')
  assert.deepEqual(result.windows, [
    { start: '2026-09-24T09:30:00.000Z', end: '2026-09-24T11:30:00.000Z' },
    { start: '2026-09-25T11:30:00.000Z', end: '2026-09-25T13:30:00.000Z' },
  ])
})

test('resolveWindows: every rule has its own code', () => {
  const ok = { date: '2026-09-24', from: '14:00', to: '16:00' }
  const code = (tz, windows, now = NOW) => resolveWindows(tz, windows, now).code
  assert.equal(code('Nowhere/Land', [ok]), 'invalid-timezone')
  assert.equal(code('UTC', []), 'window-count')
  assert.equal(code('UTC', [ok, ok, ok, ok]), 'window-count')
  assert.equal(code('UTC', [{ ...ok, date: 'tomorrow' }]), 'window-invalid')
  assert.equal(code('UTC', [{ ...ok, from: '14:10' }]), 'window-invalid') // not on the 30-minute step
  assert.equal(code('UTC', [{ ...ok, to: '25:00' }]), 'window-invalid')
  assert.equal(code('UTC', [null]), 'window-invalid')
  assert.equal(code('UTC', [{ ...ok, from: '16:00', to: '14:00' }]), 'window-order')
  assert.equal(code('UTC', [{ ...ok, from: '14:00', to: '14:00' }]), 'window-order')
  assert.equal(code('America/New_York', [{ date: '2026-03-08', from: '02:00', to: '03:00' }], new Date('2026-02-01T00:00:00Z')), 'window-nonexistent')
  assert.equal(code('UTC', [{ ...ok, to: '14:00', from: '14:00' }]), 'window-order')
  assert.equal(code('UTC', [{ date: '2026-09-24', from: '14:00', to: '14:30' }]), undefined) // exactly the call length is allowed
  assert.equal(code('UTC', [{ date: '2026-09-24', from: '00:00', to: '09:00' }]), 'window-too-long')
  assert.equal(code('UTC', [{ date: '2026-09-20', from: '14:00', to: '16:00' }]), 'window-too-soon') // 4 h away
  assert.equal(code('UTC', [{ date: '2026-09-20', from: '21:30', to: '23:00' }]), 'window-too-soon') // 11.5 h away
  assert.equal(code('UTC', [{ date: '2026-09-20', from: '22:00', to: '23:00' }]), undefined) // exactly 12 h is allowed
})

test('resolveWindows: too far, overlapping, and windows that touch', () => {
  assert.equal(resolveWindows('UTC', [{ date: '2026-11-15', from: '10:00', to: '11:00' }], NOW).code, 'window-too-far')
  assert.equal(resolveWindows('UTC', [{ date: '2026-11-03', from: '10:00', to: '11:00' }], NOW).ok, true) // 44 days
  const overlap = resolveWindows('UTC', [
    { date: '2026-09-24', from: '10:00', to: '12:00' },
    { date: '2026-09-24', from: '11:30', to: '13:00' },
  ], NOW)
  assert.equal(overlap.code, 'window-overlap')
  const touching = resolveWindows('UTC', [
    { date: '2026-09-24', from: '10:00', to: '12:00' },
    { date: '2026-09-24', from: '12:00', to: '13:00' },
  ], NOW)
  assert.equal(touching.ok, true)
})

test('resolveWindows: the zone decides the instant, not the browser', () => {
  const a = resolveWindows('Asia/Kabul', [{ date: '2026-09-24', from: '14:00', to: '15:00' }], NOW)
  const b = resolveWindows('America/Los_Angeles', [{ date: '2026-09-24', from: '14:00', to: '15:00' }], NOW)
  assert.notEqual(a.windows[0].start, b.windows[0].start)
  assert.equal(b.windows[0].start, '2026-09-24T21:00:00.000Z')
})

// ── state rules ─────────────────────────────────────────────────────────

test('status graph: matches the database trigger', () => {
  assert.deepEqual(ALLOWED_CONSULTATION_TRANSITIONS.requested, ['confirmed', 'cancelled'])
  assert.deepEqual(ALLOWED_CONSULTATION_TRANSITIONS.confirmed, ['rescheduled', 'cancelled', 'completed'])
  assert.deepEqual(ALLOWED_CONSULTATION_TRANSITIONS.rescheduled, ['confirmed', 'cancelled'])
  assert.deepEqual(ALLOWED_CONSULTATION_TRANSITIONS.cancelled, [])
  assert.deepEqual(ALLOWED_CONSULTATION_TRANSITIONS.completed, [])
  assert.equal(CONSULTATION_STATUSES.length, 5)
  assert.equal(canTransition('requested', 'completed'), false)
  assert.equal(canTransition('confirmed', 'completed'), true)
  for (const status of CONSULTATION_STATUSES) {
    assert.equal(isTerminal(status), status === 'cancelled' || status === 'completed')
    assert.equal(isActive(status), !isTerminal(status))
  }
})

test('owner and client rules', () => {
  assert.equal(canOwnerConfirm('requested'), true)
  assert.equal(canOwnerConfirm('rescheduled'), true)
  assert.equal(canOwnerConfirm('confirmed'), true)
  assert.equal(canOwnerConfirm('cancelled'), false)
  assert.equal(canOwnerConfirm('completed'), false)

  const past = { status: 'confirmed', confirmedStart: '2026-09-20T09:00:00.000Z' }
  const future = { status: 'confirmed', confirmedStart: '2026-09-24T09:00:00.000Z' }
  assert.equal(canMarkCompleted(past, NOW), true)
  assert.equal(canMarkCompleted(future, NOW), false)
  assert.equal(canMarkCompleted({ status: 'requested', confirmedStart: null }, NOW), false)
  assert.equal(canMarkCompleted({ status: 'rescheduled', confirmedStart: past.confirmedStart }, NOW), false)

  assert.equal(allWindowsPassed([{ start: '2026-09-19T09:00:00.000Z', end: '2026-09-19T10:00:00.000Z' }], NOW), true)
  assert.equal(allWindowsPassed([{ start: '2026-09-19T09:00:00.000Z', end: '2026-09-21T10:00:00.000Z' }], NOW), false)
  assert.equal(allWindowsPassed([], NOW), false)
})

test('a finished consultation\'s link lingers, then expires; a live one never does', () => {
  assert.equal(linkExpired({ closedAt: null }, NOW), false)
  assert.equal(linkExpired({ closedAt: '2026-09-10T10:00:00.000Z' }, NOW), false) // 10 days
  assert.equal(linkExpired({ closedAt: '2026-09-05T10:00:00.000Z' }, NOW), true) // 15 days
})

test('tokens: shape check', () => {
  assert.equal(looksLikeToken('A'.repeat(32)), true)
  assert.equal(looksLikeToken('abc-_DEF1234567890abcdefghijklmn'), true)
  assert.equal(looksLikeToken('short'), false)
  assert.equal(looksLikeToken('has space in it aaaaaaaaaaaaaaaaaa'), false)
  assert.equal(looksLikeToken('../../etc/passwd/aaaaaaaaaaaaaaaaaaaa'), false)
})

// ── calendar file ───────────────────────────────────────────────────────

const ICS_BASE = {
  method: 'REQUEST',
  uid: consultationUid('7c9e6679-7425-40de-944b-e07fc1f90ae7'),
  sequence: 0,
  start: new Date('2026-09-24T09:30:00Z'),
  end: new Date('2026-09-24T10:00:00Z'),
  summary: 'Artaveo — intro call',
  description: 'Manage it: https://example.test/en/consultation/abc',
  location: 'https://meet.example.test/xyz',
  organizer: { email: 'artaveo.dev@gmail.com', name: 'Zakir Naseri' },
  attendee: { email: 'client@example.com', name: 'A Client' },
  now: new Date('2026-09-20T10:00:00Z'),
}

test('ics: a REQUEST is a well-formed invitation', () => {
  const ics = buildConsultationIcs(ICS_BASE)
  assert.ok(ics.endsWith('\r\n'))
  assert.ok(!/[^\r]\n/.test(ics), 'every line break is CRLF')
  const lines = ics.replace(/\r\n /g, '').split('\r\n') // unfolded
  assert.equal(lines[0], 'BEGIN:VCALENDAR')
  assert.equal(lines[lines.length - 2], 'END:VCALENDAR')
  for (const expected of [
    'VERSION:2.0',
    'METHOD:REQUEST',
    'UID:7c9e6679-7425-40de-944b-e07fc1f90ae7@consultations.artaveo',
    'DTSTAMP:20260920T100000Z',
    'DTSTART:20260924T093000Z',
    'DTEND:20260924T100000Z',
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'LOCATION:https://meet.example.test/xyz',
    'ORGANIZER;CN="Zakir Naseri":mailto:artaveo.dev@gmail.com',
    'ATTENDEE;CN="A Client";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:client@example.com',
  ]) {
    assert.ok(lines.includes(expected), `missing: ${expected}`)
  }
  assert.ok(lines.some((line) => line.startsWith('SUMMARY:Artaveo')))
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 1)
})

test('ics: an update keeps the UID and raises SEQUENCE; a cancellation says so', () => {
  const update = buildConsultationIcs({ ...ICS_BASE, sequence: 1, start: new Date('2026-09-25T09:30:00Z'), end: new Date('2026-09-25T10:00:00Z') })
  assert.ok(update.includes('UID:7c9e6679-7425-40de-944b-e07fc1f90ae7@consultations.artaveo'))
  assert.ok(update.includes('SEQUENCE:1'))
  const cancel = buildConsultationIcs({ ...ICS_BASE, method: 'CANCEL', sequence: 2 })
  assert.ok(cancel.includes('METHOD:CANCEL'))
  assert.ok(cancel.includes('STATUS:CANCELLED'))
  assert.ok(cancel.includes('SEQUENCE:2'))
  assert.ok(!cancel.includes('LOCATION:'), 'a cancelled event does not advertise where it was')
  assert.ok(cancel.replace(/\r\n /g, '').includes('RSVP=FALSE'))
})

test('ics: PUBLISH (the download) has no attendee; REQUEST and CANCEL require one', () => {
  const publish = buildConsultationIcs({ ...ICS_BASE, method: 'PUBLISH', attendee: undefined })
  assert.ok(publish.includes('METHOD:PUBLISH'))
  assert.ok(!publish.includes('ATTENDEE'))
  assert.throws(() => buildConsultationIcs({ ...ICS_BASE, attendee: undefined }), TypeError)
  assert.throws(() => buildConsultationIcs({ ...ICS_BASE, end: ICS_BASE.start }), RangeError)
})

test('ics: text escaping and injection resistance', () => {
  assert.equal(escapeIcsText('a, b; c\\d\nline2'), 'a\\, b\\; c\\\\d\\nline2')
  const hostile = buildConsultationIcs({
    ...ICS_BASE,
    summary: 'x\r\nATTENDEE:mailto:evil@example.com',
    attendee: { email: 'client@example.com', name: 'Eve"\r\nORGANIZER:mailto:evil@example.com' },
    location: 'line one\nline two',
  })
  const lines = hostile.split('\r\n')
  assert.equal(lines.filter((l) => l.startsWith('ORGANIZER')).length, 1)
  assert.equal(lines.filter((l) => l.startsWith('ATTENDEE')).length, 1)
  assert.ok(!lines.some((l) => l.includes('evil@example.com') && l.startsWith('ATTENDEE:')))
  assert.ok(!lines.some((l) => l.startsWith('LOCATION:')), 'a multi-line location is not put in LOCATION')
  const bad = buildConsultationIcs({ ...ICS_BASE, attendee: { email: 'a@b.co\r\nX-EVIL:1>', name: 'n' } })
  assert.ok(!bad.split('\r\n').some((l) => l.startsWith('X-EVIL')))
})

test('ics: folding at 75 octets never splits a Persian letter', () => {
  const persian = 'گفتگوی آشنایی با آرتاویو — ' + 'تست '.repeat(60)
  const ics = buildConsultationIcs({ ...ICS_BASE, summary: persian })
  const encoder = new TextEncoder()
  const raw = ics.split('\r\n')
  for (const line of raw) assert.ok(encoder.encode(line).length <= 75, `too long: ${line.length}`)
  // Unfolding gives the original text back, character for character.
  const unfolded = ics.replace(/\r\n /g, '')
  const summary = unfolded.split('\r\n').find((l) => l.startsWith('SUMMARY:'))
  assert.equal(summary, 'SUMMARY:' + escapeIcsText(persian))
  assert.equal(foldIcsLine('short'), 'short')
})

test('ics: date format and the stored attachment shape', () => {
  assert.equal(icsDateTime(new Date('2026-01-05T03:04:05Z')), '20260105T030405Z')
  const attachment = icsAttachment('REQUEST', 'BEGIN:VCALENDAR')
  assert.deepEqual(attachment, {
    filename: 'artaveo-intro-call.ics',
    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
    content: 'BEGIN:VCALENDAR',
  })
})

// ── e-mail templates, events, provider ─────────────────────────────────

import {
  buildConsultationCancelledEmail,
  buildConsultationClientUpdateEmail,
  buildConsultationConfirmedEmail,
  buildConsultationReceivedEmail,
  buildConsultationRequestedEmail,
  windowLines,
} from '../lib/notifications/consultation-templates.ts'
import {
  enqueueConsultationCancelled,
  enqueueConsultationClientUpdate,
  enqueueConsultationConfirmed,
  enqueueConsultationRequested,
} from '../lib/notifications/events.ts'
import { encodeResendAttachments, ResendEmailProvider, ConsoleEmailProvider } from '../lib/notifications/provider.ts'
import { setLogSink } from '../lib/observability/logger.ts'
import { KIND_LABEL_FOR_TESTS } from './helpers-consultations.mjs'
import { NOTIFICATION_AUDIENCE, NOTIFICATION_KINDS } from '../types/notifications.ts'

const W1 = { start: '2026-09-24T09:30:00.000Z', end: '2026-09-24T11:30:00.000Z' }
const W2 = { start: '2026-09-25T11:30:00.000Z', end: '2026-09-25T13:30:00.000Z' }
const SLOT = { start: '2026-09-24T09:30:00.000Z', end: '2026-09-24T10:00:00.000Z' }
const PERSIAN = /[\u0600-\u06FF]/

test('windowLines: the client\'s own zone, in both languages', () => {
  const en = windowLines([W1, W2], 'Asia/Kabul', 'en')
  assert.equal(en.length, 2)
  assert.match(en[0], /Thursday, September 24, 2026 — 14:00–16:00/)
  assert.match(en[1], /Friday, September 25, 2026 — 16:00–18:00/)
  const fa = windowLines([W1], 'Asia/Kabul', 'fa')
  assert.match(fa[0], /۲۴/)
  assert.match(fa[0], /14:00 تا 16:00/)
})

test('received: nothing is booked yet, the link and the D-08 commitment are there, both languages', () => {
  const en = buildConsultationReceivedEmail({ locale: 'en', windows: [W1], timezone: 'Asia/Kabul', manageUrl: 'https://x.test/en/consultation/T' })
  assert.match(en.text, /Nothing is booked until I confirm/)
  assert.match(en.text, /a reply within a few hours, same day/)
  assert.match(en.text, /Asia\/Kabul \(UTC\+4:30\)/)
  assert.ok(en.text.includes('https://x.test/en/consultation/T'))
  const fa = buildConsultationReceivedEmail({ locale: 'fa', windows: [W1], timezone: 'Asia/Kabul', manageUrl: 'https://x.test/fa/consultation/T' })
  assert.match(fa.subject, PERSIAN)
  assert.match(fa.text, /چیزی رزرو نشده است/)
  assert.match(fa.text, /پاسخ‌گویی در همان روز، طی چند ساعت/)
  assert.ok(fa.text.includes('https://x.test/fa/consultation/T'))
})

test('confirmed: date, time, zone and UTC on their own lines; moved calls name the old time', () => {
  const base = { locale: 'en', timezone: 'Asia/Kabul', range: SLOT, meetingDetails: 'Google Meet: https://meet.example.test/abc', manageUrl: 'https://x.test/m', calendarUrl: 'https://x.test/c' }
  const first = buildConsultationConfirmedEmail(base)
  assert.match(first.subject, /confirmed/)
  const lines = first.text.split('\n')
  assert.ok(lines.includes('Date: Thursday, September 24, 2026'))
  assert.ok(lines.includes('Time: 14:00–14:30'))
  assert.ok(lines.includes('Time zone: Asia/Kabul (UTC+4:30)'))
  assert.ok(lines.includes('In UTC: Thu, Sep 24, 2026, 09:30–10:00 UTC'))
  assert.ok(lines.includes('How: Google Meet: https://meet.example.test/abc'))
  assert.ok(first.text.includes('https://x.test/c') && first.text.includes('https://x.test/m'))
  assert.ok(!first.text.includes('previous time'))
  const moved = buildConsultationConfirmedEmail({ ...base, previous: { start: '2026-09-23T09:30:00.000Z', end: '2026-09-23T10:00:00.000Z' } })
  assert.match(moved.subject, /moved/)
  assert.match(moved.text, /previous time \(cancelled\)/)
  const fa = buildConsultationConfirmedEmail({ ...base, locale: 'fa' })
  assert.match(fa.text, /تماس آشنایی‌مان تأیید شد/)
  assert.ok(fa.text.split('\n').includes('ساعت: 14:00 تا 14:30'))
  assert.ok(fa.text.split('\n').includes('روش تماس: Google Meet: https://meet.example.test/abc'))
})

test('cancelled: who cancelled decides the words; the reason is only shown when the owner cancels', () => {
  const owner = buildConsultationCancelledEmail({ locale: 'en', timezone: 'UTC', by: 'owner', range: SLOT, reason: 'Sick day', newRequestUrl: 'https://x.test/en/consultation' })
  assert.match(owner.text, /I've cancelled our intro call/)
  assert.match(owner.text, /Sick day/)
  assert.match(owner.text, /removes it from your calendar/)
  const client = buildConsultationCancelledEmail({ locale: 'en', timezone: 'UTC', by: 'client', range: SLOT, reason: 'private note', newRequestUrl: 'u' })
  assert.match(client.text, /as you asked/)
  assert.ok(!client.text.includes('private note'))
  const neverConfirmed = buildConsultationCancelledEmail({ locale: 'fa', timezone: 'UTC', by: 'owner', range: null, reason: null, newRequestUrl: 'u' })
  assert.ok(!neverConfirmed.text.includes('تقویم'))
})

test('owner messages: the alert carries goal, both zones, and a link; updates say what changed', () => {
  const alert = buildConsultationRequestedEmail({ name: 'A\nClient', email: 'a@b.co', phone: '+93700', goal: 'Rebuild our booking site', locale: 'fa', timezone: 'Asia/Kabul', windows: [W1], adminUrl: 'https://x.test/admin' })
  assert.equal(alert.subject, 'Call requested — A Client') // a stray newline can never reach a subject
  assert.match(alert.text, /Language: Persian/)
  assert.match(alert.text, /Rebuild our booking site/)
  assert.match(alert.text, /Thu, Sep 24, 2026, 09:30–11:30 UTC/)
  assert.match(alert.text, /WhatsApp \/ phone: \+93700/)
  const cancelled = buildConsultationClientUpdateEmail({ change: 'cancelled', name: 'A', reason: 'Plans changed', confirmedRange: SLOT, timezone: 'UTC', adminUrl: 'u' })
  assert.match(cancelled.subject, /cancelled by the client/)
  assert.match(cancelled.text, /Plans changed/)
  assert.match(cancelled.text, /calendar cancellation/)
  const moved = buildConsultationClientUpdateEmail({ change: 'rescheduled', name: 'A', windows: [W2], confirmedRange: SLOT, timezone: 'Asia/Kabul', adminUrl: 'u' })
  assert.match(moved.text, /still stands, and stays in their calendar/)
})

test('every consultation kind has an audience and matches the migration', () => {
  const kinds = NOTIFICATION_KINDS.filter((kind) => kind.startsWith('consultation-'))
  assert.deepEqual(kinds, ['consultation-requested', 'consultation-received', 'consultation-confirmed', 'consultation-cancelled', 'consultation-client-update'])
  assert.equal(NOTIFICATION_AUDIENCE['consultation-requested'], 'owner')
  assert.equal(NOTIFICATION_AUDIENCE['consultation-client-update'], 'owner')
  assert.equal(NOTIFICATION_AUDIENCE['consultation-confirmed'], 'client')
  assert.ok(KIND_LABEL_FOR_TESTS.migrationKinds.every((kind) => NOTIFICATION_KINDS.includes(kind)))
  assert.deepEqual([...KIND_LABEL_FOR_TESTS.migrationKinds].sort(), [...NOTIFICATION_KINDS].sort())
})

function fakeSupabase() {
  const upserts = []
  return {
    upserts,
    from(table) {
      assert.equal(table, 'notification_outbox')
      return {
        upsert(rows, options) {
          upserts.push({ rows, options })
          return { select: async () => ({ data: rows.map((row, i) => ({ id: `id-${upserts.length}-${i}`, kind: row.kind })), error: null }) }
        },
      }
    },
  }
}

const CTX = {
  consultationId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  inquiryId: '11111111-1111-4111-8111-111111111111',
  token: 'T'.repeat(32),
  locale: 'fa',
  timezone: 'Asia/Kabul',
  clientName: 'A Client',
  clientEmail: ' Client@Example.com ',
}

test('enqueue: request → owner alert (reply-to the client) + client acknowledgement, deduped per consultation', async () => {
  const db = fakeSupabase()
  const rows = await enqueueConsultationRequested(db, { ...CTX, phone: '', goal: 'Talk about a project', windows: [W1] })
  assert.equal(rows.length, 2)
  const [owner, client] = db.upserts[0].rows
  assert.equal(owner.kind, 'consultation-requested')
  assert.equal(owner.reply_to, 'client@example.com')
  assert.equal(owner.locale, 'en')
  assert.equal(owner.dedupe_key, `consultation:${CTX.consultationId}:requested`)
  assert.equal(client.kind, 'consultation-received')
  assert.equal(client.recipient_email, 'client@example.com')
  assert.equal(client.locale, 'fa')
  assert.equal(client.reply_to, 'artaveo.dev@gmail.com')
  assert.equal(client.dedupe_key, `consultation:${CTX.consultationId}:received`)
  assert.ok(client.body_text.includes(`/fa/consultation/${CTX.token}`))
  assert.ok(owner.body_text.includes(`/en/admin/consultations/${CTX.consultationId}`))
  assert.equal(client.inquiry_id, CTX.inquiryId)
  assert.equal(client.entity_type, 'consultation')
  assert.equal('attachments' in client, false, 'a message without a file keeps its stored shape')
  assert.deepEqual(db.upserts[0].options, { onConflict: 'dedupe_key', ignoreDuplicates: true })
})

test('enqueue: a confirmation carries a REQUEST invitation whose SEQUENCE is in the dedupe key', async () => {
  const db = fakeSupabase()
  await enqueueConsultationConfirmed(db, CTX, { range: SLOT, meetingDetails: 'WhatsApp voice call', sequence: 0, previous: null, now: new Date('2026-09-20T10:00:00Z') })
  await enqueueConsultationConfirmed(db, CTX, { range: { start: '2026-09-26T09:30:00.000Z', end: '2026-09-26T10:00:00.000Z' }, meetingDetails: 'WhatsApp voice call', sequence: 1, previous: SLOT, now: new Date('2026-09-21T10:00:00Z') })
  const [first, second] = db.upserts.map((u) => u.rows[0])
  assert.equal(first.kind, 'consultation-confirmed')
  assert.equal(first.dedupe_key, `consultation:${CTX.consultationId}:confirmed:0`)
  assert.equal(second.dedupe_key, `consultation:${CTX.consultationId}:confirmed:1`)
  assert.equal(first.attachments.length, 1)
  assert.equal(first.attachments[0].filename, 'artaveo-intro-call.ics')
  assert.match(first.attachments[0].contentType, /method=REQUEST/)
  const unfold = (text) => text.replace(/\r\n /g, '')
  const ics1 = unfold(first.attachments[0].content)
  const ics2 = unfold(second.attachments[0].content)
  assert.ok(ics1.includes('SEQUENCE:0') && ics2.includes('SEQUENCE:1'))
  const uid = `UID:${CTX.consultationId}@consultations.artaveo`
  assert.ok(ics1.includes(uid) && ics2.includes(uid), 'the same UID, so the second updates the first')
  assert.ok(ics1.includes('DTSTART:20260924T093000Z'))
  assert.ok(ics1.includes('mailto:client@example.com') || ics1.includes('mailto:Client@Example.com') || ics1.toLowerCase().includes('mailto:client@example.com'))
  assert.match(second.subject, /تغییر کرد/) // fa: moved
})

test('enqueue: cancellation — owner always; client only when there was a confirmed time to remove', async () => {
  const db = fakeSupabase()
  assert.deepEqual(await enqueueConsultationCancelled(db, CTX, { by: 'client', range: null, reason: null, sequence: 1 }), [])
  assert.equal(db.upserts.length, 0)

  await enqueueConsultationCancelled(db, CTX, { by: 'owner', range: null, reason: 'x', sequence: 0 })
  const ownerNoTime = db.upserts[0].rows[0]
  assert.equal('attachments' in ownerNoTime, false, 'nothing to remove from a calendar')

  await enqueueConsultationCancelled(db, CTX, { by: 'client', range: SLOT, reason: null, sequence: 2 })
  const withTime = db.upserts[1].rows[0]
  assert.equal(withTime.dedupe_key, `consultation:${CTX.consultationId}:cancelled`)
  assert.match(withTime.attachments[0].contentType, /method=CANCEL/)
  const ics = withTime.attachments[0].content.replace(/\r\n /g, '')
  assert.ok(ics.includes('STATUS:CANCELLED') && ics.includes('SEQUENCE:2'))
})

test('enqueue: the owner\'s notice — each reschedule is its own message, a cancellation is one', async () => {
  const db = fakeSupabase()
  await enqueueConsultationClientUpdate(db, CTX, { change: 'rescheduled', windows: [W2], confirmedRange: null, requestNumber: 1 })
  await enqueueConsultationClientUpdate(db, CTX, { change: 'rescheduled', windows: [W1], confirmedRange: null, requestNumber: 2 })
  await enqueueConsultationClientUpdate(db, CTX, { change: 'cancelled', reason: null, confirmedRange: null })
  const keys = db.upserts.map((u) => u.rows[0].dedupe_key)
  assert.deepEqual(keys, [
    `consultation:${CTX.consultationId}:client-update:rescheduled:1`,
    `consultation:${CTX.consultationId}:client-update:rescheduled:2`,
    `consultation:${CTX.consultationId}:client-update:cancelled`,
  ])
  assert.ok(db.upserts.every((u) => u.rows[0].recipient_email === 'artaveo.dev@gmail.com' && u.rows[0].reply_to === 'client@example.com'))
})

test('provider: attachments reach Resend base64-encoded with their content type; the log-only provider logs no message content', async () => {
  const attachment = { filename: 'artaveo-intro-call.ics', contentType: 'text/calendar; charset=utf-8; method=REQUEST', content: 'BEGIN:VCALENDAR\r\nSUMMARY:گفتگو\r\nEND:VCALENDAR\r\n' }
  const [encoded] = encodeResendAttachments([attachment])
  assert.equal(encoded.filename, 'artaveo-intro-call.ics')
  assert.equal(encoded.content_type, attachment.contentType)
  assert.equal(Buffer.from(encoded.content, 'base64').toString('utf8'), attachment.content)

  const realFetch = globalThis.fetch
  let body
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(init.body)
    return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 })
  }
  try {
    const provider = new ResendEmailProvider('key', 'Artaveo <hi@example.test>')
    const result = await provider.send({ to: 'a@b.co', subject: 's', text: 't', attachments: [attachment] })
    assert.equal(result.ok, true)
    assert.equal(body.attachments.length, 1)
    await provider.send({ to: 'a@b.co', subject: 's', text: 't' })
    assert.equal('attachments' in body, false, 'no attachments key when there is no file')
  } finally {
    globalThis.fetch = realFetch
  }

  // Phase 24: the log-only provider writes one structured line and nothing about the message —
  // not the address, not the subject (it carries a client's name), not the file's name or content.
  const logged = []
  setLogSink((level, line) => logged.push({ level, record: JSON.parse(line) }))
  try {
    await new ConsoleEmailProvider().send({ to: 'a@b.co', subject: 'New inquiry — Ada', text: 't', attachments: [attachment] })
  } finally {
    setLogSink(null)
  }
  assert.equal(logged.length, 1)
  assert.equal(logged[0].record.event, 'notification.console_provider_send')
  assert.equal(logged[0].record.attachments, 1)
  const serialized = JSON.stringify(logged)
  for (const secret of ['a@b.co', 'Ada', 'VCALENDAR', 'artaveo-intro-call.ics']) assert.ok(!serialized.includes(secret), `${secret} must not be logged`)
})
