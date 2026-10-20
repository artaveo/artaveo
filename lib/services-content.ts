import type { EngagementModel, FaqItem, LocalizedText, Service, ServiceProcessStep } from '@/types/content'

/**
 * Service catalogue — Phase 31.1 (roadmap § 11A): services by **kind of
 * software** — websites, web systems & admin panels, mobile apps, desktop
 * software, support & extension (§ 14.0 Service Card, D-18). Each service
 * page shows what you get, related work, its process in four steps, a
 * "from" price only when the owner set one (D-04), questions and a call to
 * action.
 *
 * This file is the seed: `scripts/import-content-to-db.ts` writes it into
 * `services` (and the test stack's database), and migration
 * `0030_services_catalogue` put the same five services on the live site.
 * The site itself reads the database (`getAllServices()` below) — the owner
 * edits services in the admin (Content → Services).
 *
 * Copy follows § 16: the customer is «شما», the brand is the subject, no
 * technology names, nothing about how the software works inside, Dari of
 * Afghanistan (§ 16.3).
 *
 * The seven services of revisions 1–44 (Business Website, Web Application /
 * MVP, Admin Dashboards, Backend/API, Performance/SEO, Bug Fix, Care Plan)
 * stay in the live database unpublished (0030), so old requests keep their
 * reference; they are no longer part of the seed.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

function step(en: [string, string], fa: [string, string]): ServiceProcessStep {
  return { title: tx(en[0], fa[0]), description: tx(en[1], fa[1]) }
}

function faq(en: [string, string], fa: [string, string]): FaqItem {
  return { question: tx(en[0], fa[0]), answer: tx(en[1], fa[1]) }
}

function engagementModel(
  id: string,
  name: [string, string],
  whenItFits: [string, string],
  billing: [string, string],
): EngagementModel {
  return {
    id,
    name: tx(name[0], name[1]),
    whenItFits: tx(whenItFits[0], whenItFits[1]),
    billing: tx(billing[0], billing[1]),
  }
}

const servicesData: Service[] = [
  {
    id: 'websites',
    slug: 'websites',
    icon: 'Globe',
    kind: 'website',
    title: tx('Business websites', 'وب‌سایت برای کسب‌وکار'),
    description: tx(
      'A website that presents your business and brings in customers.',
      'وب‌سایتی که کسب‌وکار شما را معرفی می‌کند و مشتری می‌آورد.',
    ),
    tagline: tx(
      'A fast, good-looking website your customers find and trust — and your staff keep up to date themselves.',
      'وب‌سایتی زیبا و سریع که مشتریان شما آن را پیدا می‌کنند و به آن اعتماد می‌کنند؛ کارمندان شما هم خودشان آن را به‌روز نگه می‌دارند.',
    ),
    deliverables: [
      tx('Designed in your brand’s colours and style', 'طراحی با رنگ‌ها و نشان کسب‌وکار شما'),
      tx('Works well on phone, tablet and computer', 'روی موبایل، تبلت و کمپیوتر به‌خوبی کار می‌کند'),
      tx('A panel to update pages, news and photos yourself', 'پنلی که صفحه‌ها، خبرها و عکس‌ها را خودتان در آن به‌روز می‌کنید'),
      tx('Contact form and a WhatsApp button', 'فورم تماس و دکمه‌ی واتس‌اپ'),
      tx('Set up so customers find you on Google', 'تنظیم‌شده تا مشتریان شما را در گوگل پیدا کنند'),
      tx('In the languages your customers read', 'به زبان‌هایی که مشتریان شما می‌خوانند'),
    ],
    relatedProjectSlugs: ['pazhuhesh-portal'],
    process: [
      step(
        ['A conversation', 'About your business, your customers and what the site should do for them.'],
        ['گفتگو', 'درباره‌ی کسب‌وکار، مشتریان و کاری که وب‌سایت باید برای آن‌ها انجام دهد.'],
      ),
      step(
        ['Design', 'You see the pages and approve them before they are built.'],
        ['طراحی', 'صفحه‌ها را پیش از ساخت می‌بینید و تأیید می‌کنید.'],
      ),
      step(
        ['Build', 'The site is built and your texts and photos go in.'],
        ['ساخت', 'وب‌سایت ساخته می‌شود و متن‌ها و عکس‌های شما در آن قرار می‌گیرد.'],
      ),
      step(
        ['Launch and support', 'The site goes live, and Artaveo stays with you after launch.'],
        ['راه‌اندازی و پشتیبانی', 'وب‌سایت روی انترنت می‌رود و آرتاویو بعد از راه‌اندازی هم در کنار شماست.'],
      ),
    ],
    faq: [
      faq(
        ['How long does a website take?', 'It depends on the number of pages and how ready your texts and photos are. You get a clear timeline after the first conversation.'],
        ['ساخت یک وب‌سایت چقدر وقت می‌گیرد؟', 'به تعداد صفحه‌ها و آماده‌بودن متن‌ها و عکس‌های شما بستگی دارد. بعد از گفتگوی اول، زمان‌بندی روشن را دریافت می‌کنید.'],
      ),
      faq(
        ['Can we update the site ourselves?', 'Yes. You get a simple panel to change texts, photos and news whenever you like.'],
        ['آیا خودمان می‌توانیم وب‌سایت را به‌روز کنیم؟', 'بلی. یک پنل ساده دارید که متن‌ها، عکس‌ها و خبرها را هر وقت خواستید در آن تغییر می‌دهید.'],
      ),
    ],
  },
  {
    id: 'web-systems',
    slug: 'web-systems',
    icon: 'PanelsTopLeft',
    kind: 'web-system',
    title: tx('Web systems & admin panels', 'سیستم‌های تحت وب و پنل مدیریت'),
    description: tx(
      'Management systems your staff use every day, from any computer or phone.',
      'سیستم‌های مدیریتی که کارمندان شما هر روز از هر کمپیوتر یا موبایل با آن کار می‌کنند.',
    ),
    tagline: tx(
      'Sales, bookings, tickets, stock, students or customers — run your daily work in one system and get a report whenever you need one.',
      'فروش، ثبت‌نام، تکت، گدام، محصلان یا مشتریان؛ کار روزمره‌ی خود را در یک سیستم پیش ببرید و هر وقت خواستید گزارش بگیرید.',
    ),
    deliverables: [
      tx('Built around the way your business works', 'مطابق روش کار کسب‌وکار شما ساخته می‌شود'),
      tx('Separate access for managers, staff and customers', 'دسترسی جدا برای مدیر، کارمند و مشتری'),
      tx('Online sales, bookings and tickets where you need them', 'فروش، ثبت و تکت آنلاین هر جا که ضرورت دارید'),
      tx('Reports you can print or download in Excel', 'گزارش‌هایی که چاپ می‌کنید یا در اکسل می‌گیرید'),
      tx('Works on phone and computer', 'روی موبایل و کمپیوتر کار می‌کند'),
      tx('Training for your staff and support after launch', 'آموزش کارمندان و پشتیبانی بعد از راه‌اندازی'),
    ],
    relatedProjectSlugs: ['transportation-system', 'pazhuhesh-portal'],
    process: [
      step(
        ['A conversation', 'About how your work runs today and what should change.'],
        ['گفتگو', 'درباره‌ی این‌که کار شما امروز چطور پیش می‌رود و چه چیزی باید تغییر کند.'],
      ),
      step(
        ['Design', 'You see every screen and approve it before it is built.'],
        ['طراحی', 'هر صفحه را پیش از ساخت می‌بینید و تأیید می‌کنید.'],
      ),
      step(
        ['Build in stages', 'You try each part as soon as it is ready.'],
        ['ساخت مرحله‌به‌مرحله', 'هر بخش را همین‌که آماده شد، خودتان امتحان می‌کنید.'],
      ),
      step(
        ['Launch and training', 'Your staff learn the system, and support continues after handover.'],
        ['راه‌اندازی و آموزش', 'کارمندان شما با سیستم آشنا می‌شوند و پشتیبانی بعد از تحویل هم ادامه دارد.'],
      ),
    ],
    faq: [
      faq(
        ['Can our current records move into the new system?', 'Yes. Lists you keep in Excel or another program are moved in, so you start with your own records.'],
        ['آیا معلومات فعلی ما به سیستم تازه منتقل می‌شود؟', 'بلی. فهرست‌هایی که در اکسل یا برنامه‌ی دیگری دارید به سیستم تازه منتقل می‌شوند و کار را با معلومات خودتان شروع می‌کنید.'],
      ),
      faq(
        ['Can new parts be added later?', 'Yes. Whenever your business needs a new part, Artaveo adds it to the same system.'],
        ['آیا بعداً می‌شود بخش تازه‌ای اضافه کرد؟', 'بلی. هر وقت کسب‌وکار شما به بخش تازه‌ای ضرورت داشت، آرتاویو آن را به همان سیستم اضافه می‌کند.'],
      ),
    ],
  },
  {
    id: 'mobile-apps',
    slug: 'mobile-apps',
    icon: 'Smartphone',
    kind: 'mobile-app',
    title: tx('Mobile apps', 'اپلیکیشن موبایل'),
    description: tx(
      'Apps for Android and iPhone that your customers and staff carry with them.',
      'اپلیکیشن برای اندروید و آیفون که مشتریان و کارمندان شما همیشه همراه دارند.',
    ),
    tagline: tx(
      'Put your service in your customers’ pockets — sign-ups, purchases, bookings and messages in one app.',
      'خدمات خود را به موبایل مشتریان ببرید؛ ثبت‌نام، خرید، وقت‌گرفتن و پیام‌ها در یک اپلیکیشن.',
    ),
    deliverables: [
      tx('For Android and iPhone', 'برای اندروید و آیفون'),
      tx('A design that feels natural on a phone', 'طراحی‌ای که روی موبایل راحت و آشناست'),
      tx('Messages and alerts for your customers', 'پیام و اطلاع‌رسانی برای مشتریان'),
      tx('Works together with your website and admin panel', 'هماهنگ با وب‌سایت و پنل مدیریت شما'),
      tx('Published on Google Play and the App Store', 'نشر در گوگل پلی و اپ استور'),
      tx('Updates and support after launch', 'به‌روزرسانی و پشتیبانی بعد از راه‌اندازی'),
    ],
    process: [
      step(
        ['A conversation', 'About who will use the app and what they should be able to do.'],
        ['گفتگو', 'درباره‌ی این‌که چه کسانی از اپلیکیشن استفاده می‌کنند و چه کاری باید بتوانند انجام دهند.'],
      ),
      step(
        ['Design', 'You see the screens on your own phone before the app is built.'],
        ['طراحی', 'صفحه‌ها را پیش از ساخت روی موبایل خودتان می‌بینید.'],
      ),
      step(
        ['Build', 'You install test versions and follow the progress.'],
        ['ساخت', 'نسخه‌های آزمایشی را نصب می‌کنید و پیشرفت کار را می‌بینید.'],
      ),
      step(
        ['Publishing and support', 'The app goes on the stores, and support continues after launch.'],
        ['نشر و پشتیبانی', 'اپلیکیشن در فروشگاه‌ها نشر می‌شود و پشتیبانی بعد از آن هم ادامه دارد.'],
      ),
    ],
    faq: [
      faq(
        ['Do we need both Android and iPhone?', 'Not always. In the first conversation you look together at where your customers are; the app can start on one and add the other later.'],
        ['آیا به هر دو، اندروید و آیفون، ضرورت داریم؟', 'همیشه نه. در گفتگوی اول با هم می‌بینیم مشتریان شما بیشتر از کدام استفاده می‌کنند؛ اپلیکیشن می‌تواند با یکی شروع شود و دیگری بعداً اضافه شود.'],
      ),
      faq(
        ['Can the app work without internet?', 'Yes, where your work needs it: the app keeps working offline and sends everything once the connection is back.'],
        ['آیا اپلیکیشن بدون انترنت هم کار می‌کند؟', 'بلی، هر جا کار شما ضرورت داشته باشد: اپلیکیشن بدون انترنت هم کار می‌کند و وقتی انترنت وصل شد، همه‌چیز را می‌فرستد.'],
      ),
    ],
  },
  {
    id: 'desktop-software',
    slug: 'desktop-software',
    icon: 'Monitor',
    kind: 'desktop-software',
    title: tx('Desktop software', 'نرم‌افزار کمپیوتری'),
    description: tx(
      'Programs for Windows and Mac that run in your office — with or without internet.',
      'برنامه برای ویندوز و مک که در دفتر شما کار می‌کند؛ با انترنت یا بدون آن.',
    ),
    tagline: tx(
      'Software for the office, the shop or the clinic that keeps working even when the internet does not.',
      'نرم‌افزاری برای دفتر، دکان یا کلینیک که حتی وقتی انترنت قطع است، کار شما را متوقف نمی‌کند.',
    ),
    deliverables: [
      tx('For Windows and Mac', 'برای ویندوز و مک'),
      tx('Works without internet', 'بدون انترنت کار می‌کند'),
      tx('Several computers working on the same records', 'چند کمپیوتر روی یک معلومات مشترک کار می‌کنند'),
      tx('Printed receipts and reports', 'چاپ رسید و گزارش'),
      tx('Stays in step with your online system when connected', 'وقتی انترنت وصل شد، با سیستم آنلاین شما هماهنگ می‌شود'),
      tx('Installation, training and support', 'نصب، آموزش و پشتیبانی'),
    ],
    relatedProjectSlugs: ['artaveo-dental'],
    process: [
      step(
        ['A conversation', 'About your daily work and the computers you use.'],
        ['گفتگو', 'درباره‌ی کار روزمره‌ی شما و کمپیوترهایی که از آن‌ها استفاده می‌کنید.'],
      ),
      step(
        ['Design', 'You see the screens and approve them before they are built.'],
        ['طراحی', 'صفحه‌ها را پیش از ساخت می‌بینید و تأیید می‌کنید.'],
      ),
      step(
        ['Build and try it', 'You try each version on your own computers.'],
        ['ساخت و امتحان', 'هر نسخه را روی کمپیوترهای خودتان امتحان می‌کنید.'],
      ),
      step(
        ['Installation and training', 'Artaveo installs it, trains your staff and supports you afterwards.'],
        ['نصب و آموزش', 'آرتاویو آن را نصب می‌کند، کارمندان شما را آموزش می‌دهد و بعد از آن هم پشتیبانی می‌کند.'],
      ),
    ],
    faq: [
      faq(
        ['What happens when the internet goes down?', 'Nothing stops. Work carries on at the computer, and everything is shared once the connection is back.'],
        ['اگر انترنت قطع شود چه می‌شود؟', 'کار متوقف نمی‌شود. کار روی کمپیوتر ادامه پیدا می‌کند و وقتی انترنت وصل شد، همه‌چیز هماهنگ می‌شود.'],
      ),
      faq(
        ['Can it run on several computers?', 'Yes. Several computers in your office can work on the same records at the same time.'],
        ['آیا روی چند کمپیوتر کار می‌کند؟', 'بلی. چند کمپیوتر در دفتر شما می‌توانند هم‌زمان روی یک معلومات مشترک کار کنند.'],
      ),
    ],
  },
  {
    id: 'support',
    slug: 'support',
    icon: 'Wrench',
    kind: 'support',
    title: tx('Support & extension', 'پشتیبانی و توسعه'),
    description: tx(
      'Keep your software running and add what it is missing.',
      'نرم‌افزار شما را سرپا نگه می‌دارد و آنچه کم دارد را اضافه می‌کند.',
    ),
    tagline: tx(
      'For software you already have, whoever built it: fixes, new features, updates and help whenever you need it.',
      'برای نرم‌افزاری که همین حالا دارید، هر کسی آن را ساخته باشد: رفع مشکل، بخش‌های تازه، به‌روزرسانی و کمک هر وقت ضرورت داشتید.',
    ),
    deliverables: [
      tx('Problems in your current software fixed', 'رفع مشکل‌های نرم‌افزار فعلی شما'),
      tx('New features and pages', 'بخش‌ها و صفحه‌های تازه'),
      tx('Faster pages and a fresher look', 'صفحه‌های سریع‌تر و ظاهر تازه‌تر'),
      tx('Regular updates', 'به‌روزرسانی منظم'),
      tx('Monthly or yearly support', 'پشتیبانی ماهانه یا سالانه'),
      tx('A reply the same day when something goes wrong', 'جواب در همان روز، وقتی مشکلی پیش آید'),
    ],
    process: [
      step(
        ['A conversation', 'You describe what is wrong or what is missing.'],
        ['گفتگو', 'مشکل یا کمبود نرم‌افزار را برای آرتاویو توضیح می‌دهید.'],
      ),
      step(
        ['A review', 'Artaveo looks at your software and tells you what it takes.'],
        ['بررسی', 'آرتاویو نرم‌افزار شما را بررسی می‌کند و می‌گوید چه کاری لازم است.'],
      ),
      step(
        ['The work', 'Fixes and new parts are done, and you check them.'],
        ['انجام کار', 'مشکل‌ها رفع و بخش‌های تازه اضافه می‌شوند و شما آن‌ها را بررسی می‌کنید.'],
      ),
      step(
        ['Ongoing support', 'Monthly or yearly, as you choose.'],
        ['پشتیبانی دوامدار', 'ماهانه یا سالانه، هر طور که شما بخواهید.'],
      ),
    ],
    faq: [
      faq(
        ['Artaveo did not build our software. Can it still help?', 'Yes. Artaveo reviews it first, then tells you what can be fixed and what can be added.'],
        ['نرم‌افزار ما را آرتاویو نساخته است. باز هم کمک می‌کند؟', 'بلی. آرتاویو اول آن را بررسی می‌کند و بعد می‌گوید چه چیزهایی رفع و چه چیزهایی اضافه می‌شود.'],
      ),
      faq(
        ['How does monthly support work?', 'You agree on what it covers — updates, small changes, help — and pay monthly or yearly.'],
        ['پشتیبانی ماهانه چطور است؟', 'روی آنچه شامل آن است توافق می‌کنید (به‌روزرسانی، تغییرهای کوچک و کمک) و پول آن را ماهانه یا سالانه می‌پردازید.'],
      ),
    ],
  },
]


const engagementModelsData: EngagementModel[] = [
  engagementModel(
    'discovery-sprint',
    ['Discovery Sprint', 'Discovery Sprint'],
    ['New or unclear projects — the low-risk first step', 'پروژه‌های تازه یا نامشخص — اولین قدم کم‌ریسک'],
    ['Fixed price, fixed deliverable: scope, architecture outline, estimate', 'قیمت ثابت، خروجی ثابت: دامنه، طرح‌کلی معماری، برآورد'],
  ),
  engagementModel(
    'fixed-scope-project',
    ['Fixed-scope Project', 'پروژه‌ی دامنه‌ثابت'],
    ['Clear scope after discovery', 'دامنه‌ی روشن پس از Discovery'],
    ['Milestones', 'نقاط عطف'],
  ),
  engagementModel(
    'productized-service',
    ['Productized Service', 'خدمت محصول‌محور'],
    ['Standard needs matching a package', 'نیازهای استاندارد که با یک بسته همخوانی دارند'],
    ['Package price + add-ons', 'قیمت پکیج + افزونه‌ها'],
  ),
  engagementModel(
    'care-plan',
    ['Care Plan', 'برنامه‌ی نگهداری'],
    ['Live product needing ongoing care', 'محصول زنده‌ای که به مراقبت مستمر نیاز دارد'],
    ['Monthly', 'ماهانه'],
  ),
  engagementModel(
    'long-term-part-time',
    ['Long-term Part-time', 'بلندمدت پاره‌وقت'],
    ['Ongoing product development', 'توسعه‌ی مستمر محصول'],
    ['Monthly block of hours', 'بلوک ساعتی ماهانه'],
  ),
]

/**
 * Phase 12.2 (roadmap § 12): these three now read from the database — see
 * `lib/db/content-queries.ts` — instead of `servicesData`/
 * `engagementModelsData` above. The import into `content-queries.ts` is
 * dynamic (`await import(...)`), not a static top-level import, for a
 * concrete reason: `scripts/import-content-to-db.ts` loads this whole
 * file directly via Node (`--experimental-strip-types`), which cannot
 * resolve the `@/` path alias `content-queries.ts` would need — only
 * Next's bundler resolves that alias. A static import would break the
 * import script the moment this file loads, even though the script only
 * ever calls `getAllServicesRaw()`/`getEngagementModelsRaw()` below, never
 * these three. A dynamic import is only resolved when actually awaited,
 * so it never runs for the import script's use of this file.
 */

export async function getAllServices(): Promise<Service[]> {
  const { queryAllServices } = await import('@/lib/db/content-queries')
  return queryAllServices()
}

export async function getServiceBySlug(slug: string): Promise<Service | undefined> {
  const { queryServiceBySlug } = await import('@/lib/db/content-queries')
  return queryServiceBySlug(slug)
}

/** Phase 31.2 — the questions of "how working together goes" (payment, ownership, handover, changes, after launch). */
export async function getGlobalFaqs(): Promise<FaqItem[]> {
  const { queryGlobalFaqs } = await import('@/lib/db/content-queries')
  return queryGlobalFaqs()
}

export async function getEngagementModels(): Promise<EngagementModel[]> {
  const { queryEngagementModels } = await import('@/lib/db/content-queries')
  return queryEngagementModels()
}

/**
 * The raw, file-based arrays — for `scripts/import-content-to-db.ts` only.
 * Every page/component reads `getAllServices()`/`getServiceBySlug()`/
 * `getEngagementModels()` above (now database-backed), never these.
 */
export function getAllServicesRaw(): Service[] {
  return servicesData
}

export function getEngagementModelsRaw(): EngagementModel[] {
  return engagementModelsData
}
