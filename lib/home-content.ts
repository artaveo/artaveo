import type {
  ArticlePreview,
  Capability,
  DeveloperProfile,
  LocalizedText,
  Principle,
  ProcessStep,
  Project,
  TechCategory,
} from '@/types/content'

/**
 * Home page content.
 *
 * Local data for now, shaped like the database entities in `types/content.ts`
 * so it can be swapped for real queries later. Only real, verifiable facts
 * live here — no invented clients, metrics, dates or testimonials (§ 16.5).
 *
 * Every prose field is `{ en, fa }` (§ 3.2). Real Persian copy written in
 * Phase 5.1 (neutral / Dari-leaning vocabulary per D-03) — pages never read
 * these arrays directly, only through the selector functions at the bottom
 * of this file.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

const capabilitiesData: Capability[] = [
  {
    icon: 'Layers',
    title: tx('Full-stack development', 'توسعه‌ی فول‌استک'),
    description: tx(
      'Interface, API and database in one workflow.',
      'رابط کاربری، API و پایگاه داده در یک روند کاری واحد.',
    ),
  },
  {
    icon: 'Smartphone',
    title: tx('Responsive interfaces', 'رابط‌های واکنش‌گرا'),
    description: tx(
      'Designed for phones, desktops and everything between.',
      'طراحی‌شده برای موبایل، دسکتاپ و هرچیز بینابین.',
    ),
  },
  {
    icon: 'Boxes',
    title: tx('Modern architecture', 'معماری مدرن'),
    description: tx(
      'Clear boundaries between UI, logic and data.',
      'مرزهای شفاف میان رابط کاربری، منطق و داده.',
    ),
  },
  {
    icon: 'Gauge',
    title: tx('Performance', 'کارایی'),
    description: tx(
      'Fast loading and lean client-side code by default.',
      'بارگذاری سریع و کد سبک سمت کلاینت به‌صورت پیش‌فرض.',
    ),
  },
  {
    icon: 'Globe',
    title: tx('Remote collaboration', 'همکاری دورکار'),
    description: tx(
      'Async-friendly process with clear written updates.',
      'روندی سازگار با کار async، همراه با گزارش‌های نوشتاری روشن.',
    ),
  },
]

const featuredProjectsData: Project[] = [
  {
    id: 'transportation-system',
    slug: 'transportation-system',
    title: tx('Transportation System', 'سامانه‌ی حمل‌ونقل'),
    category: tx('Full-stack platform', 'پلتفرم فول‌استک'),
    summary: tx(
      'A booking and operations platform for intercity bus companies: passengers search trips and pick seats on a live seat map, while operators manage routes, buses, drivers and trips from a database-backed admin.',
      'پلتفرم رزرو و مدیریت عملیات برای شرکت‌های اتوبوس‌رانی بین‌شهری: مسافران سفرها را جستجو کرده و صندلی را روی نقشه‌ی زنده‌ی صندلی‌ها انتخاب می‌کنند، و اپراتورها مسیرها، ناوگان، رانندگان و سفرها را از یک پنل مدیریت متصل به پایگاه داده کنترل می‌کنند.',
    ),
    highlights: [
      tx(
        'Seat holds and booking confirmation are enforced on the server, never in the browser',
        'رزرو موقت صندلی و تأیید نهایی همیشه در سرور اجرا می‌شود، نه در مرورگر',
      ),
      tx(
        'Operations admin for routes, fleet, trips, bookings, reports and CSV exports',
        'پنل مدیریت عملیات برای مسیرها، ناوگان، سفرها، رزروها، گزارش‌ها و خروجی CSV',
      ),
      tx(
        'PostgreSQL row-level security combined with server-side authorization checks',
        'ترکیب row-level security در PostgreSQL با بررسی‌های سطح دسترسی سمت سرور',
      ),
    ],
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Supabase', 'Tailwind CSS'],
    status: 'in-development',
    githubUrl: 'https://github.com/artaveo/Transportation-System',
    role: tx(
      'Sole developer: architecture, database schema, frontend, backend and admin, planned and built end to end.',
      'توسعه‌دهنده‌ی یگانه: معماری، طرح پایگاه داده، فرانت‌اند، بک‌اند و پنل مدیریت، از ابتدا تا انتها برنامه‌ریزی و ساخته‌شده.',
    ),
    year: '2026',
    context: tx(
      'A booking and operations platform built for intercity bus companies in Afghanistan. The market runs on manual ticket counters and phone-based booking, with no shared system connecting passenger sales to fleet and trip operations. I built this as a real product bet: passengers get a live seat map and a bookable trip search, and operators get a database-backed admin for routes, fleet, drivers, trips and reporting — the two sides of the same booking, in one system.',
      'پلتفرمی برای رزرو و مدیریت عملیات شرکت‌های اتوبوس‌رانی بین‌شهری در افغانستان. این بازار هنوز عمدتاً با گیشه‌های فروش دستی و رزرو تلفنی اداره می‌شود، بدون هیچ سامانه‌ی مشترکی که فروش بلیت را به عملیات ناوگان و سفرها متصل کند. این پروژه را به‌عنوان یک محصول واقعی ساختم: مسافران نقشه‌ی زنده‌ی صندلی‌ها و جست‌وجوی سفر دارند، و اپراتورها یک پنل مدیریت متصل به پایگاه‌داده برای مسیرها، ناوگان، رانندگان، سفرها و گزارش‌ها — دو طرف یک رزرو، در یک سیستم واحد.',
    ),
    problemAndGoals: tx(
      "The core problem: seat availability and payment status are business-critical state that a booking site cannot let the browser decide. If two people can claim the same seat, or a cancelled booking can silently keep its payment marked as taken, the platform is unusable for a real operator. The goal was a passenger booking flow and an operations admin where every sensitive decision — holding a seat, confirming a booking, changing a payment's status — is made and enforced by the database, not the UI.",
      'مسئله‌ی اصلی این بود: در دسترس بودن صندلی و وضعیت پرداخت، داده‌ی حیاتیِ کسب‌وکار هستند که نباید تصمیم‌گیری‌شان به مرورگر سپرده شود. اگر دو نفر بتوانند یک صندلی را هم‌زمان بگیرند، یا رزروی که لغو شده هنوز پرداختش «گرفته‌شده» ثبت بماند، سامانه برای یک اپراتور واقعی قابل‌استفاده نیست. هدف این بود که در مسیر رزرو مسافر و پنل عملیات، هر تصمیم حساس — نگه‌داشتن موقت صندلی، تأیید رزرو، تغییر وضعیت پرداخت — توسط پایگاه‌داده گرفته و اجرا شود، نه توسط رابط کاربری.',
    ),
    constraints: [
      tx(
        'Solo developer — architecture, schema, frontend, backend and admin all planned and built by one person, so decisions were scoped to what could be verified and maintained alone.',
        'توسعه‌دهنده‌ی یگانه — معماری، طرح پایگاه‌داده، فرانت‌اند، بک‌اند و پنل مدیریت همه توسط یک نفر برنامه‌ریزی و ساخته شده، پس تصمیم‌ها به چیزی محدود ماندند که یک نفر بتواند به‌تنهایی اعتبارسنجی و نگهداری کند.',
      ),
      tx(
        "No live payment provider yet: HesabPay (the target gateway) integration is blocked on getting developer/sandbox credentials from the provider — an external dependency outside my control, not a technical gap.",
        'هنوز هیچ درگاه پرداخت زنده‌ای وصل نیست: اتصال حساب‌پی (درگاه هدف) روی دریافت اطلاعات دولوپر/sandbox از خودِ حساب‌پی بلاک است — یک وابستگی بیرونی، نه یک خلأ فنی.',
      ),
      tx(
        'Built for a bilingual Dari/English market with RTL as the primary reading direction, not an English-first product with translation bolted on.',
        'این پروژه برای یک بازار دوزبانه‌ی دری/انگلیسی با RTL به‌عنوان جهت اصلی خواندن ساخته شده، نه یک محصول انگلیسی‌محور که بعداً ترجمه شده باشد.',
      ),
      tx(
        "No dedicated QA or security team — security review relies on Supabase's own advisory tooling plus manual verification against a rolled-back transaction on real data before any migration ships.",
        'تیم اختصاصی QA یا امنیت وجود ندارد — بررسی امنیتی روی ابزار advisory خودِ Supabase به‌علاوه اعتبارسنجی دستی روی داده‌ی واقعی (در تراکنشی که در پایان rollback می‌شود) پیش از هر migration انجام می‌گیرد.',
      ),
    ],
    architecture: tx(
      'Next.js (App Router) talks to PostgreSQL through Supabase for both the passenger app and the operations admin. Supabase Auth handles sessions; every privileged read or write additionally passes through PostgreSQL Row-Level Security plus explicit server-side authorization checks — a service-role client is never treated as an authorization decision by itself. Seat availability follows a strict state machine (available → held → booked, with holds expiring back to available), and payment status follows its own database-enforced state machine. The browser only ever displays state; it never originates it.',
      'فرانت‌اند Next.js (App Router) برای هم مسیر مسافر و هم پنل عملیات، از طریق Supabase با PostgreSQL صحبت می‌کند. نشست‌ها با Supabase Auth مدیریت می‌شوند؛ هر خواندن یا نوشتنِ حساس، علاوه بر آن، از Row-Level Security در PostgreSQL و بررسی صریح دسترسی در سمت سرور هم عبور می‌کند — صرفِ داشتن کلاینت service-role هرگز به‌تنهایی یک تصمیم دسترسی حساب نمی‌شود. در دسترس‌بودن صندلی از یک state machine دقیق پیروی می‌کند (available → held → booked، با انقضای نگه‌داشت‌ها به available)، و وضعیت پرداخت هم state machine مستقل خودش را دارد. مرورگر فقط وضعیت را نمایش می‌دهد، هرگز آن را تولید نمی‌کند.',
    ),
    keyDecisions: [
      {
        context: tx(
          'A payment could move between statuses (pending, confirmed, refunded, failed) through direct database writes, since admins already had write access to the payments table from an earlier phase.',
          'پرداخت می‌توانست از طریق نوشتن مستقیم روی جدول، بین وضعیت‌ها (pending، confirmed، refunded، failed) جابه‌جا شود، چون ادمین‌ها از یک فاز قبلی‌تر، از قبل دسترسی نوشتن روی جدول payments داشتند.',
        ),
        decision: tx(
          'Added a database trigger that enforces the payment state machine at the row level — only pending→confirmed, pending→failed, and confirmed→refunded are allowed, rejected even on a direct UPDATE, not just through the app\'s own functions.',
          'یک تریگر سطح دیتابیس اضافه شد که state machine پرداخت را در سطح ردیف اجرا می‌کند — فقط pending→confirmed، pending→failed، و confirmed→refunded مجازند، حتی روی یک UPDATE مستقیم رد می‌شوند، نه فقط از مسیر توابع خودِ اپلیکیشن.',
        ),
        tradeoff: tx(
          "Any future legitimate transition (e.g. a failed retry) needs an explicit trigger change, not just an app-side code change — more friction, but the state can no longer drift silently.",
          'هر گذار مشروع تازه در آینده (مثلاً تلاش دوباره روی failed) نیاز به تغییر صریح تریگر دارد، نه فقط تغییر کد اپ — اصطکاک بیشتر، اما وضعیت دیگر نمی‌تواند بی‌سروصدا منحرف شود.',
        ),
      },
      {
        context: tx(
          'Partial refunds needed to release any coupon used on the booking, but wallet balance was also in scope for "what should a refund touch."',
          'بازپرداخت جزئی باید کوپن استفاده‌شده روی رزرو را آزاد می‌کرد، ولی موجودی wallet هم در محدوده‌ی «بازپرداخت باید چه چیزهایی را برگرداند» بود.',
        ),
        decision: tx(
          'Checked real data before writing any logic — every existing booking had a zero wallet deduction, because wallet debiting was never wired into the booking-confirmation path in the first place. Built coupon release only; left wallet refund logic undone rather than building a return path for money that was never actually taken.',
          'قبل از نوشتن هر منطقی، داده‌ی واقعی چک شد — همه‌ی رزروهای موجود کسر wallet صفر داشتند، چون خودِ کسر از wallet هیچ‌وقت در مسیر تأیید رزرو wire نشده بود. فقط آزادسازی کوپن ساخته شد؛ منطق بازگرداندن wallet عمداً ساخته‌نشده ماند، به‌جای ساختن یک مسیر بازگشتِ پولی که هیچ‌وقت واقعاً گرفته نشده بود.',
        ),
        tradeoff: tx(
          'The refund feature is incomplete until wallet debiting ships — documented as open debt rather than papered over with unused code.',
          'فیچر بازپرداخت تا زمانی که کسر از wallet ساخته شود ناقص می‌ماند — این به‌عنوان بدهی باز مستند شد، نه با کدی بلااستفاده پنهان.',
        ),
      },
    ],
    engineeringHighlight: tx(
      "While building the refund path, a security review with Supabase's advisory tooling turned up a real gap: the function that writes to the payment audit-trail table was callable directly by any authenticated (or even anonymous) client, with no permission check of its own — because it was only ever meant to be called internally, from inside other trusted functions. That meant anyone could have written fake entries into the audit history and undermined the one table meant to make payment changes reviewable. I revoked execute permission on that function from every role except its owner, then re-verified with a direct privilege check — not just the advisory tool — that only trusted internal callers could reach it. The same review also caught a real functional bug: an admin could \"cancel\" a booking whose payment was already confirmed, leaving the booking cancelled but the payment still marked as taken — money in, booking gone. I closed that path with an explicit error and routed it through the new refund function instead, so a paid booking can only be unwound by actually refunding it.",
      'در حین ساخت مسیر بازپرداخت، یک بررسی امنیتی با ابزار advisory خودِ Supabase یک خلأ واقعی را نشان داد: تابعی که در جدول تاریخچه‌ی پرداخت‌ها می‌نوشت، بدون هیچ چک دسترسی مستقلی، مستقیماً توسط هر کلاینتِ احراز‌هویت‌شده (حتی مهمان) قابل‌فراخوانی بود — چون قرار بود فقط از داخل توابع مورد‌اعتماد دیگر صدا زده شود. این یعنی هرکسی می‌توانست رویدادهای جعلی در تاریخچه‌ی audit بنویسد و کل ارزش تنها جدولی که قرار بود تغییرات پرداخت را قابل‌بازبینی کند، از بین ببرد. دسترسی اجرای آن تابع از همه‌ی نقش‌ها جز مالکش سلب شد، و بعد با یک بررسی مستقیم سطح دسترسی — نه فقط ابزار advisory — تأیید شد که فقط فراخوان‌های داخلیِ مورد‌اعتماد به آن دسترسی دارند. همین بررسی یک باگ واقعی دیگر را هم پیدا کرد: ادمین می‌توانست رزروی را که پرداختش قبلاً تأیید شده بود «لغو» کند، در حالی که رزرو لغو می‌شد ولی پرداخت همچنان «دریافت‌شده» می‌ماند — پول گرفته‌شده، رزرو حذف‌شده. این مسیر با یک خطای صریح بسته شد و به‌جایش از تابع تازه‌ی بازپرداخت عبور می‌کند، پس یک رزروِ پرداخت‌شده فقط با بازپرداختِ واقعی قابل‌لغو است.',
    ),
    dataIntegrityAndSecurity: tx(
      "PostgreSQL Row-Level Security is applied to every business table, paired with server-side authorization checks rather than relied on alone. A database trigger enforces the payment state machine at the row level, closing off direct-UPDATE bypasses, and a dedicated payment_status_events audit trail — writable only through one internal function — gives every payment status change a reviewable history of who changed what, when and why. Limited admins work through a permission-center model where access is scoped per section (bookings, payments, etc.) rather than all-or-nothing. Security reviews combine Supabase's advisory tooling with direct privilege checks rather than trusting the advisory output alone.",
      'Row-Level Security در PostgreSQL روی هر جدول کسب‌وکاری اعمال شده، همراه با بررسی دسترسی سمت سرور، نه صرفاً تکیه بر آن به‌تنهایی. یک تریگر دیتابیس، state machine پرداخت را در سطح ردیف اجرا می‌کند و مسیر دورزدن از طریق UPDATE مستقیم را می‌بندد، و جدول اختصاصی payment_status_events — که فقط از طریق یک تابع داخلی قابل‌نوشتن است — به هر تغییر وضعیت پرداخت یک تاریخچه‌ی قابل‌بازبینی از این‌که چه‌کسی، چه‌زمانی و چرا تغییرش داده می‌دهد. ادمین‌های محدود از طریق یک مدل مرکز دسترسی کار می‌کنند که در آن دسترسی به‌ازای هر بخش (رزروها، پرداخت‌ها و…) مشخص می‌شود، نه همه‌یا‌هیچ. بررسی‌های امنیتی هم ابزار advisory خودِ Supabase و هم چک مستقیم دسترسی را ترکیب می‌کنند، نه اتکای صرف به خروجی ابزار advisory.',
    ),
    responsiveAndRtl: tx(
      'Built with five responsive tiers from mobile (under 768px) through ultra-wide (2560px and up), covering both the passenger booking flow and the admin\'s wide data tables. RTL/LTR behaviour is treated as a layout requirement from the start (Dari/English), not a late pass — including RTL-aware admin navigation and wide-table handling.',
      'با پنج سطح واکنش‌گرا از موبایل (کمتر از ۷۶۸ پیکسل) تا فوق‌عریض (۲۵۶۰ پیکسل به بالا) ساخته شده، هم برای مسیر رزرو مسافر و هم جدول‌های عریض پنل ادمین. رفتار RTL/LTR (دری/انگلیسی) از همان ابتدا یک نیاز معماری بوده، نه یک پاس اضافه در پایان — شامل ناوبری ادمین سازگار با RTL و مدیریت جدول‌های عریض.',
    ),
    quality: tx(
      'Every migration is validated against real production data inside a transaction that is rolled back afterward, never tested only in theory. tsc --noEmit and a full next build run after each phase; the project tracks a known TypeScript baseline error count so new errors are never silently absorbed into "pre-existing" noise. Security posture is re-checked after schema changes with Supabase\'s advisory tooling and direct privilege queries. There is no dedicated automated test suite or CI pipeline yet — tracked explicitly as debt, not hidden.',
      'هر migration روی داده‌ی واقعیِ تولید، داخل تراکنشی که در پایان rollback می‌شود، اعتبارسنجی می‌شود — هرگز فقط در تئوری تست نشده. tsc --noEmit و یک next build کامل بعد از هر فاز اجرا می‌شود؛ پروژه یک شمارش پایه‌ی شناخته‌شده از خطاهای TypeScript موجود را ردیابی می‌کند تا خطای تازه هیچ‌وقت بی‌صدا داخل نویزِ «از قبل بوده» گم نشود. وضعیت امنیتی بعد از هر تغییر schema با ابزار advisory Supabase و کوئری مستقیم سطح دسترسی دوباره چک می‌شود. هنوز هیچ مجموعه‌ی تست خودکار اختصاصی یا پایپ‌لاین CI وجود ندارد — این به‌صراحت به‌عنوان بدهی ثبت شده، نه پنهان‌شده.',
    ),
    currentStatusAndNext: tx(
      'Finished: passenger booking with server-enforced seat holds, operations admin (routes, fleet, drivers, trips, bookings, reports, CSV), loyalty and coupon foundations, a public CMS lite with in-site responsive image cropping, and a full payment-status state machine with audit trail and partial refunds — all running on manual/offline payment confirmation. Not finished: a live payment gateway. HesabPay integration is the next planned step and is blocked on getting developer/sandbox credentials from the provider — until that\'s resolved, online bookings are recorded but stay in a pending payment state rather than auto-confirming.',
      'انجام‌شده: رزرو مسافر با نگه‌داشت صندلی که سمت سرور اجرا می‌شود، پنل عملیات (مسیرها، ناوگان، رانندگان، سفرها، رزروها، گزارش‌ها، CSV)، پایه‌های loyalty و کوپن، یک CMS lite عمومی با کراپ تصویر واکنش‌گرای درون‌سایتی، و یک state machine کامل برای وضعیت پرداخت همراه با تاریخچه‌ی audit و بازپرداخت جزئی — همه روی تأیید دستی/آفلاینِ پرداخت. انجام‌نشده: درگاه پرداخت زنده. اتصال حساب‌پی گام بعدی برنامه‌ریزی‌شده است و روی دریافت اطلاعات دولوپر/sandbox از خودِ حساب‌پی بلاک مانده — تا حل آن، رزروهای آنلاین ثبت می‌شوند اما در وضعیت پرداختِ در‌انتظار می‌مانند، نه تأیید خودکار.',
    ),
    lessonsLearned: tx(
      'The most valuable finding in this phase wasn\'t a new feature — it was what a security review turned up in code that already shipped: a function with no permission check of its own, reachable because it was assumed to only ever be called from trusted places. Assumptions about "who calls this" are not access control. I now treat every database function as if it will be called directly by an untrusted client, and check that assumption explicitly rather than inferring it from how the function is currently used in the app.',
      'ارزشمندترین یافته‌ی این فاز یک فیچر تازه نبود — چیزی بود که یک بررسی امنیتی در کدی که از قبل منتشر شده بود پیدا کرد: تابعی بدون هیچ چک دسترسی مستقل، قابل‌دسترس چون فرض شده بود فقط از جاهای مورد‌اعتماد صدا زده می‌شود. فرض «چه‌کسی این را صدا می‌زند» کنترل دسترسی نیست. اکنون با هر تابع دیتابیس طوری رفتار می‌کنم که انگار مستقیماً توسط یک کلاینت غیرقابل‌اعتماد فراخوانی خواهد شد، و این فرض را صریحاً چک می‌کنم، نه از روی نحوه‌ی استفاده‌ی فعلی تابع در اپ حدس می‌زنم.',
    ),
    featured: true,
    published: true,
  },
  {
    id: 'pazhuhesh-portal',
    slug: 'pazhuhesh-portal',
    title: tx('Pezhohesh Complex Portal', 'پورتال مجتمع پژوهش'),
    category: tx('Web application', 'اپلیکیشن وب'),
    summary: tx(
      'A bilingual Dari and English portal for a student community — study lounge, academic advising, scholarships and achievements — run through a custom CMS that non-developers can manage safely.',
      'پورتالی دوزبانه (دری و انگلیسی) برای یک جامعه‌ی دانشجویی — سالن مطالعه، مشاوره‌ی تحصیلی، بورسیه‌ها و دستاوردها — که از طریق یک CMS اختصاصی و امن، حتی توسط افراد غیرتوسعه‌دهنده هم قابل مدیریت است.',
    ),
    highlights: [
      tx(
        'Two admin roles with role-based routing and permissions scoped per department',
        'دو نقش مدیریتی با مسیریابی بر پایه‌ی نقش و سطح دسترسی مشخص برای هر بخش',
      ),
      tx(
        'Offline-first data layer and an installable PWA with tuned caching per data type',
        'لایه‌ی داده‌ی offline-first و یک PWA نصب‌شدنی با cache تنظیم‌شده برای هر نوع داده',
      ),
      tx(
        'RTL-native interface with persisted theme and language preferences',
        'رابط کاربری بومی RTL با ذخیره‌سازی پایدار تنظیمات تم و زبان',
      ),
    ],
    technologies: ['React', 'Vite', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'PWA'],
    status: 'live',
    githubUrl: 'https://github.com/artaveo/pezhohesh-portal',
    role: tx(
      'Sole developer: architecture, database schema, frontend, backend and admin, planned and built end to end.',
      'توسعه‌دهنده‌ی یگانه: معماری، طرح پایگاه داده، فرانت‌اند، بک‌اند و پنل مدیریت، از ابتدا تا انتها برنامه‌ریزی و ساخته‌شده.',
    ),
    year: '2026',
    context: tx(
      'A bilingual Dari/English portal I built for Pezhohesh Complex, an educational institute I run myself — a study lounge, academic advising, scholarship listings and student achievements, all manageable by non-developer staff through a custom admin panel.',
      'پورتالی دوزبانه (دری/انگلیسی) که برای مجتمع پژوهش ساختم — مؤسسه‌ای آموزشی که خودم اداره‌اش می‌کنم — شامل سالن مطالعه، مشاوره‌ی تحصیلی، بورسیه‌های فعال و دستاوردهای دانشجویی، همه از طریق یک پنل ادمین اختصاصی که کارکنانِ غیرتوسعه‌دهنده هم می‌توانند مدیریتش کنند.',
    ),
    problemAndGoals: tx(
      "The institute needed a real content pipeline, not a static site someone has to ask a developer to update. Staff needed to publish scholarships, edit study-lounge rules, and review membership/advising requests themselves — with two different levels of access, since not everyone should be able to touch every part of the site. On top of that, visitors on unreliable connections needed pages they'd already seen to keep working, without the admin panel ever risking a stale view of pending requests.",
      'مؤسسه به یک content pipeline واقعی نیاز داشت، نه یک سایت استاتیک که هر بار برای آپدیت باید سراغ یه توسعه‌دهنده رفت. کارکنان باید می‌توانستند خودشان بورسیه منتشر کنند، قوانین سالن مطالعه را ویرایش کنند، و درخواست‌های عضویت/مشاوره را بررسی کنند — با دو سطح دسترسی متفاوت، چون قرار نبود همه بتوانند همه‌جای سایت را دست بزنند. علاوه بر این، بازدیدکننده‌هایی که اتصال اینترنت ناپایدار دارند باید صفحاتی که قبلاً دیده‌اند همچنان کار کند، بدون این‌که پنل ادمین هیچ‌وقت ریسک دیدن یک نسخه‌ی قدیمیِ درخواست‌های در‌انتظار را داشته باشد.',
    ),
    constraints: [
      tx(
        'Solo developer, built for an institute I run myself — real content and real staff, not a demo dataset.',
        'توسعه‌دهنده‌ی یگانه، برای مؤسسه‌ای که خودم اداره می‌کنم — محتوا و کارکنان واقعی، نه دیتای دمو.',
      ),
      tx(
        "Deployed by building locally and uploading the production bundle directly, not a Git-triggered CI/CD pipeline — a deliberate simplicity trade-off for a small, single-maintainer project.",
        'استقرار با build محلی و آپلود مستقیم خروجی نهایی انجام می‌شود، نه یک پایپ‌لاین CI/CD متصل به Git — یک تصمیم آگاهانه برای سادگی، مناسب یک پروژه‌ی کوچک با یک نگهدارنده.',
      ),
      tx(
        'Admin panel is Dari-only by design; the public site is bilingual.',
        'پنل ادمین عمداً فقط دری است؛ سایت عمومی دوزبانه است.',
      ),
      tx(
        "Not a service-worker specialist, so the PWA caching strategy was deliberately built with Workbox's declarative routing rather than a hand-written fetch handler — simpler and lower-risk to maintain alone, at the cost of less fine-grained control if a future need arises.",
        'چون متخصص service worker نیستم، استراتژی کش PWA عمداً با routing اعلانی Workbox ساخته شد، نه یک fetch handler دستی — ساده‌تر و کم‌ریسک‌تر برای نگهداری تنها توسط خودم، با هزینه‌ی کنترل کمتر اگر نیاز دقیق‌تری در آینده پیش بیاید.',
      ),
    ],
    architecture: tx(
      'A React/Vite single-page app backed by Supabase (PostgreSQL, Storage, Edge Functions). A single shared data-fetch function feeds both the public site and the admin dashboard — one source of truth instead of two parallel read paths that could drift. Role-based routing enforces which of the two admin experiences a signed-in admin can reach. Content follows a recurring "seed + admin list" pattern: sensible built-in defaults (rules, FAQs) stay editable rather than being silently overwritten by admin changes.',
      'یک اپلیکیشن تک‌صفحه‌ای (SPA) با React/Vite که روی Supabase (PostgreSQL، Storage، Edge Functions) سوار است. یک تابع واحد و مشترک برای خواندن داده هم سایت عمومی و هم داشبورد ادمین را تغذیه می‌کند — یک منبع حقیقت واحد، به‌جای دو مسیر خواندن موازی که ممکن است از هم فاصله بگیرند. مسیریابی بر پایه‌ی نقش مشخص می‌کند یک ادمینِ واردشده به کدام‌یک از دو تجربه‌ی ادمین دسترسی دارد. محتوا از یک الگوی تکرارشونده‌ی «پیش‌فرض + فهرست ادمین» پیروی می‌کند: پیش‌فرض‌های داخلی معقول (قوانین، سوالات متداول) قابل‌ویرایش می‌مانند، نه این‌که با تغییرات ادمین بی‌صدا بازنویسی شوند.',
    ),
    keyDecisions: [
      {
        context: tx(
          'The PWA needed offline access to previously visited pages, but the admin panel must never show stale data — a pending request that was already approved must not reappear after a refresh.',
          'PWA باید دسترسی آفلاین به صفحات قبلاً دیده‌شده را می‌داشت، ولی پنل ادمین هرگز نباید دیتای قدیمی نشان بدهد — یک درخواست در‌انتظار که قبلاً تأیید شده، نباید بعد از رفرش دوباره ظاهر شود.',
        ),
        decision: tx(
          "The service worker's navigation fallback (the offline \"app shell\") explicitly excludes every admin route, and no runtime-caching rule was written for the Supabase calls the admin panel depends on — so those requests are never intercepted by the cache layer at all, online or offline.",
          'navigation fallback سرویس‌ورکر (یعنی «پوسته‌ی آفلاین») به‌طور صریح هر مسیر ادمین را مستثنی می‌کند، و هیچ runtime-caching rule ای برای فراخوانی‌های Supabase که پنل ادمین به آن‌ها وابسته است نوشته نشد — پس این درخواست‌ها اصلاً هیچ‌وقت، چه آنلاین چه آفلاین، توسط لایه‌ی کش رهگیری نمی‌شوند.',
        ),
        tradeoff: tx(
          'If an admin genuinely loses connection, they see a normal browser connection error instead of a safe-but-confusing cached shell — chosen deliberately over silently serving anything that could be mistaken for live data.',
          'اگر ادمین واقعاً اتصالش قطع شود، خطای معمولی مرورگر را می‌بیند به‌جای یک پوسته‌ی کش‌شده (بی‌خطر ولی گیج‌کننده) — این آگاهانه انتخاب شد به‌جای سرو کردن بی‌صدای چیزی که ممکن است با دیتای زنده اشتباه گرفته شود.',
        ),
      },
      {
        context: tx(
          "Portal content already had a localStorage-backed stale-while-revalidate layer built in — show the local copy instantly, refresh from the database in the background.",
          'محتوای پورتال از قبل یک لایه‌ی stale-while-revalidate مبتنی بر localStorage داشت — نمایش فوری نسخه‌ی محلی، به‌روزرسانی از دیتابیس در پس‌زمینه.',
        ),
        decision: tx(
          'Deliberately did not add a service-worker caching rule on top of that for the same data, since it would duplicate a stale-while-revalidate behaviour that already existed, with no added benefit and one more layer to keep in sync.',
          'عمداً یک runtime-caching rule تازه روی همان داده اضافه نشد، چون همان رفتار stale-while-revalidate را که از قبل وجود داشت تکرار می‌کرد، بدون فایده‌ی اضافه و با یک لایه‌ی بیشتر برای هماهنگ‌نگه‌داشتن.',
        ),
        tradeoff: tx(
          'Only uploaded images get a cache-first rule with an expiration cap, oldest purged first — a narrower caching surface than "cache everything," but each caching decision maps to a specific, understood need rather than a blanket policy.',
          'فقط عکس‌های آپلودشده یک قانون کش با سقف انقضا می‌گیرند، قدیمی‌ترین اول پاک می‌شود — سطح کشِ محدودتر از «همه‌چیز را کش کن»، ولی هر تصمیم کش دقیقاً به یک نیاز مشخص و فهمیده‌شده نگاشت می‌شود، نه یک سیاست یکسان برای همه.',
        ),
      },
    ],
    engineeringHighlight: tx(
      'The hardest problem wasn\'t making the PWA work offline — it was deciding what should not be cached. Three different kinds of data live behind the same Supabase project: public portal content, admin-only pending requests, and uploaded images. Caching all of it the same way would have been simpler to write but would have risked an admin seeing an approved request as still pending, or a public visitor seeing week-old scholarship data as current. Instead, each data type got its own rule: public content relies on the existing localStorage layer, admin routes are excluded from the cache entirely at the navigation level, and only uploaded images get real HTTP caching with an expiration policy. The Department Admin role required the same "narrower than it looks" thinking on the database side: a fail-closed allow-list defines exactly which settings keys a scoped admin can write, so a new field added to that panel later is denied by default until it\'s explicitly added to the list — not silently allowed.',
      'سخت‌ترین بخش کار نه ساختن یک PWA آفلاین، بلکه تصمیم‌گیری درباره‌ی این بود که چه چیزی نباید کش شود. سه نوع داده‌ی متفاوت پشت یک پروژه‌ی Supabase یکسان زندگی می‌کنند: محتوای عمومی پورتال، درخواست‌های در‌انتظارِ فقط-ادمین، و تصاویر آپلودشده. کش‌کردن همه‌ی این‌ها به یک شکل، نوشتنش ساده‌تر بود ولی این ریسک را داشت که یک ادمین درخواستی را که قبلاً تأیید شده، همچنان «در‌انتظار» ببیند، یا یک بازدیدکننده‌ی عمومی دیتای بورسیه‌ی یک‌هفته‌پیش را به‌عنوان دیتای امروز ببیند. به‌جایش، هر نوع داده قانون خودش را گرفت: محتوای عمومی روی همان لایه‌ی localStorage موجود تکیه می‌کند، مسیرهای ادمین کلاً از سطح navigation از کش مستثنی هستند، و فقط تصاویر آپلودشده کش واقعی HTTP با سیاست انقضا می‌گیرند. نقش Department Admin هم همین طرز فکر «محدودتر از ظاهرش» را در سطح دیتابیس نیاز داشت: یک allow-list fail-closed دقیقاً مشخص می‌کند کدام کلیدهای تنظیمات برای یک ادمین محدود قابل‌نوشتن‌اند، پس یک فیلد تازه که بعداً به آن پنل اضافه شود به‌طور پیش‌فرض رد می‌شود تا زمانی که صریحاً به لیست اضافه شود — نه این‌که بی‌صدا مجاز باشد.',
    ),
    dataIntegrityAndSecurity: tx(
      'Two admin roles are enforced with a database-level check constraint, not just an app-side assumption. Department-scoped writes go through a fail-closed allow-list function — an unlisted settings key is denied by default, not silently accepted, if the admin panel grows later. Row-Level Security policies scope what each role can read and write, and portal request submissions go through a server-side, rate-limited Supabase Edge Function rather than an unthrottled client-side insert.',
      'دو نقش ادمین با یک check constraint در سطح دیتابیس اجرا می‌شوند، نه فقط یک فرض در سمت اپ. نوشتن‌های محدود به یک بخش، از یک تابع allow-list با رویکرد fail-closed استفاده می‌کنند — کلید فهرست‌نشده رد می‌شود، نه بی‌صدا پذیرفته، اگر پنل ادمین بعداً بزرگ‌تر شود. سیاست‌های Row-Level Security مشخص می‌کنند هر نقش چه چیزی را می‌تواند بخواند و بنویسد، و ارسال درخواست‌های پورتال از یک Supabase Edge Function با محدودیت نرخ درخواست در سمت سرور عبور می‌کند، نه یک insert بی‌محدودیت مستقیم از کلاینت.',
    ),
    responsiveAndRtl: tx(
      'RTL-first from the ground up — logical layout properties and perceptually uniform color tokens rather than an LTR layout patched with a right-to-left flag. Dari is the default language; English is available via a language-preference prompt shown once to first-time visitors.',
      'RTL از پایه و اول — با استفاده از ویژگی‌های چیدمان منطقی و توکن‌های رنگِ یکنواختِ ادراکی، نه یک چیدمان LTR که بعداً با پرچم راست‌به‌چپ وصله شده باشد. دری زبان پیش‌فرض است؛ انگلیسی از طریق یک پیام یک‌باره‌ی انتخاب زبان به بازدیدکننده‌های تازه در دسترس است.',
    ),
    quality: tx(
      'The caching strategy was verified with a real production build and preview, not just in the dev server, since the service worker is intentionally disabled in development. Fail-closed permission checks — deny by default, allow explicitly — are used for the Department Admin role, rather than a broader access pattern that would need remembering to lock down later. There is no dedicated automated test suite or CI/CD pipeline — deployment is a manual local build and upload, tracked here as a real limitation for a single-maintainer project rather than hidden as if a pipeline exists.',
      'استراتژی کش با یک build واقعی تولید و preview اعتبارسنجی شد، نه فقط در سرور توسعه، چون سرویس‌ورکر عمداً در حالت توسعه غیرفعال است. برای نقش Department Admin از چک دسترسی fail-closed (پیش‌فرض رد، مجاز فقط با تصریح) استفاده شد، نه یک الگوی دسترسی گسترده‌تر که بعداً باید یادت می‌ماند محدودش کنی. هیچ مجموعه‌ی تست خودکار اختصاصی یا پایپ‌لاین CI/CD وجود ندارد — استقرار یک build محلی دستی و آپلود است، اینجا به‌عنوان یک محدودیت واقعیِ یک پروژه‌ی تک‌نگهدارنده ثبت شده، نه پنهان‌شده طوری که انگار پایپ‌لاینی وجود دارد.',
    ),
    currentStatusAndNext: tx(
      'Finished: bilingual public portal, dual-role admin CMS, offline-first data layer, installable PWA with per-data-type caching, rate-limited request submissions. Per the project\'s own admin-panel roadmap, the next planned stages are richer content management, a full scholarship model with status, search and filtering, and operations/security work — user roles and audit logging, media uploads, notifications, backup, and a move off the current local-file content source toward the database as the sole source of truth.',
      'انجام‌شده: پورتال عمومی دوزبانه، CMS ادمین دو-نقشی، لایه‌ی داده‌ی offline-first، PWA نصب‌شدنی با کش تنظیم‌شده به‌ازای هر نوع داده، و ارسال درخواست‌های با محدودیت نرخ. طبق خودِ نقشه‌ی توسعه‌ی پنل ادمین این پروژه، مراحل بعدیِ برنامه‌ریزی‌شده عبارت‌اند از مدیریت محتوای غنی‌تر، مدل کامل بورسیه با وضعیت/جست‌وجو/فیلتر، و کارهای عملیات/امنیت — نقش‌های کاربری و ثبت رویداد، بارگذاری رسانه، اعلان‌ها، پشتیبان‌گیری، و انتقال از منبع فعلیِ فایل محلی به دیتابیس به‌عنوان تنها منبع حقیقت.',
    ),
    lessonsLearned: tx(
      "Building an offline-first PWA taught me that the interesting design work isn't \"add a service worker\" — it's deciding, data type by data type, whether caching helps or actively creates a correctness risk. The instinct to cache everything for a snappier offline experience would have been wrong for at least two of the three data types in this project. I now start every caching decision by asking what happens if this specific piece of data is stale, rather than applying one caching policy to the whole app.",
      'ساختن یک PWA آفلاین‌فرست به من یاد داد که کار طراحیِ جالب «اضافه‌کردن یک سرویس‌ورکر» نیست — تصمیم‌گیری است، نوع‌به‌نوع داده، درباره‌ی این‌که کش‌کردن کمک می‌کند یا فعالانه یک ریسک صحت‌داده می‌سازد. غریزه‌ی «همه‌چیز را برای تجربه‌ی آفلاینِ سریع‌تر کش کن» برای دست‌کم دو تا از سه نوع داده‌ی این پروژه اشتباه از آب درمی‌آمد. الان هر تصمیم کش را با این سؤال شروع می‌کنم که اگر این تکه‌ی مشخص از داده قدیمی باشد چه اتفاقی می‌افتد، نه با اعمال یک سیاست کش یکسان روی کل اپ.',
    ),
    featured: true,
    published: true,
  },
]

/** The single delivery chain Artaveo covers end to end. */
const workflowStagesData: LocalizedText[] = [
  tx('Idea', 'ایده'),
  tx('Architecture', 'معماری'),
  tx('Interface', 'رابط کاربری'),
  tx('Frontend', 'فرانت‌اند'),
  tx('Backend', 'بک‌اند'),
  tx('Database', 'پایگاه داده'),
  tx('Deployment', 'استقرار'),
]

