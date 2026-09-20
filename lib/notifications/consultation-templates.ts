import { describeInstant, describeUtcRange, timeInZone, zoneLabel } from '@/lib/consultation/time'
import { responseCommitment, singleLine } from '@/lib/notifications/templates'
import type { Locale } from '@/types/content'
import type { ConsultationWindow } from '@/types/consultation'

/**
 * Phase 20 — the five consultation messages. Pure functions, like every other
 * template: URLs and values are passed in, nothing is fetched.
 *
 * Language. The three messages a client receives (`received`, `confirmed`,
 * `cancelled`) are written in the language they used on the site (en/fa),
 * in the owner's first-person voice, formal "شما" in Persian — the register the
 * other client-facing e-mails already use. The two owner messages are English,
 * as every owner message is (§ 9.3).
 *
 * Times. A person reading "Thursday 14:00" needs to know whose Thursday, so
 * every time is given in the CLIENT's zone (named, with its current UTC
 * offset) AND in UTC on its own line. In Persian the Latin zone name and the
 * UTC line sit at the end of their lines, where a right-to-left paragraph
 * handles them cleanly. No name is addressed (the request gives one, but it is
 * free text), and no Persian spelling of the owner's name is invented — the
 * Latin name stays at a pause point.
 */

type Zoned = { timezone: string }

const commitment = (locale: Locale) => responseCommitment(locale)

function zoneLine(timezone: string, at: Date): string {
  return zoneLabel(timezone, at)
}

/** `14:00–16:00` / `14:00 تا 16:00` */
function timeSpan(range: ConsultationWindow, timezone: string, locale: Locale): string {
  const from = timeInZone(range.start, timezone)
  const to = timeInZone(range.end, timezone)
  return locale === 'fa' ? `${from} تا ${to}` : `${from}–${to}`
}

/** One bullet per window: the date and the span, in the client's zone. */
export function windowLines(windows: ConsultationWindow[], timezone: string, locale: Locale): string[] {
  return windows.map((window) => {
    const day = describeInstant(window.start, timezone, locale).date
    return `- ${day} — ${timeSpan(window, timezone, locale)}`
  })
}

const LABELS = {
  en: {
    when: 'Date',
    time: 'Time',
    zone: 'Time zone',
    utc: 'In UTC',
    how: 'How',
  },
  fa: {
    when: 'تاریخ',
    time: 'ساعت',
    zone: 'منطقه‌ی زمانی',
    utc: 'به وقت جهانی',
    how: 'روش تماس',
  },
} as const

/** The block that pins one confirmed call down: date, time, zone, UTC. */
function confirmedBlock(range: ConsultationWindow, timezone: string, locale: Locale, meetingDetails?: string): string[] {
  const l = LABELS[locale]
  const start = new Date(range.start)
  return [
    `${l.when}: ${describeInstant(range.start, timezone, locale).date}`,
    `${l.time}: ${timeSpan(range, timezone, locale)}`,
    `${l.zone}: ${zoneLine(timezone, start)}`,
    `${l.utc}: ${describeUtcRange(range)}`,
    ...(meetingDetails ? [`${l.how}: ${meetingDetails.trim()}`] : []),
  ]
}

export function consultationSummary(locale: Locale): string {
  return locale === 'fa' ? 'آرتاویو — تماس آشنایی' : 'Artaveo — intro call'
}

/** The client's acknowledgement. Nothing is booked yet, and the message says so. */
export function buildConsultationReceivedEmail(input: {
  locale: Locale
  windows: ConsultationWindow[]
  timezone: string
  manageUrl: string
}): { subject: string; text: string } {
  const first = new Date(input.windows[0]?.start ?? Date.now())

  if (input.locale === 'fa') {
    return {
      subject: 'درخواست تماس شما دریافت شد — آرتاویو',
      text: [
        'از اینکه یک تماس آشنایی خواسته‌اید سپاسگزارم. زمان قطعی را برایتان می‌فرستم. تعهد من: ' + commitment('fa') + '.',
        '',
        'بازه‌هایی که پیشنهاد کرده‌اید:',
        ...windowLines(input.windows, input.timezone, 'fa'),
        `منطقه‌ی زمانی: ${zoneLine(input.timezone, first)}`,
        '',
        'تا وقتی زمان را تأیید نکرده‌ام، چیزی رزرو نشده است. با پیوند اختصاصی‌تان می‌توانید هر وقت خواستید این درخواست را تغییر دهید یا لغو کنید:',
        input.manageUrl,
        '',
        'می‌توانید به همین ایمیل هم پاسخ دهید.',
      ].join('\n'),
    }
  }

  return {
    subject: 'Your call request was received — Artaveo',
    text: [
      `Thanks for asking for an intro call. I'll send you a confirmed time — ${commitment('en')}.`,
      '',
      'The times you offered:',
      ...windowLines(input.windows, input.timezone, 'en'),
      `Time zone: ${zoneLine(input.timezone, first)}`,
      '',
      "Nothing is booked until I confirm a time. You can change or cancel this request whenever you like with your private link:",
      input.manageUrl,
      '',
      'You can also just reply to this e-mail.',
    ].join('\n'),
  }
}

