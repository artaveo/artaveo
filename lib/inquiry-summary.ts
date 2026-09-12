import { t, type Locale } from '@/types/content'
import type { InquiryDraft } from '@/types/inquiry'
import { getAllServices, getEngagementModels } from '@/lib/services-content'
import {
  budgetBandOptions,
  featureTagOptions,
  preferredChannelOptions,
  projectTypeOptions,
  timelineOptions,
} from '@/lib/inquiry-content'
import { siteConfig } from '@/lib/site'

/**
 * Turns the draft into the same plain-text summary the Brief Summary step
 * shows and the honest mailto fallback sends (`brief-builder.tsx`) — one
 * function, one source of truth, so the two never drift apart.
 */
export function buildInquirySummaryLines(draft: InquiryDraft, locale: Locale): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []

  const service = draft.serviceSlug
    ? getAllServices().find((s) => s.slug === draft.serviceSlug)
    : undefined
  const engagementModel = draft.engagementModelId
    ? getEngagementModels().find((m) => m.id === draft.engagementModelId)
    : undefined

  if (service) {
    lines.push({
      label: locale === 'fa' ? 'خدمت' : 'Service',
      value: t(service.title, locale) + (draft.packageId ? ` (${draft.packageId})` : ''),
    })
  }
  if (engagementModel) {
    lines.push({
      label: locale === 'fa' ? 'الگوی همکاری' : 'Engagement model',
      value: t(engagementModel.name, locale),
    })
  }

  const projectType = projectTypeOptions.find((o) => o.id === draft.projectType)
  if (projectType) {
    lines.push({ label: locale === 'fa' ? 'نوع پروژه' : 'Project type', value: t(projectType.label, locale) })
  }

  if (draft.goal.trim()) {
    lines.push({ label: locale === 'fa' ? 'هدف' : 'Goal', value: draft.goal.trim() })
  }

  const features = draft.featureTags
    .map((id) => featureTagOptions.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => t(o.label, locale))
  if (features.length) {
    lines.push({
      label: locale === 'fa' ? 'ویژگی‌های موردنیاز' : 'Key features',
      value: features.join(', ') + (draft.featureOtherNote.trim() ? ` — ${draft.featureOtherNote.trim()}` : ''),
    })
  }

  const timeline = timelineOptions.find((o) => o.id === draft.timeline)
  if (timeline) {
    lines.push({ label: locale === 'fa' ? 'بازه‌ی زمانی' : 'Timeline', value: t(timeline.label, locale) })
  }

  const budget = budgetBandOptions.find((o) => o.id === draft.budgetBand)
  if (budget) {
    lines.push({ label: locale === 'fa' ? 'بازه‌ی بودجه' : 'Budget range', value: t(budget.label, locale) })
  }

  if (draft.links.length) {
    const urls = draft.links.map((l) => l.url.trim()).filter(Boolean)
    if (urls.length) {
      lines.push({ label: locale === 'fa' ? 'لینک‌ها' : 'Links', value: urls.join(', ') })
    }
  }

  lines.push({ label: locale === 'fa' ? 'نام' : 'Name', value: draft.name.trim() })
  lines.push({ label: locale === 'fa' ? 'ایمیل' : 'Email', value: draft.email.trim() })
  if (draft.phone.trim()) {
    lines.push({ label: locale === 'fa' ? 'تلفن / واتس‌اپ' : 'Phone / WhatsApp', value: draft.phone.trim() })
  }

  const channel = preferredChannelOptions.find((o) => o.id === draft.preferredChannel)
  if (channel) {
    lines.push({
      label: locale === 'fa' ? 'روش ارتباط ترجیحی' : 'Preferred contact channel',
      value: t(channel.label, locale),
    })
  }

  return lines
}

export function buildInquirySummaryText(draft: InquiryDraft, locale: Locale): string {
  return buildInquirySummaryLines(draft, locale)
    .map((line) => `${line.label}: ${line.value}`)
    .join('\n')
}

/**
 * Honest fallback while § 9.2's persistence doesn't exist yet
 * (`brief-builder.tsx`): opens the visitor's own email client with the
 * full brief pre-filled, addressed to the same real inbox
 * `lib/site.ts#siteConfig.email` already uses everywhere else on the site.
 */
export function buildInquiryMailtoHref(draft: InquiryDraft, locale: Locale): string {
  const subject = locale === 'fa' ? 'بریف پروژه از طریق آرتاویو' : 'Project brief from Artaveo'
  const body = buildInquirySummaryText(draft, locale)
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