const differentiatorsData: Principle[] = [
  {
    icon: 'MessagesSquare',
    title: tx('Direct communication', 'ارتباط مستقیم'),
    description: tx(
      'You talk to the person designing and writing the code. Nothing gets lost between account managers and subcontractors.',
      'مستقیم با کسی صحبت می‌کنی که کد را طراحی و اجرا می‌کند. چیزی میان مدیر حساب و پیمانکار فرعی گم نمی‌شود.',
    ),
  },
  {
    icon: 'Workflow',
    title: tx('End-to-end ownership', 'مالکیت سرتاسری'),
    description: tx(
      'Architecture, interface, backend and deployment happen in one workflow, so nothing falls between handoffs.',
      'معماری، رابط کاربری، بک‌اند و استقرار در یک روند کاری واحد انجام می‌شوند، پس چیزی میان تحویل‌گیری‌ها گم نمی‌شود.',
    ),
  },
  {
    icon: 'Braces',
    title: tx('Technical consistency', 'یکدستی فنی'),
    description: tx(
      'One set of conventions across the stack: typed code, shared design tokens and a predictable structure.',
      'یک مجموعه قرارداد در سراسر استک: کد تایپ‌شده، توکن‌های طراحی مشترک و ساختاری قابل‌پیش‌بینی.',
    ),
  },
  {
    icon: 'Blocks',
    title: tx('Maintainable architecture', 'معماری قابل‌نگهداری'),
    description: tx(
      'Clear boundaries between interface, business logic and data keep the product easy to change after launch.',
      'مرزهای شفاف میان رابط کاربری، منطق کسب‌وکار و داده، تغییر محصول را پس از راه‌اندازی ساده نگه می‌دارد.',
    ),
  },
  {
    icon: 'GitBranch',
    title: tx('Clear process', 'روند کاری روشن'),
    description: tx(
      'Defined stages with a visible result at the end of each one, so you always know what is done and what is next.',
      'مراحل مشخص با یک نتیجه‌ی قابل مشاهده در پایان هرکدام، تا همیشه بدانی چه چیزی انجام شده و بعدی چیست.',
    ),
  },
  {
    icon: 'ShieldCheck',
    title: tx('Long-term thinking', 'نگاه بلندمدت'),
    description: tx(
      'Security, validation and performance are part of the first build, not a cleanup task before launch.',
      'امنیت، اعتبارسنجی و کارایی از همان نسخه‌ی اول بخشی از ساخت هستند، نه یک کار پاک‌سازی پیش از راه‌اندازی.',
    ),
  },
]

