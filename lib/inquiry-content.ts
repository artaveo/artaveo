import type { LocalizedText } from '@/types/content'
import type {
  BudgetBandId,
  FeatureTagId,
  PreferredChannelId,
  ProjectTypeId,
  TimelineId,
} from '@/types/inquiry'
import { LEGACY_PROJECT_TYPE_IDS } from '@/types/inquiry'

/**
 * Brief Builder option content (roadmap § 9.1). Every option below is a
 * generic, closed-vocabulary choice the *client* picks about their own
 * project or budget — none of it is a price or claim Artaveo publishes
 * about a service, so unlike `lib/services-content.ts` this file is not
 * gated by D-04 (see `types/inquiry.ts#BudgetBandId`).
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

export type OptionDef<Id extends string> = {
  id: Id
  label: LocalizedText
  description?: LocalizedText
}

/**
 * Phase 27.5 — what the visitor wants built, by kind of software. "Buy one of
 * our products" is offered only while at least one product is published (the
 * Brief Builder hides it otherwise); "Something else" is always there (D-18).
 */
export const projectTypeOptions: OptionDef<ProjectTypeId>[] = [
  {
    id: 'website',
    label: tx('A website', 'وب‌سایت'),
    description: tx('A site that presents your business, organisation or work.', 'سایتی که کسب‌وکار، اداره یا کار شما را معرفی می‌کند.'),
  },
  {
    id: 'web-system',
    label: tx('A web system or admin panel', 'سیستم تحت وب یا پنل مدیریت'),
    description: tx('Online sales, records, reports and daily work, managed in a browser.', 'فروش آنلاین، ثبت معلومات، گزارش‌ها و کارهای روزمره، همه در مرورگر.'),
  },
  {
    id: 'mobile-app',
    label: tx('A mobile app', 'اپلیکیشن موبایل'),
    description: tx('For Android, iPhone or both.', 'برای اندروید، آیفون یا هر دو.'),
  },
  {
    id: 'desktop-software',
    label: tx('Desktop software', 'نرم‌افزار کمپیوتری'),
    description: tx('A program that runs on Windows or Mac.', 'برنامه‌ای که روی ویندوز یا مک کار می‌کند.'),
  },
  {
    id: 'offline-system',
    label: tx('An offline system', 'سیستم آفلاین'),
    description: tx('Works without the internet, in your office or shop.', 'بدون انترنت، در دفتر یا دکان شما کار می‌کند.'),
  },
  {
    id: 'support-existing',
    label: tx('Support for software you already have', 'پشتیبانی نرم‌افزاری که دارید'),
    description: tx('Fixes, new features or ongoing care.', 'رفع مشکل، امکانات تازه یا نگهداری دوامدار.'),
  },
  {
    id: 'buy-product',
    label: tx('Buy one of our products', 'خرید یکی از محصولات آرتاویو'),
    description: tx('Ready-made software you can start using soon.', 'نرم‌افزار آماده که به‌زودی می‌توانید از آن استفاده کنید.'),
  },
  {
    id: 'other',
    label: tx('Something else', 'چیز دیگری'),
    description: tx('Describe it in a few words.', 'در چند کلمه بنویسید.'),
  },
]

/** Labels of the project types of revisions 1–44 — old leads in the admin still read correctly. */
export const legacyProjectTypeLabels: Record<(typeof LEGACY_PROJECT_TYPE_IDS)[number], LocalizedText> = {
  'new-website': tx('A new website', 'وب‌سایت تازه'),
  'web-app-or-mvp': tx('A web application', 'اپلیکیشن وب'),
  'existing-product': tx('Improving an existing product', 'بهبود محصول موجود'),
  'ongoing-care': tx('Ongoing care', 'نگهداری دوامدار'),
  'not-sure': tx('Not sure yet', 'هنوز معلوم نیست'),
}

/** Any stored project type id → its label (current or legacy), or `null` for an unknown id. */
export function projectTypeLabel(id: string | null | undefined): LocalizedText | null {
  if (!id) return null
  return projectTypeOptions.find((option) => option.id === id)?.label ?? legacyProjectTypeLabels[id as keyof typeof legacyProjectTypeLabels] ?? null
}

export const featureTagOptions: OptionDef<FeatureTagId>[] = [
  { id: 'user-accounts', label: tx('User accounts / login', 'حساب کاربری / ورود') },
  { id: 'payments', label: tx('Payments', 'پرداخت') },
  { id: 'admin-dashboard', label: tx('Admin dashboard', 'داشبورد مدیریتی') },
  { id: 'bilingual-rtl', label: tx('Bilingual / RTL support', 'پشتیبانی دوزبانه / راست‌به‌چپ') },
  { id: 'cms-content', label: tx('Self-managed content (CMS)', 'محتوای خودمدیریتی (CMS)') },
  {
    id: 'third-party-integrations',
    label: tx('Third-party integrations', 'اتصال به سرویس‌های شخص‌ثالث'),
  },
  { id: 'realtime', label: tx('Real-time features', 'ویژگی‌های بلادرنگ') },
  { id: 'other', label: tx('Something else', 'چیز دیگری') },
]

export const timelineOptions: OptionDef<TimelineId>[] = [
  { id: 'asap', label: tx('As soon as possible', 'در اسرع وقت') },
  { id: '1-3-months', label: tx('1–3 months', '۱ تا ۳ ماه') },
  { id: '3-6-months', label: tx('3–6 months', '۳ تا ۶ ماه') },
  { id: 'flexible', label: tx('Flexible', 'انعطاف‌پذیر') },
  { id: 'not-sure', label: tx('Not sure yet', 'هنوز مطمئن نیستم') },
]

/**
 * Self-reported bucket, not a published price signal — see
 * `types/inquiry.ts#BudgetBandId`. Optional step; `'not-sure'` is a first-
 * class option, not a fallback, since a visitor genuinely not knowing yet
 * is common and should not block the brief.
 */
export const budgetBandOptions: OptionDef<BudgetBandId>[] = [
  { id: 'under-1k', label: tx('Under $1,000', 'کمتر از ۱٬۰۰۰ دالر') },
  { id: '1k-5k', label: tx('$1,000 – $5,000', '۱٬۰۰۰ تا ۵٬۰۰۰ دالر') },
  { id: '5k-15k', label: tx('$5,000 – $15,000', '۵٬۰۰۰ تا ۱۵٬۰۰۰ دالر') },
  { id: '15k-plus', label: tx('$15,000+', 'بیش از ۱۵٬۰۰۰ دالر') },
  { id: 'not-sure', label: tx('Not sure yet', 'هنوز مطمئن نیستم') },
]

export const preferredChannelOptions: OptionDef<PreferredChannelId>[] = [
  { id: 'email', label: tx('Email', 'ایمیل') },
  { id: 'whatsapp', label: tx('WhatsApp', 'واتس‌اپ') },
]