/** The confirmation — the message that carries the calendar invitation. `previous` is set when a confirmed call was moved. */
export function buildConsultationConfirmedEmail(
  input: Zoned & {
    locale: Locale
    range: ConsultationWindow
    meetingDetails: string
    manageUrl: string
    calendarUrl: string
    previous?: ConsultationWindow | null
  },
): { subject: string; text: string } {
  const moved = Boolean(input.previous)

  if (input.locale === 'fa') {
    return {
      subject: moved ? 'زمان تماس شما تغییر کرد — آرتاویو' : 'تماس آشنایی شما تأیید شد — آرتاویو',
      text: [
        moved ? 'زمان تماس آشنایی‌مان را به این زمان جدید منتقل کردم:' : 'تماس آشنایی‌مان تأیید شد:',
        '',
        ...confirmedBlock(input.range, input.timezone, 'fa', input.meetingDetails),
        ...(input.previous
          ? ['', 'زمان قبلی (لغو شد):', ...confirmedBlock(input.previous, input.timezone, 'fa').slice(0, 3)]
          : []),
        '',
        'دعوت‌نامه‌ی تقویم پیوست است. اگر برنامه‌ی ایمیلتان آن را نشان نمی‌دهد، تماس را از صفحه‌ی خودتان به تقویم اضافه کنید:',
        input.calendarUrl,
        '',
        'زمان دیگری مناسب‌تان است یا نمی‌توانید بیایید؟ با پیوند اختصاصی‌تان زمان را عوض یا تماس را لغو کنید:',
        input.manageUrl,
      ].join('\n'),
    }
  }

  return {
    subject: moved ? 'Your intro call was moved — Artaveo' : 'Your intro call is confirmed — Artaveo',
    text: [
      moved ? "I've moved our intro call to this new time:" : 'Our intro call is confirmed:',
      '',
      ...confirmedBlock(input.range, input.timezone, 'en', input.meetingDetails),
      ...(input.previous
        ? ['', 'The previous time (cancelled):', ...confirmedBlock(input.previous, input.timezone, 'en').slice(0, 3)]
        : []),
      '',
      "A calendar invitation is attached. If your mail app doesn't show it, add the call from your page:",
      input.calendarUrl,
      '',
      "Need a different time, or can't make it? Use your private link to reschedule or cancel:",
      input.manageUrl,
    ].join('\n'),
  }
}

/**
 * Sent to the client when a call is cancelled and there is something to
 * cancel in their calendar — or always, when the OWNER cancels. `range` is the
 * confirmed time that was cancelled, when there was one.
 */
export function buildConsultationCancelledEmail(
  input: Zoned & {
    locale: Locale
    by: 'owner' | 'client'
    range: ConsultationWindow | null
    reason: string | null
    newRequestUrl: string
  },
): { subject: string; text: string } {
  const reason = input.reason?.trim() || null

  if (input.locale === 'fa') {
    return {
      subject: 'تماس آشنایی لغو شد — آرتاویو',
      text: [
        input.by === 'owner' ? 'تماس آشنایی‌مان را لغو کردم.' : 'تماس آشنایی را طبق درخواستتان لغو کردم.',
        ...(input.range ? ['', ...confirmedBlock(input.range, input.timezone, 'fa').slice(0, 4)] : []),
        ...(reason && input.by === 'owner' ? ['', 'دلیل:', reason] : []),
        ...(input.range ? ['', 'دعوت‌نامه‌ی پیوست، این رویداد را از تقویمتان برمی‌دارد.'] : []),
        '',
        input.by === 'owner'
          ? 'اگر هنوز می‌خواهید صحبت کنیم، می‌توانید زمان دیگری درخواست کنید:'
          : 'هر وقت خواستید، می‌توانید زمان دیگری درخواست کنید:',
        input.newRequestUrl,
      ].join('\n'),
    }
  }

  return {
    subject: 'Your intro call was cancelled — Artaveo',
    text: [
      input.by === 'owner' ? "I've cancelled our intro call." : "I've cancelled the intro call, as you asked.",
      ...(input.range ? ['', ...confirmedBlock(input.range, input.timezone, 'en').slice(0, 4)] : []),
      ...(reason && input.by === 'owner' ? ['', 'Reason:', reason] : []),
      ...(input.range ? ['', 'The attached calendar update removes it from your calendar.'] : []),
      '',
      input.by === 'owner'
        ? "If you'd still like to talk, you can ask for another time:"
        : 'Whenever you like, you can ask for another time:',
      input.newRequestUrl,
    ].join('\n'),
  }
}