const techStackData: TechCategory[] = [
  {
    id: 'frontend',
    title: tx('Frontend', 'فرانت‌اند'),
    icon: 'PanelsTopLeft',
    items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'backend',
    title: tx('Backend', 'بک‌اند'),
    icon: 'Server',
    items: ['Node.js', 'REST APIs', 'Authentication', 'Server-side validation'],
  },
  {
    id: 'database',
    title: tx('Database', 'پایگاه داده'),
    icon: 'Database',
    items: ['PostgreSQL', 'Supabase', 'Relational data modeling', 'Row-level security'],
  },
  {
    id: 'infrastructure',
    title: tx('Infrastructure and tools', 'زیرساخت و ابزارها'),
    icon: 'Cloud',
    items: ['Git', 'GitHub', 'Vercel', 'Docker'],
  },
]

const processStepsData: ProcessStep[] = [
  {
    id: 'discover',
    title: tx('Discover', 'شناخت'),
    description: tx('Understand the goal, the users and the constraints.', 'درک هدف، کاربران و محدودیت‌ها.'),
  },
  {
    id: 'plan',
    title: tx('Plan', 'برنامه‌ریزی'),
    description: tx('Agree on scope, architecture and milestones.', 'توافق روی محدوده‌ی کار، معماری و نقاط عطف.'),
  },
  {
    id: 'design',
    title: tx('Design', 'طراحی'),
    description: tx('Shape the interface and the data model together.', 'شکل‌دهی هم‌زمان رابط کاربری و مدل داده.'),
  },
  {
    id: 'build',
    title: tx('Build', 'ساخت'),
    description: tx('Develop in small increments you can review.', 'توسعه در گام‌های کوچک و قابل‌بازبینی.'),
  },
  {
    id: 'test',
    title: tx('Test', 'آزمایش'),
    description: tx(
      'Check behavior, edge cases, devices and accessibility.',
      'بررسی رفتار، حالت‌های خاص، دستگاه‌ها و دسترس‌پذیری.',
    ),
  },
  {
    id: 'launch',
    title: tx('Launch', 'راه‌اندازی'),
    description: tx('Deploy to production with monitoring in place.', 'استقرار روی محیط تولید همراه با مانیتورینگ.'),
  },
  {
    id: 'support',
    title: tx('Support', 'پشتیبانی'),
    description: tx('Fix, improve and extend after release.', 'رفع اشکال، بهبود و توسعه پس از انتشار.'),
  },
]

