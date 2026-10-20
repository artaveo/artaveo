import { t, type Locale, type LocalizedText, type Service } from '@/types/content'
import type { InquiryDraft, ProductRequestDraft, ProductSnapshot } from '@/types/inquiry'
import {
  budgetBandOptions,
  featureTagOptions,
  preferredChannelOptions,
  projectTypeLabel,
  timelineOptions,
} from '@/lib/inquiry-content'
import { formatMoney } from '@/lib/products/money'
import { siteConfig } from '@/lib/site'

/**
 * Phase 27.5 — the product part of a summary: a snapshot on the server, or what
 * the Brief Builder's product list says in the browser. Same lines either way.
 */
export type SummaryProduct = {
  title: LocalizedText
  option: ProductSnapshot['option']
  services: ProductSnapshot['services']
}

export function snapshotToSummaryProduct(snapshot: ProductSnapshot | null | undefined): SummaryProduct | null {
  return snapshot ? { title: snapshot.product.title, option: snapshot.option, services: snapshot.services } : null
}

function productLines(product: SummaryProduct, locale: Locale): { label: string; value: string }[] {
  const lines = [{ label: locale === 'fa' ? 'محصول' : 'Product', value: t(product.title, locale) }]
  if (product.option) {
    lines.push({
      label: locale === 'fa' ? 'روش تهیه' : 'Way to get it',
      value: `${t(product.option.title, locale)} — ${formatMoney(product.option.price, product.option.billingPeriod, locale)}`,
    })
  }
  if (product.services.length > 0) {
    lines.push({
      label: locale === 'fa' ? 'خدمات بعد از فروش' : 'After-sales services',
      value: product.services.map((service) => `${t(service.title, locale)} (${formatMoney(service.price, service.period, locale)})`).join(locale === 'fa' ? '، ' : ', '),
    })
  }
  return lines
}

function contactLines(draft: { name: string; email: string; phone: string; preferredChannel: string }, locale: Locale): { label: string; value: string }[] {
  const lines = [
    { label: locale === 'fa' ? 'نام' : 'Name', value: draft.name.trim() },
    { label: locale === 'fa' ? 'ایمیل' : 'E-mail', value: draft.email.trim() },
  ]
  if (draft.phone.trim()) {
    lines.push({ label: locale === 'fa' ? 'تلفن / واتس‌اپ' : 'Phone / WhatsApp', value: draft.phone.trim() })
  }
  const channel = preferredChannelOptions.find((o) => o.id === draft.preferredChannel)
  if (channel) {
    lines.push({ label: locale === 'fa' ? 'راه جواب دلخواه' : 'Preferred way to reply', value: t(channel.label, locale) })
  }
  return lines
}

/** Phase 27.5 — the summary of a product purchase or demo request (e-mails, the pipeline). */
export function buildProductRequestSummaryLines(request: ProductRequestDraft, locale: Locale, product: SummaryProduct): { label: string; value: string }[] {
  const lines = [
    {
      label: locale === 'fa' ? 'درخواست' : 'Request',
      value: request.kind === 'product-demo' ? (locale === 'fa' ? 'دیدن دمو' : 'A demo') : locale === 'fa' ? 'خرید' : 'A purchase',
    },
    ...productLines(product, locale),
  ]
  if (request.message.trim()) lines.push({ label: locale === 'fa' ? 'پیام' : 'Message', value: request.message.trim() })
  return [...lines, ...contactLines(request, locale)]
}

export function buildProductRequestSummaryText(request: ProductRequestDraft, locale: Locale, product: SummaryProduct): string {
  return buildProductRequestSummaryLines(request, locale, product)
    .map((line) => `${line.label}: ${line.value}`)
    .join('\n')
}

/**
 * Turns the draft into the same plain-text summary the Brief Summary step
 * shows and the honest mailto fallback sends (`brief-builder.tsx`) — one
 * function, one source of truth, so the two never drift apart.
 *
 * `services` (and, for "buy one of our products", the chosen product) are passed in rather than fetched here
 * (Phase 12.2, roadmap § 12): this function is called both from a Client
 * Component during render (`review.tsx`, which can't await the database) and
 * from server-side email-template code (`lib/notifications/templates.ts`,
 * already async) — a plain, synchronous function taking the data as
 * parameters works for both, where importing the async selectors here would not.
 * Phase 27.4: engagement models left the public model — a brief no longer names one.
 */
export function buildInquirySummaryLines(
  draft: InquiryDraft,
  locale: Locale,
  services: Service[],
  product: SummaryProduct | null = null,
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []

  const service = draft.serviceSlug ? services.find((s) => s.slug === draft.serviceSlug) : undefined

  if (service) {
    lines.push({
      label: locale === 'fa' ? 'خدمت' : 'Service',
      value: t(service.title, locale) + (draft.packageId ? ` (${draft.packageId})` : ''),
    })
  }
  const projectType = projectTypeLabel(draft.projectType)
  if (projectType) {
    lines.push({ label: locale === 'fa' ? 'نوع پروژه' : 'Project type', value: t(projectType, locale) })
  }
  if (draft.projectType === 'buy-product' && product) lines.push(...productLines(product, locale))

  if (draft.goal.trim()) {
    lines.push({ label: locale === 'fa' ? 'آنچه باید انجام دهد' : 'What it should do', value: draft.goal.trim() })
  }

  const features = draft.featureTags
    .map((id) => featureTagOptions.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => t(o.label, locale))
  if (features.length) {
    lines.push({
      label: locale === 'fa' ? 'امکانات لازم' : 'Main features',
      value: features.join(', ') + (draft.featureOtherNote.trim() ? ` — ${draft.featureOtherNote.trim()}` : ''),
    })
  }

  const timeline = timelineOptions.find((o) => o.id === draft.timeline)
  if (timeline) {
    lines.push({ label: locale === 'fa' ? 'زمان' : 'When it is needed', value: t(timeline.label, locale) })
  }

  const budget = budgetBandOptions.find((o) => o.id === draft.budgetBand)
  if (budget) {
    lines.push({ label: locale === 'fa' ? 'بودجه' : 'Budget', value: t(budget.label, locale) })
  }

  if (draft.links.length) {
    const urls = draft.links.map((l) => l.url.trim()).filter(Boolean)
    if (urls.length) {
      lines.push({ label: locale === 'fa' ? 'لینک‌ها' : 'Links', value: urls.join(', ') })
    }
  }

  lines.push(...contactLines(draft, locale))

  return lines
}

export function buildInquirySummaryText(
  draft: InquiryDraft,
  locale: Locale,
  services: Service[],
  product: SummaryProduct | null = null,
): string {
  return buildInquirySummaryLines(draft, locale, services, product)
    .map((line) => `${line.label}: ${line.value}`)
    .join('\n')
}

/**
 * Honest fallback while § 9.2's persistence doesn't exist yet
 * (`brief-builder.tsx`): opens the visitor's own email client with the
 * full brief pre-filled, addressed to the same real inbox
 * `lib/site.ts#siteConfig.email` already uses everywhere else on the site.
 */
export function buildInquiryMailtoHref(
  draft: InquiryDraft,
  locale: Locale,
  services: Service[],
  product: SummaryProduct | null = null,
  email: string = siteConfig.email,
): string {
  const subject = locale === 'fa' ? 'جزئیات پروژه برای آرتاویو' : 'Project details for Artaveo'
  const body = buildInquirySummaryText(draft, locale, services, product)
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
