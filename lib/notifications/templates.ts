import type { EngagementModel, Locale, Service } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import type { NotificationKind } from '@/types/notifications'
import { buildInquirySummaryText } from '@/lib/inquiry-summary'
import { siteConfig } from '@/lib/site'

/**
 * § 9.3 / Phase 19 — Notification bodies.
 *
 * Every builder is a pure function: the URL a message links to and every
 * value it mentions are passed in, never fetched, so a template can be tested
 * (`scripts/test-notifications.mjs`) and re-rendered without a database.
 *
 * Language: the only message a visitor ever receives is the client
 * confirmation, and it is written in the language they chose in the Brief
 * Builder (`preferredLocale`, en/fa). Everything else goes to the owner and is
 * English — the same decision § 9.3 recorded for the owner alert.
 *
 * Plain text only. The e-mail carries no styling to break in RTL, and the
 * brief itself (`buildInquirySummaryText`) is already plain text.
 *
 * Reuses `buildInquirySummaryText` (§ 9.1/9.2) rather than a second copy of the
 * same field-by-field formatting — the Brief Summary screen, the mailto
 * fallback, and both inquiry e-mails must never drift out of sync on what a
 * brief "contains".
 */

/**
 * Anything that lands in a subject line comes from a visitor or a database
 * row. Collapse every run of whitespace — newlines included — to one space and
 * cap the length, so a stray line break can never make the provider reject an
 * otherwise good message (which would silently turn an owner alert into a
 * permanent failure).
 */
export function singleLine(value: string, maxLength = 80): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength - 1).trimEnd()}…` : collapsed
}

export function buildOwnerAlertEmail(
  draft: InquiryDraft,
  inquiryId: string,
  services: Service[],
  engagementModels: EngagementModel[],
  leadUrl?: string,
): { subject: string; text: string } {
  const subject = `New inquiry — ${singleLine(draft.name) || 'unnamed'}`
  const text = [
    `A new project brief was submitted via ${siteConfig.name}'s Start a Project flow.`,
    '',
    buildInquirySummaryText(draft, 'en', services, engagementModels),
    '',
    `Inquiry ID: ${inquiryId}`,
    ...(leadUrl ? [`Open it in the admin: ${leadUrl}`] : []),
    '',
    'Replying to this e-mail replies straight to the client.',
  ].join('\n')
  return { subject, text }
}

/** D-08's exact published wording (`lib/about-content.ts`, `lib/home-content.ts`) — never re-paraphrase it here. */
export function responseCommitment(locale: Locale): string {
  return locale === 'fa' ? 'پاسخ‌گویی در همان روز، طی چند ساعت' : 'a reply within a few hours, same day'
}

export function buildClientConfirmationEmail(
  draft: InquiryDraft,
  locale: Locale,
  services: Service[],
  engagementModels: EngagementModel[],
): { subject: string; text: string } {
  const subject =
    locale === 'fa' ? 'بریف پروژه‌ی شما دریافت شد — آرتاویو' : 'Your project brief was received — Artaveo'

  const intro =
    locale === 'fa'
      ? `از ارسال بریف پروژه‌تان سپاسگزاریم. طبق تعهد پاسخ‌گویی آرتاویو، ${responseCommitment(locale)} پاسخ خواهید گرفت. خلاصه‌ی چیزی که ارسال کردید:`
      : `Thanks for sending your project brief. Per Artaveo's response commitment, you'll get ${responseCommitment(locale)}. Here's a copy of what you sent:`

  const outro =
    locale === 'fa'
      ? 'اگر نیاز به اصلاح یا افزودن چیزی دارید، کافی‌ست به همین ایمیل پاسخ دهید.'
      : 'If you need to correct or add anything, just reply to this email.'

  const text = [intro, '', buildInquirySummaryText(draft, locale, services, engagementModels), '', outro].join('\n')
  return { subject, text }
}