/**
 * Developer introduction. Replace `bio` with the real biography and add
 * `name` / `portrait` once they are ready — nothing personal is invented here.
 */
const developerData: DeveloperProfile = {
  name: 'Zakir Naseri',
  portrait: '/Profile-pic.jpg',
  timezone: 'UTC',
  availability: {
    state: 'available',
    updatedAt: '2026-09-11',
    responseCommitment: tx('Replies within a few hours, same day', 'پاسخ‌گویی در همان روز، طی چند ساعت'),
  },
  bio: tx(
    'Artaveo is run by one independent full-stack developer. Every project is planned, designed, built and deployed by the same person — which keeps decisions consistent from the database schema to the last detail of the interface.',
    'آرتاویو توسط یک توسعه‌دهنده‌ی مستقل فول‌استک اداره می‌شود. هر پروژه توسط همان یک نفر برنامه‌ریزی، طراحی، ساخته و مستقر می‌شود — که تصمیم‌ها را از طرح پایگاه داده تا جزئی‌ترین بخش رابط کاربری یکدست نگه می‌دارد.',
  ),
  focus: [
    tx('Full-stack web applications', 'اپلیکیشن‌های وب فول‌استک'),
    tx('React and Next.js interfaces', 'رابط‌های کاربری React و Next.js'),
    tx('PostgreSQL data modeling', 'مدل‌سازی داده در PostgreSQL'),
    tx('Multilingual and RTL products', 'محصولات چندزبانه و RTL'),
  ],
}