const OWNER_LANGUAGE = (locale: string) => (locale === 'fa' ? 'Persian' : 'English')

/** The owner's alert for a new request. Replies go straight to the client (the enqueue sets `Reply-To`). */
export function buildConsultationRequestedEmail(input: {
  name: string
  email: string
  phone: string
  goal: string
  locale: Locale
  timezone: string
  windows: ConsultationWindow[]
  adminUrl: string
}): { subject: string; text: string } {
  const first = new Date(input.windows[0]?.start ?? Date.now())
  const subject = `Call requested — ${singleLine(input.name) || 'unnamed'}`
  const text = [
    `${singleLine(input.name, 200) || 'Someone'} asked for an intro call.`,
    '',
    `E-mail: ${singleLine(input.email, 320)}`,
    ...(input.phone ? [`WhatsApp / phone: ${singleLine(input.phone, 60)}`] : []),
    `Language: ${OWNER_LANGUAGE(input.locale)}`,
    '',
    'What they want to talk about:',
    input.goal.trim(),
    '',
    `Times they offered — their time zone is ${zoneLine(input.timezone, first)}:`,
    ...input.windows.flatMap((window) => [
      ...windowLines([window], input.timezone, 'en'),
      `    ${describeUtcRange(window)}`,
    ]),
    '',
    `Confirm a time in the admin: ${input.adminUrl}`,
    '',
    'Replying to this e-mail replies straight to the client.',
  ].join('\n')
  return { subject, text }
}

/** The owner's notice that the client cancelled, or replaced their times. */
export function buildConsultationClientUpdateEmail(
  input:
    | {
        change: 'cancelled'
        name: string
        reason: string | null
        confirmedRange: ConsultationWindow | null
        timezone: string
        adminUrl: string
      }
    | {
        change: 'rescheduled'
        name: string
        timezone: string
        windows: ConsultationWindow[]
        /** The confirmed time that stands until a new one is confirmed, if there was one. */
        confirmedRange: ConsultationWindow | null
        adminUrl: string
      },
): { subject: string; text: string } {
  const name = singleLine(input.name, 200) || 'The client'

  if (input.change === 'cancelled') {
    return {
      subject: `Call cancelled by the client — ${singleLine(input.name) || 'unnamed'}`,
      text: [
        `${name} cancelled their intro call using their private link.`,
        ...(input.confirmedRange
          ? [
              '',
              'It had been confirmed for:',
              `${describeInstant(input.confirmedRange.start, 'UTC', 'en').date} — ${describeUtcRange(input.confirmedRange)}`,
              'They were sent a calendar cancellation.',
            ]
          : []),
        ...(input.reason?.trim() ? ['', 'Their reason:', input.reason.trim()] : []),
        '',
        `Details: ${input.adminUrl}`,
      ].join('\n'),
    }
  }

  const first = new Date(input.windows[0]?.start ?? Date.now())
  return {
    subject: `New times requested — ${singleLine(input.name) || 'unnamed'}`,
    text: [
      `${name} asked for a different time for their intro call.`,
      ...(input.confirmedRange
        ? [
            '',
            'The confirmed time still stands, and stays in their calendar, until you confirm a new one:',
            describeUtcRange(input.confirmedRange),
          ]
        : []),
      '',
      `The times they offered now — their time zone is ${zoneLine(input.timezone, first)}:`,
      ...input.windows.flatMap((window) => [
        ...windowLines([window], input.timezone, 'en'),
        `    ${describeUtcRange(window)}`,
      ]),
      '',
      `Confirm a time in the admin: ${input.adminUrl}`,
    ].join('\n'),
  }
}