export function buildEvidenceSubmittedEmail(input: {
  personName: string
  relationship: string
  company: string | null
  /** The language the recommender wrote in. */
  submittedLocale: Locale
  /** `true` when this is a rewrite after "request change", not a first submission. */
  resubmission: boolean
  reviewUrl: string
}): { subject: string; text: string } {
  const name = singleLine(input.personName) || 'someone'
  const subject = input.resubmission ? `Recommendation updated — ${name}` : `New recommendation to review — ${name}`

  const text = [
    input.resubmission
      ? 'A recommender rewrote their statement after you asked for a change. It is back in the moderation queue.'
      : 'A recommender used a request link to submit a statement. It is waiting in the moderation queue — nothing is public until you approve it.',
    '',
    `From: ${singleLine(input.personName, 200)}`,
    `Relationship: ${singleLine(input.relationship, 200)}`,
    ...(input.company ? [`Company: ${singleLine(input.company, 200)}`] : []),
    `Written in: ${input.submittedLocale === 'fa' ? 'Persian' : 'English'}`,
    '',
    `Review it: ${input.reviewUrl}`,
  ].join('\n')

  return { subject, text }
}

export type PublishedEntity = 'article' | 'project' | 'service'

const PUBLISHED_ENTITY_LABEL: Record<PublishedEntity, string> = {
  article: 'article',
  project: 'case study',
  service: 'service page',
}

/**
 * "Something went live." Two ways that happens, and the message says which:
 * the daily run published a scheduled article (nobody was watching — this is
 * the only way the owner finds out), or somebody with admin access pressed
 * Publish (the owner may be that person, or an editor — the owner asked for
 * the notice either way, 19 September 2026).
 */
export function buildContentPublishedEmail(input: {
  entity: PublishedEntity
  title: string
  url: string
  how: { via: 'scheduled'; scheduledFor: string } | { via: 'manual'; by: string }
}): { subject: string; text: string } {
  const label = PUBLISHED_ENTITY_LABEL[input.entity]
  const subject = `Published — ${singleLine(input.title, 100)}`
  const how =
    input.how.via === 'scheduled'
      ? [
          `Scheduled for: ${input.how.scheduledFor.slice(0, 10)}`,
          '',
          'Scheduled publishing runs once a day, so this is the daily run picking it up.',
        ]
      : [`Published in the admin by: ${singleLine(input.how.by, 200)}`]
  const text = [
    input.how.via === 'scheduled' ? `A scheduled ${label} went live.` : `A ${label} was published.`,
    '',
    `Title: ${singleLine(input.title, 200)}`,
    `Live at: ${input.url}`,
    ...(input.how.via === 'scheduled' ? [''] : []),
    ...how,
  ].join('\n')
  return { subject, text }
}

/**
 * D-14 — the owner sends a recommender their link. Written in the language the
 * owner chose for that request. The recommender is someone the owner knows, so
 * it is written in the owner's own first-person voice (as the rest of the
 * site is), and every factual line is true of the flow: the
 * link is theirs alone, the form asks for explicit consent to publish, and
 * nothing goes on the site before the owner has reviewed it. No name is
 * addressed (the site only holds an e-mail address), and no Persian spelling
 * of the owner's name is invented — the Latin name stays at a pause point.
 */