/**
 * Planned articles. They stay unpublished (`publishedAt: null`) until the
 * admin sets a real date and reading time — `getPublishedInsights()` hides
 * them from the public site until then (§ 3.5 / § 16.5).
 */
const insightsData: ArticlePreview[] = [
  {
    id: 'concurrent-seat-booking',
    slug: 'concurrent-seat-booking',
    title: tx(
      'Keeping seat bookings correct under concurrent requests',
      'درست نگه‌داشتن رزرو صندلی زیر بار درخواست‌های همزمان',
    ),
    excerpt: tx(
      'Why the database, not the browser, has to decide who owns a seat — and how holds and confirmations are modeled.',
      'چرا این پایگاه داده است، نه مرورگر، که باید تعیین کند صندلی مال کیست — و مدل‌سازی رزرو موقت و تأیید نهایی چطور انجام می‌شود.',
    ),
    category: tx('Backend', 'بک‌اند'),
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'rtl-first-interfaces',
    slug: 'rtl-first-interfaces',
    title: tx(
      'Building RTL-first interfaces with logical CSS',
      'ساخت رابط‌های کاربری RTL-first با CSS منطقی',
    ),
    excerpt: tx(
      'Practical notes on layouts that work in Persian and English without maintaining two sets of components.',
      'نکاتی عملی درباره‌ی چیدمان‌هایی که در فارسی و انگلیسی کار می‌کنند، بدون نیاز به دو مجموعه کامپوننت جداگانه.',
    ),
    category: tx('Frontend', 'فرانت‌اند'),
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'offline-first-content',
    slug: 'offline-first-content',
    title: tx(
      'Offline-first data loading for content-driven sites',
      'بارگذاری داده به‌شکل offline-first برای سایت‌های محتوامحور',
    ),
    excerpt: tx(
      'Rendering instantly from a local cache, then hydrating from the live database without showing stale state as truth.',
      'نمایش فوری از cache محلی، و سپس هیدریت شدن از پایگاه داده‌ی زنده، بدون نمایش وضعیت قدیمی به‌جای واقعیت.',
    ),
    category: tx('Architecture', 'معماری'),
    publishedAt: null,
    readingMinutes: null,
  },
]

