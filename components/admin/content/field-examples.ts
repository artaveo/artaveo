import type { LocalizedText } from '@/types/content'

/**
 * Phase 27 — example texts shown faintly inside empty admin fields (the inputs'
 * placeholders), one per language, so the owner sees what a field is for before
 * typing. They are never saved and never shown on the site. Written as a
 * customer would read the real text (§ 16.1): what the customer gets, never how
 * the system works inside. The hints under the fields are in messages/*.json.
 */
const tx = (en: string, fa: string): LocalizedText => ({ en, fa })

export const PROJECT_EXAMPLES = {
  title: tx('Ticket sales system', 'سیستم فروش تکت'),
  category: tx('Web system', 'سیستم تحت وب'),
  summary: tx(
    'Passengers buy tickets online and pick their seat; the company runs routes and buses from one panel.',
    'مسافران تکت را آنلاین می‌خرند و چوکی خود را انتخاب می‌کنند؛ شرکت مسیرها و بس‌ها را از یک پنل مدیریت می‌کند.',
  ),
  industry: tx('Passenger transport', 'ترانسپورت مسافربری'),
  outcomeLine: tx('Tickets are now sold online, day and night.', 'تکت‌ها حالا شب و روز آنلاین فروخته می‌شوند.'),
  feature: tx('Passengers pick their seat on the seat map', 'مسافر چوکی خود را روی نقشه انتخاب می‌کند'),
  highlight: tx('Online ticket sales with seat choice', 'فروش آنلاین تکت با انتخاب چوکی'),
}

export const BLOCK_EXAMPLES = {
  title: tx('What it does', 'کارهایی که انجام می‌دهد'),
  intro: tx('A ticket sales system for intercity transport companies.', 'سیستم فروش تکت برای شرکت‌های ترانسپورتی بین‌شهری.'),
  challenge: tx('Tickets were sold only at the counter and by phone.', 'تکت‌ها فقط از گیشه و با تلفن فروخته می‌شد.'),
  result: tx('Passengers now buy tickets online at any hour.', 'مسافران حالا هر ساعت تکت را آنلاین می‌خرند.'),
  lead: tx('Everything a transport company needs, in one system.', 'هر آنچه یک شرکت ترانسپورتی لازم دارد، در یک سیستم.'),
  audienceItem: tx('Intercity transport companies', 'شرکت‌های ترانسپورتی بین‌شهری'),
  role: tx('Passenger', 'مسافر'),
  roleItem: tx('Picks a seat on the seat map', 'چوکی خود را روی نقشه انتخاب می‌کند'),
  question: tx('How long does setup take?', 'راه‌اندازی چقدر وقت می‌گیرد؟'),
  answer: tx('Write the real answer here.', 'پاسخ واقعی را این‌جا بنویسید.'),
  caption: tx('Seat map on a phone', 'نقشه‌ی چوکی‌ها روی موبایل'),
}

export const PRODUCT_EXAMPLES = {
  optionTitle: tx('Yearly licence', 'لایسنس سالانه'),
  optionSummary: tx('For one company, with updates for a year.', 'برای یک شرکت، با به‌روزرسانی برای یک سال.'),
  included: tx('Setup on your server', 'نصب روی سرور شما'),
  serviceTitle: tx('Staff training', 'آموزش کارمندان'),
  serviceDescription: tx('Two sessions at your office.', 'دو جلسه در دفتر شما.'),
}

/** Alt text: what the image shows, in a sentence. */
export const ALT_EXAMPLE = tx('Seat map with free and sold seats', 'نقشه‌ی چوکی‌ها با چوکی‌های آزاد و فروخته‌شده')