export function buildRecommendationRequestEmail(input: {
  locale: Locale
  url: string
  /** ISO timestamp the link stops working, or `null` when it does not expire. */
  expiresAt: string | null
}): { subject: string; text: string } {
  const expiry = input.expiresAt ? input.expiresAt.slice(0, 10) : null

  if (input.locale === 'fa') {
    return {
      subject: 'درخواست یک توصیه‌نامه‌ی کوتاه — آرتاویو',
      text: [
        'سلام،',
        '',
        'من از آرتاویو (Zakir Naseri) می‌خواهم بپرسم آیا حاضرید یک توصیه‌نامه‌ی کوتاه درباره‌ی همکاری‌مان بنویسید.',
        '',
        'چند دقیقه بیشتر طول نمی‌کشد. بدون رضایت صریح شما در فرم چیزی منتشر نمی‌شود، و پیش از قرار گرفتن در سایت، متن را خودم بازبینی می‌کنم.',
        '',
        'پیوند اختصاصی شما:',
        input.url,
        ...(expiry ? ['', `این پیوند تا ${expiry} معتبر است.`] : []),
        '',
        'اگر نمی‌خواهید، فقط این ایمیل را نادیده بگیرید. می‌توانید با پاسخ‌دادن به همین ایمیل مستقیم با من در ارتباط باشید.',
      ].join('\n'),
    }
  }

  return {
    subject: 'Could you write a short recommendation? — Artaveo',
    text: [
      'Hello,',
      '',
      "This is Zakir Naseri from Artaveo. I'd like to ask whether you'd be willing to write a short recommendation about working together.",
      '',
      "It takes a few minutes. Nothing is published without your explicit consent on the form, and I review the text myself before anything goes on the site.",
      '',
      'Your personal link:',
      input.url,
      ...(expiry ? ['', `This link is valid until ${expiry}.`] : []),
      '',
      "If you'd rather not, just ignore this e-mail. You can also reply to it to reach me directly.",
    ].join('\n'),
  }
}

/**
 * D-14 — the owner asked for a change while moderating. `note` is the owner's
 * own moderation note, verbatim (it is what the recommender would otherwise
 * see on the reopened page), so it is never rewritten here.
 */
export function buildRecommendationChangesEmail(input: {
  locale: Locale
  url: string
  note: string
}): { subject: string; text: string } {
  const note = input.note.trim()

  if (input.locale === 'fa') {
    return {
      subject: 'درخواست یک اصلاح کوچک — آرتاویو',
      text: [
        'سلام،',
        '',
        'از اینکه توصیه‌نامه نوشتید سپاسگزارم. پیش از انتشار، از شما یک اصلاح می‌خواهم:',
        '',
        note,
        '',
        'با همان پیوند می‌توانید متن را ویرایش کنید:',
        input.url,
        '',
        'اگر ترجیح می‌دهید توصیه‌نامه منتشر نشود، فقط به همین ایمیل پاسخ دهید.',
      ].join('\n'),
    }
  }

  return {
    subject: 'A small change was requested — Artaveo',
    text: [
      'Hello,',
      '',
      "Thank you for writing a recommendation. Before it can be published I'd like to ask for a change:",
      '',
      note,
      '',
      'You can update it with the same link:',
      input.url,
      '',
      "If you'd rather it isn't published, just reply to this e-mail.",
    ].join('\n'),
  }
}

const KIND_LABEL: Record<NotificationKind, string> = {
  'owner-alert': 'new-inquiry alert',
  'client-confirmation': 'client confirmation',
  'evidence-submitted': 'recommendation alert',
  'content-published': 'publish notice',
  'system-alert': 'system alert',
  'recommendation-request': 'recommendation request',
  'recommendation-changes': 'change request',
  'consultation-requested': 'call-request alert',
  'consultation-received': 'call-request acknowledgement',
  'consultation-confirmed': 'call confirmation',
  'consultation-cancelled': 'call cancellation',
  'consultation-client-update': 'call-change notice',
}

export function notificationKindLabel(kind: NotificationKind): string {
  return KIND_LABEL[kind]
}

export function buildSystemAlertEmail(input: {
  failedKind: NotificationKind
  attempts: number
  /** `true` when the provider refused it in a way retrying cannot fix. */
  permanent: boolean
  lastError: string
  adminUrl: string
}): { subject: string; text: string } {
  const label = KIND_LABEL[input.failedKind]
  const subject = `Notification failed — ${label}`
  const text = [
    `A ${label} could not be delivered and will not be retried automatically.`,
    '',
    `Attempts: ${input.attempts}`,
    input.permanent
      ? 'The provider refused it in a way retrying cannot fix — something needs to change first (sender domain, API key, address).'
      : 'Every attempt failed; the retry limit was reached.',
    `Last error: ${singleLine(input.lastError, 300)}`,
    '',
    'Nothing was lost: the message and the inquiry it belongs to are saved. After fixing the cause, open the message and press Retry:',
    input.adminUrl,
  ].join('\n')
  return { subject, text }
}