/**
 * Selectors — the only way pages and components read content (§ 3.2).
 * Keeping the raw arrays module-private means the day this data moves to
 * PostgreSQL, only the bodies of these functions change.
 */

export function getCapabilities(): Capability[] {
  return capabilitiesData
}

export function getFeaturedProjects(): Project[] {
  return featuredProjectsData.filter((project) => project.featured && project.published)
}

/** Every published project, featured-first — backs `/work` (§ 6.1). */
export function getAllProjects(): Project[] {
  return featuredProjectsData
    .filter((project) => project.published)
    .sort((a, b) => Number(b.featured) - Number(a.featured))
}

/** A single published project by slug, or `undefined` — backs `/work/[slug]` (§ 6.1). */
export function getProjectBySlug(slug: string): Project | undefined {
  return featuredProjectsData.find((project) => project.slug === slug && project.published)
}

export function getWorkflowStages(): LocalizedText[] {
  return workflowStagesData
}

export function getDifferentiators(): Principle[] {
  return differentiatorsData
}

export function getTechStack(): TechCategory[] {
  return techStackData
}

export function getProcessSteps(): ProcessStep[] {
  return processStepsData
}

export function getDeveloperProfile(): DeveloperProfile {
  return developerData
}

/** Published, most-recent-first, capped to `limit`. Empty when nothing is published yet. */
export function getPublishedInsights(limit = 3): ArticlePreview[] {
  return insightsData
    .filter((article) => article.publishedAt !== null)
    .sort((a, b) => (a.publishedAt! < b.publishedAt! ? 1 : -1))
    .slice(0, limit)
}
