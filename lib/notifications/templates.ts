import type { EngagementModel, Locale, Service } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import { buildInquirySummaryText } from '@/lib/inquiry-summary'
import { siteConfig } from '@/lib/site'

/**
 * § 9.3 — Notification bodies.
 *
 * Reuses `buildInquirySummaryText` (§ 9.1/9.2) rather than a second copy
 * of the same field-by-field formatting — the Brief Summary screen, the
 * mailto fallback, and both of these emails must never drift out of sync
 * on what a brief "contains."
 */

export function buildOwnerAlertEmail(
  draft: InquiryDraft,
  inquiryId: string,
  services: Service[],
  engagementModels: EngagementModel[],
): { subject: string; text: string } {
  const subject = `New inquiry — ${draft.name.trim() || 'unnamed'}`
  const text = [
    `A new project brief was submitted via ${siteConfig.name}'s Start a Project flow.`,
    '',
    buildInquirySummaryText(draft, 'en', services, engagementModels),
    '',
    `Inquiry ID: ${inquiryId}`,
  ].join('\n')
  return { subject, text }
}

/** D-08's exact published wording (`lib/about-content.ts`, `lib/home-content.ts`) — never re-paraphrase it here. */
function responseCommitment(locale: Locale): string {
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
