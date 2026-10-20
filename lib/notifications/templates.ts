import type { Locale, Service } from '@/types/content'
import type { InquiryDraft, ProductRequestDraft } from '@/types/inquiry'
import type { NotificationKind } from '@/types/notifications'
import { buildInquirySummaryText, buildProductRequestSummaryText, type SummaryProduct } from '@/lib/inquiry-summary'
import { t } from '@/types/content'
import { formatDate } from '@/lib/format'
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
  product: SummaryProduct | null,
  leadUrl?: string,
): { subject: string; text: string } {
  const buying = draft.projectType === 'buy-product' && product
  const subject = buying
    ? `New purchase request — ${singleLine(t(product.title, 'en'), 40)} — ${singleLine(draft.name) || 'unnamed'}`
    : `New inquiry — ${singleLine(draft.name) || 'unnamed'}`
  const text = [
    buying
      ? `A purchase request was submitted via ${siteConfig.name}'s Start a Project flow.`
      : `A new project brief was submitted via ${siteConfig.name}'s Start a Project flow.`,
    '',
    buildInquirySummaryText(draft, 'en', services, product),
    '',
    `Inquiry ID: ${inquiryId}`,
    ...(leadUrl ? [`Open it in the admin: ${leadUrl}`] : []),
    '',
    'Replying to this e-mail replies straight to the client.',
  ].join('\n')
  return { subject, text }
}

/** D-08, as the site says it (ContactPage.replyLine: "the same day, usually within a few hours") — one wording for every e-mail. */
export function responseCommitment(locale: Locale): string {
  return locale === 'fa' ? 'در همان روز، معمولاً طی چند ساعت' : 'the same day, usually within a few hours'
}

export function buildClientConfirmationEmail(
  draft: InquiryDraft,
  locale: Locale,
  services: Service[],
  product: SummaryProduct | null = null,
): { subject: string; text: string } {
  const subject =
    locale === 'fa' ? 'پروژه‌ی شما به آرتاویو رسید' : 'Artaveo has your project details'

  const intro =
    locale === 'fa'
      ? `تشکر که پروژه‌ی خود را برای آرتاویو فرستادید. ${responseCommitment(locale)} جواب می‌گیرید. آنچه فرستادید:`
      : `Thank you for telling Artaveo about your project. You'll hear back ${responseCommitment(locale)}. Here is a copy of what you sent:`

  const outro =
    locale === 'fa'
      ? 'اگر می‌خواهید چیزی را درست یا اضافه کنید، به همین ایمیل جواب دهید.'
      : 'To correct or add anything, just reply to this e-mail.'

  const text = [intro, '', buildInquirySummaryText(draft, locale, services, product), '', outro].join('\n')
  return { subject, text }
}

/** Phase 27.5 — the owner's alert for a product purchase or demo request. */
export function buildProductRequestOwnerEmail(
  request: ProductRequestDraft,
  product: SummaryProduct,
  inquiryId: string,
  leadUrl?: string,
): { subject: string; text: string } {
  const what = request.kind === 'product-demo' ? 'demo request' : 'purchase request'
  const subject = `New ${what} — ${singleLine(t(product.title, 'en'), 40)} — ${singleLine(request.name) || 'unnamed'}`
  const text = [
    `A ${what} for a product was submitted on ${siteConfig.name}.`,
    '',
    buildProductRequestSummaryText(request, 'en', product),
    '',
    `Inquiry ID: ${inquiryId}`,
    ...(leadUrl ? [`Open it in the admin: ${leadUrl}`] : []),
    '',
    'Replying to this e-mail replies straight to the client.',
  ].join('\n')
  return { subject, text }
}

