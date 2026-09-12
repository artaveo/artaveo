import type { LocalizedText } from '@/types/content'
import type {
  BudgetBandId,
  FeatureTagId,
  PreferredChannelId,
  ProjectTypeId,
  TimelineId,
} from '@/types/inquiry'

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

export const projectTypeOptions: OptionDef<ProjectTypeId>[] = [
  {
    id: 'new-website',
    label: tx('A new website', 'یک وب‌سایت تازه'),
    description: tx(
      'Marketing, informational or portfolio site — content-led, not a custom backend.',
      'وب‌سایت معرفی، اطلاع‌رسانی یا نمونه‌کار — محتوامحور، نه یک بک‌اند سفارشی.',
    ),
  },
  {
    id: 'web-app-or-mvp',
    label: tx('A web application or MVP', 'یک اپلیکیشن وب یا MVP'),
    description: tx(
      'A product with user accounts, a database or custom logic behind it.',
      'محصولی با حساب کاربری، پایگاه داده یا منطق سفارشی در پشت آن.',
    ),
  },
  {
    id: 'existing-product',
    label: tx('Improving an existing product', 'بهبود یک محصول موجود'),
    description: tx(
      'A live site or app that needs new features, a redesign or a technical fix.',
      'یک سایت یا اپلیکیشن زنده که به ویژگی‌های تازه، بازطراحی یا اصلاح فنی نیاز دارد.',
    ),
  },
  {
    id: 'ongoing-care',
    label: tx('Ongoing care for a live product', 'مراقبت مستمر از یک محصول زنده'),
    description: tx(
      'Updates, monitoring and small changes on a regular cadence — see the Care Plan.',
      'به‌روزرسانی، مانیتورینگ و تغییرات کوچک با ریتم منظم — برنامه‌ی نگهداری را ببینید.',
    ),
  },
  {
    id: 'not-sure',
    label: tx('Not sure yet', 'هنوز مطمئن نیستم'),
    description: tx(
      'That is fine — the Discovery Sprint exists for exactly this.',
      'اشکالی ندارد — Discovery Sprint دقیقاً برای همین موقعیت است.',
    ),
  },
]

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
  { id: 'under-1k', label: tx('Under $1,000', 'کمتر از ۱٬۰۰۰ دلار') },
  { id: '1k-5k', label: tx('$1,000 – $5,000', '۱٬۰۰۰ تا ۵٬۰۰۰ دلار') },
  { id: '5k-15k', label: tx('$5,000 – $15,000', '۵٬۰۰۰ تا ۱۵٬۰۰۰ دلار') },
  { id: '15k-plus', label: tx('$15,000+', 'بیش از ۱۵٬۰۰۰ دلار') },
  { id: 'not-sure', label: tx('Not sure yet', 'هنوز مطمئن نیستم') },
]

export const preferredChannelOptions: OptionDef<PreferredChannelId>[] = [
  { id: 'email', label: tx('Email', 'ایمیل') },
  { id: 'whatsapp', label: tx('WhatsApp', 'واتس‌اپ') },
]