/** Phase 27.5 — the client's confirmation of a product request, in their language. */
export function buildProductRequestClientEmail(request: ProductRequestDraft, product: SummaryProduct, locale: Locale): { subject: string; text: string } {
  const demo = request.kind === 'product-demo'
  const name = t(product.title, locale)
  const subject =
    locale === 'fa'
      ? `${demo ? 'درخواست دموی' : 'درخواست خرید'} شما به آرتاویو رسید`
      : `Artaveo has your ${demo ? 'demo' : 'purchase'} request`
  const intro =
    locale === 'fa'
      ? `تشکر از درخواست شما برای «${name}». ${responseCommitment(locale)} جواب می‌گیرید. آنچه فرستادید:`
      : `Thank you for your request about ${name}. You'll hear back ${responseCommitment(locale)}. Here is a copy of what you sent:`
  const outro =
    locale === 'fa'
      ? 'اگر می‌خواهید چیزی را درست یا اضافه کنید، به همین ایمیل جواب دهید.'
      : 'To correct or add anything, just reply to this e-mail.'
  return { subject, text: [intro, '', buildProductRequestSummaryText(request, locale, product), '', outro].join('\n') }
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
 * owner chose for that request, in the brand's voice like the rest of the site
 * (Phase 32, D-15), and signed by the founder by name («ذاکر ناصری», D-02). Every
 * factual line is true of the flow: the link is theirs alone, the form asks for
 * explicit consent to publish, and nothing goes on the site before Artaveo has
 * read it. No name is addressed (the site only holds an e-mail address).
 */
export function buildRecommendationRequestEmail(input: {
  locale: Locale
  url: string
  /** ISO timestamp the link stops working, or `null` when it does not expire. */
  expiresAt: string | null
}): { subject: string; text: string } {
  // The reader's own calendar: Solar Hijri with Afghan month names for fa, Gregorian for en (D-03).
  const expiry = input.expiresAt ? formatDate(input.expiresAt, input.locale) : null

  if (input.locale === 'fa') {
    return {
      subject: 'چند خط درباره‌ی همکاری با آرتاویو؟',
      text: [
        'سلام،',
        '',
        'آرتاویو از شما می‌خواهد، اگر حاضر باشید، چند خط درباره‌ی همکاری خود با آرتاویو بنویسید.',
        '',
        'چند دقیقه بیشتر وقت نمی‌گیرد. بدون موافقت شما در فورم چیزی نشر نمی‌شود و آرتاویو متن را پیش از نشر می‌خواند.',
        '',
        'لینک خصوصی شما:',
        input.url,
        ...(expiry ? ['', `این لینک تا ${expiry} کار می‌کند.`] : []),
        '',
        'اگر نمی‌خواهید، این ایمیل را نادیده بگیرید. برای هر سؤالی، به همین ایمیل جواب دهید.',
        '',
        'ذاکر ناصری — آرتاویو',
      ].join('\n'),
    }
  }

  return {
    subject: 'Would you write a short recommendation for Artaveo?',
    text: [
      'Hello,',
      '',
      'Artaveo would be grateful for a few lines about what it was like to work together.',
      '',
      'It takes a few minutes. Nothing is published without your agreement on the form, and Artaveo reads the text before it goes on the site.',
      '',
      'Your personal link:',
      input.url,
      ...(expiry ? ['', `This link works until ${expiry}.`] : []),
      '',
      "If you'd rather not, just ignore this e-mail. For any question, reply to it.",
      '',
      'Zakir Naseri — Artaveo',
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
      subject: 'یک تغییر کوچک در توصیه‌نامه‌ی شما — آرتاویو',
      text: [
        'سلام،',
        '',
        'تشکر که توصیه‌نامه نوشتید. پیش از نشر، آرتاویو از شما یک تغییر کوچک می‌خواهد:',
        '',
        note,
        '',
        'با همان لینک می‌توانید متن را تغییر دهید:',
        input.url,
        '',
        'اگر نمی‌خواهید توصیه‌نامه نشر شود، به همین ایمیل جواب دهید.',
      ].join('\n'),
    }
  }

  return {
    subject: 'A small change to your recommendation — Artaveo',
    text: [
      'Hello,',
      '',
      'Thank you for writing a recommendation. Before it is published, Artaveo would like to ask for one change:',
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

/** Phase 24 — an alert rule is firing. Plain text, no visitor data: only what the rule counted. */
export function buildOpsAlertEmail(input: {
  title: string
  what: string
  action: string
  count: number
  detail?: string
  adminUrl: string
}): { subject: string; text: string } {
  const subject = `Artaveo alert — ${input.title}`
  const lines = [input.what, '']
  if (input.count > 1) lines.push(`Count: ${input.count}`)
  if (input.detail) lines.push(`Detail: ${singleLine(input.detail, 200)}`)
  lines.push('', `What to do: ${input.action}`, '', 'Everything on this list, with the request references that link to the log lines:', input.adminUrl, '')
  lines.push('You get at most one e-mail a day per problem. It clears on its own when the cause is fixed.')
  return { subject, text: lines.join('\n') }
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
      ? 'The provider refused it in a way retrying cannot fix — something needs to change first (sender domain, API key, address).' // owner-facing
      : 'Every attempt failed; the retry limit was reached.',
    `Last error: ${singleLine(input.lastError, 300)}`,
    '',
    'Nothing was lost: the message and the inquiry it belongs to are saved. After fixing the cause, open the message and press Retry:',
    input.adminUrl,
  ].join('\n')
  return { subject, text }
}
