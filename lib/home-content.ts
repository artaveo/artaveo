import type {
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
      'رابط کاربری، API و پایگاه داده در یک مسیر مشترک پیش می‌روند.',
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
      'رابط کاربری، منطق و داده در لایه‌های جدا.',
    ),
  },
  {
    icon: 'Gauge',
    title: tx('Performance', 'کارایی'),
    description: tx(
      'Fast loading and lean client-side code by default.',
      'بارگذاری سریع و کد سبک سمت کلاینت، بدون افزودن پیچیدگی غیرضروری.',
    ),
  },
  {
    icon: 'Globe',
    title: tx('Remote collaboration', 'همکاری دورکار'),
    description: tx(
      'Async-friendly process with clear written updates.',
      'همکاری برای کار async، با گزارش‌های نوشتاری کوتاه و روشن.',
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
      'توسعه‌دهنده‌ی یگانه: معماری، دیتابیس، فرانت‌اند، بک‌اند و پنل مدیریت را از ابتدا تا انتها خودم پیش برده‌ام.',
    ),
    year: '2026',
    context: tx(
      'A booking and operations platform built for intercity bus companies in Afghanistan. The market runs on manual ticket counters and phone-based booking, with no shared system connecting passenger sales to fleet and trip operations. I built this as a real product bet: passengers get a live seat map and a bookable trip search, and operators get a database-backed admin for routes, fleet, drivers, trips and reporting — the two sides of the same booking, in one system.',
      'این پلتفرم برای رزرو و مدیریت عملیات شرکت‌های اتوبوس‌رانی بین‌شهری در افغانستان ساخته شده است. این بازار هنوز عمدتاً با گیشه‌های فروش دستی و رزرو تلفنی اداره می‌شود و سامانه‌ی مشترکی برای اتصال فروش بلیت به عملیات ناوگان و سفرها وجود ندارد. مسافران سفر را جست‌وجو می‌کنند و صندلی را روی نقشه‌ی زنده می‌بینند. اپراتورها هم مسیرها، ناوگان، رانندگان، سفرها و گزارش‌ها را از یک پنل متصل به دیتابیس مدیریت می‌کنند.',
    ),
    problemAndGoals: tx(
      "The core problem: seat availability and payment status are business-critical state that a booking site cannot let the browser decide. If two people can claim the same seat, or a cancelled booking can silently keep its payment marked as taken, the platform is unusable for a real operator. The goal was a passenger booking flow and an operations admin where every sensitive decision — holding a seat, confirming a booking, changing a payment's status — is made and enforced by the database, not the UI.",
      'وضعیت صندلی و پرداخت داده‌های حیاتی کسب‌وکارند و مرورگر نباید درباره‌ی آن‌ها تصمیم بگیرد. اگر دو نفر یک صندلی را هم‌زمان بگیرند یا رزروی که لغو شده هنوز «پرداخت‌شده» بماند، سامانه قابل‌اعتماد نیست. هدف این بود که نگه‌داشتن صندلی، تأیید رزرو و تغییر وضعیت پرداخت در سمت سرور و دیتابیس enforce شود؛ نه این‌که منطق حساس به رابط کاربری سپرده شود.',
    ),
    constraints: [
      tx(
        'Solo developer — architecture, schema, frontend, backend and admin all planned and built by one person, so decisions were scoped to what could be verified and maintained alone.',
        'یک توسعه‌دهنده‌ی یگانه — معماری، دیتابیس، فرانت‌اند، بک‌اند و پنل مدیریت را خودم ساخته‌ام. بنابراین هر تصمیم باید چیزی باشد که یک نفر بتواند واقعاً بررسی و نگهداری کند.',
      ),
      tx(
        "No live payment provider yet: HesabPay (the target gateway) integration is blocked on getting developer/sandbox credentials from the provider — an external dependency outside my control, not a technical gap.",
        'هنوز هیچ درگاه پرداخت زنده‌ای وصل نیست: اتصال حساب‌پی (درگاه هدف) روی دریافت اطلاعات دولوپر/sandbox از خودِ حساب‌پی بلاک است — یک وابستگی بیرونی، نه یک خلأ فنی.',
      ),
      tx(
        'Built for a bilingual Dari/English market with RTL as the primary reading direction, not an English-first product with translation bolted on.',
        'این پروژه برای یک بازار دوزبانه‌ی دری/انگلیسی و با RTL از ابتدا ساخته شده است؛ فارسی از همان ابتدا بخشی از محصول بوده، نه یک ترجمه‌ی بعدی.',
      ),
      tx(
        "No dedicated QA or security team — security review relies on Supabase's own advisory tooling plus manual verification against a rolled-back transaction on real data before any migration ships.",
        'تیم جداگانه‌ای برای QA یا امنیت وجود ندارد. پیش از هر migration، advisory Supabase و بررسی دستی داده‌ی واقعی را در یک تراکنش rollback‌شونده اجرا می‌کنم.',
      ),
    ],
    architecture: tx(
      'Next.js (App Router) serves both the passenger app and operations admin, with PostgreSQL behind Supabase. Supabase Auth handles sessions, while sensitive reads and writes pass through RLS and server-side authorization. Seat and payment status each follow their own state machine. The browser displays state; it does not decide it.',
      'Next.js (App Router) مسیر مسافر و پنل عملیات را اجرا می‌کند و از طریق Supabase به PostgreSQL وصل است. نشست‌ها با Supabase Auth مدیریت می‌شوند. خواندن و نوشتن حساس هم از RLS و بررسی دسترسی سمت سرور عبور می‌کند. وضعیت صندلی و پرداخت هرکدام state machine خودشان را دارند. مرورگر فقط وضعیت را نمایش می‌دهد؛ تصمیم‌گیرنده نیست.',
    ),
    keyDecisions: [
      {
        context: tx(
          'A payment could move between statuses (pending, confirmed, refunded, failed) through direct database writes, since admins already had write access to the payments table from an earlier phase.',
          'پرداخت‌ها می‌توانستند با یک UPDATE مستقیم روی جدول از یک وضعیت به وضعیت دیگر بروند، چون ادمین‌ها از قبل دسترسی نوشتن روی payments داشتند.',
        ),
        decision: tx(
          'Added a database trigger that enforces the payment state machine at the row level — only pending→confirmed, pending→failed, and confirmed→refunded are allowed, rejected even on a direct UPDATE, not just through the app\'s own functions.',
          'یک trigger در دیتابیس state machine پرداخت را enforce می‌کند. فقط pending→confirmed، pending→failed و confirmed→refunded مجازند. UPDATE مستقیم هم نمی‌تواند این محدودیت را دور بزند.',
        ),
        tradeoff: tx(
          "Any future legitimate transition (e.g. a failed retry) needs an explicit trigger change, not just an app-side code change — more friction, but the state can no longer drift silently.",
          'هر وضعیت تازه در آینده، مثل تلاش دوباره برای failed، باید صریحاً به trigger اضافه شود. این کار کمی سخت‌تر است، اما وضعیت پرداخت بی‌سروصدا از مسیر تعریف‌شده خارج نمی‌شود.',
        ),
      },
      {
        context: tx(
          'Partial refunds needed to release any coupon used on the booking, but wallet balance was also in scope for "what should a refund touch."',
          'بازپرداخت جزئی باید کوپن رزرو را آزاد می‌کرد. مسئله‌ی دوم این بود که آیا موجودی wallet هم باید برگردانده شود یا نه.',
        ),
        decision: tx(
          'Checked real data before writing any logic — every existing booking had a zero wallet deduction, because wallet debiting was never wired into the booking-confirmation path in the first place. Built coupon release only; left wallet refund logic undone rather than building a return path for money that was never actually taken.',
          'قبل از نوشتن منطق جدید، داده‌ی واقعی بررسی شد. همه‌ی رزروهای موجود کسر wallet صفر داشتند، چون این بخش اصلاً در مسیر تأیید رزرو wire نشده بود. در نتیجه فقط آزادسازی کوپن ساخته شد و بازگرداندن wallet باز ماند؛ برای پولی که واقعاً گرفته نشده، مسیر ساختگی نساختم.',
        ),
        tradeoff: tx(
          'The refund feature is incomplete until wallet debiting ships — documented as open debt rather than papered over with unused code.',
          'مسیر بازپرداخت تا زمان اضافه‌شدن کسر wallet کامل نیست. این مورد به‌عنوان بدهی باز ثبت شده، نه این‌که با کد بلااستفاده پنهان شود.',
        ),
      },
    ],
    engineeringHighlight: tx(
      "While building the refund path, a Supabase security review found a real access-control gap: the payment audit function was callable directly by clients because it had no permission check of its own. I revoked direct execute access and verified the privilege boundary separately. The review also found a functional bug: an admin could cancel a booking after payment was confirmed. That path now requires the refund flow instead.",
      'در مسیر ساخت بازپرداخت، advisory Supabase یک خلأ واقعی در دسترسی تابع ثبت تاریخچه‌ی پرداخت پیدا کرد. تابع از سمت کلاینت قابل‌فراخوانی بود، چون فرض شده بود فقط از داخل کد مورداعتماد صدا زده می‌شود. دسترسی مستقیم به آن بسته شد و دوباره با چک سطح دسترسی بررسی شد. همان بررسی یک باگ دیگر را هم نشان داد: ادمین می‌توانست رزروِ پرداخت‌شده را لغو کند و پرداخت همچنان دریافت‌شده بماند. این مسیر بسته شد و لغو چنین رزروی فقط از طریق بازپرداخت واقعی انجام می‌شود.',
    ),
    dataIntegrityAndSecurity: tx(
      "PostgreSQL RLS protects every business table, with server-side authorization layered on top. A database trigger enforces the payment state machine, and payment_status_events keeps an auditable history through one internal write path. Limited admins get section-level access rather than all-or-nothing permissions. Security checks combine Supabase advisory results with direct privilege checks.",
      'RLS روی هر جدول کسب‌وکاری PostgreSQL فعال است و کنار آن دسترسی سمت سرور هم بررسی می‌شود. trigger دیتابیس state machine پرداخت را enforce می‌کند و payment_status_events فقط از مسیر داخلی قابل‌نوشتن است. ادمین‌های محدود هم دسترسی بخشی دارند، نه همه یا هیچ. بررسی امنیتی با advisory Supabase و چک مستقیم دسترسی انجام می‌شود.',
    ),
    responsiveAndRtl: tx(
      'Built with five responsive tiers from mobile (under 768px) through ultra-wide (2560px and up), covering both the passenger booking flow and the admin\'s wide data tables. RTL/LTR behaviour is treated as a layout requirement from the start (Dari/English), not a late pass — including RTL-aware admin navigation and wide-table handling.',
      'این پروژه پنج سطح واکنش‌گرا دارد؛ از موبایل (کمتر از ۷۶۸ پیکسل) تا فوق‌عریض (۲۵۶۰ پیکسل به بالا). این بازه‌ها هم مسیر رزرو مسافر و هم جدول‌های عریض پنل ادمین را پوشش می‌دهند. RTL/LTR هم از ابتدا بخشی از معماری بوده، نه اصلاحی در پایان.',
    ),
    quality: tx(
      'Every migration is checked against real production data inside a transaction that is rolled back afterward. After each phase, tsc --noEmit and a full Next build run, with new TypeScript errors tracked separately from the known baseline. Schema changes also trigger another Supabase advisory and privilege check. There is no dedicated automated test suite or CI pipeline yet; that is tracked openly as debt.',
      'هر migration روی داده‌ی واقعی تولید و داخل یک تراکنش rollback‌شونده اعتبارسنجی می‌شود. بعد از هر فاز، tsc --noEmit و next build اجرا می‌شوند و خطاهای تازه از خطاهای پایه جدا می‌شوند. بعد از تغییر schema، advisory Supabase و دسترسی‌ها دوباره بررسی می‌شوند. هنوز تست خودکار اختصاصی یا CI ندارم؛ این محدودیت صریحاً ثبت شده است.',
    ),
    currentStatusAndNext: tx(
      'Finished: passenger booking with server-enforced seat holds, an operations admin, loyalty and coupon foundations, a public CMS lite, and a payment-status state machine with audit and partial-refund support. Payments are still confirmed manually/offline. HesabPay integration is the next planned step and remains blocked on developer/sandbox credentials from the provider.',
      'انجام‌شده: رزرو مسافر با hold صندلی سمت سرور، پنل عملیات برای مسیرها، ناوگان، رانندگان، سفرها، رزروها، گزارش‌ها و CSV، پایه‌های loyalty و کوپن، CMS عمومی سبک، و state machine کامل پرداخت همراه با audit و بازپرداخت جزئی. پرداخت‌ها هنوز تأیید خودکار ندارند؛ اتصال حساب‌پی به دریافت دسترسی developer/sandbox از ارائه‌دهنده وابسته است.',
    ),
    lessonsLearned: tx(
      'The most useful finding in this phase was not a new feature. A security review showed that a database function relied on the assumption that only trusted code would call it. That is not access control, so I now verify the permission boundary directly for every database function.',
      'مهم‌ترین نتیجه‌ی این فاز یک feature تازه نبود. یک بررسی امنیتی نشان داد تابعی بدون چک دسترسی مستقل قابل‌فراخوانی است، چون فرض شده بود فقط از کد مورداعتماد صدا زده می‌شود. از این به بعد هر تابع دیتابیس را طوری بررسی می‌کنم که انگار یک کلاینت غیرقابل‌اعتماد مستقیماً آن را صدا می‌زند.',
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
      'پورتالی دوزبانه (دری و انگلیسی) برای یک جامعه‌ی دانشجویی؛ شامل سالن مطالعه، مشاوره‌ی تحصیلی، بورسیه‌ها و دستاوردها. محتوا از طریق یک CMS اختصاصی مدیریت می‌شود و کارکنان غیرتوسعه‌دهنده هم می‌توانند با آن کار کنند.',
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
      'توسعه‌دهنده‌ی یگانه: معماری، دیتابیس، فرانت‌اند، بک‌اند و پنل مدیریت را از ابتدا تا انتها خودم پیش برده‌ام.',
    ),
    year: '2026',
    context: tx(
      'A bilingual Dari/English portal I built for Pezhohesh Complex, an educational institute I run myself — a study lounge, academic advising, scholarship listings and student achievements, all manageable by non-developer staff through a custom admin panel.',
      'پورتالی دوزبانه (دری/انگلیسی) که برای مجتمع پژوهش ساختم — مؤسسه‌ای آموزشی که خودم اداره‌اش می‌کنم. شامل سالن مطالعه، مشاوره‌ی تحصیلی، بورسیه‌های فعال و دستاوردهای دانشجویی است، و همه از طریق یک پنل ادمین اختصاصی مدیریت می‌شوند که کارکنانِ غیرتوسعه‌دهنده هم می‌توانند با آن کار کنند.',
    ),
    problemAndGoals: tx(
      "The institute needed content management that staff could use without asking a developer for every change. They needed to publish scholarships, edit study-lounge rules and review requests, with two access levels. Visitors on unreliable connections also needed previously viewed pages to keep working without allowing the admin panel to show stale pending requests.",
      'مؤسسه به یک مسیر واقعی برای مدیریت محتوا نیاز داشت، نه سایتی که برای هر تغییر دوباره به توسعه‌دهنده وابسته باشد. کارکنان باید بتوانند بورسیه منتشر کنند، قوانین سالن مطالعه را تغییر دهند و درخواست‌ها را بررسی کنند؛ با دو سطح دسترسی متفاوت. صفحات قبلاً دیده‌شده هم باید برای اینترنت ضعیف کار کنند، بدون این‌که پنل ادمین داده‌ی قدیمی نشان دهد.',
    ),
    constraints: [
      tx(
        'Solo developer, built for an institute I run myself — real content and real staff, not a demo dataset.',
        'یک توسعه‌دهنده‌ی یگانه، برای مؤسسه‌ای با محتوای واقعی و کارکنان واقعی؛ نه داده‌ی دمو.',
      ),
      tx(
        "Deployed by building locally and uploading the production bundle directly, not a Git-triggered CI/CD pipeline — a deliberate simplicity trade-off for a small, single-maintainer project.",
        'استقرار با build محلی و آپلود مستقیم خروجی انجام می‌شود، نه یک پایپ‌لاین CI/CD متصل به Git. این انتخاب برای ساده نگه‌داشتن استقرار یک پروژه‌ی کوچک با یک نگهدارنده است.',
      ),
      tx(
        'Admin panel is Dari-only by design; the public site is bilingual.',
        'پنل ادمین عمداً فقط دری است؛ سایت عمومی دوزبانه است.',
      ),
      tx(
        "Not a service-worker specialist, so the PWA caching strategy was deliberately built with Workbox's declarative routing rather than a hand-written fetch handler — simpler and lower-risk to maintain alone, at the cost of less fine-grained control if a future need arises.",
        'چون service worker تخصص اصلی من نیست، استراتژی کش PWA را با routing اعلانی Workbox ساختم، نه یک fetch handler دستی. این انتخاب برای نگهداری یک نفره ساده‌تر است، هرچند کنترل کمتری روی رفتارهای خاص آینده می‌دهد.',
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
          'PWA باید دسترسی آفلاین به صفحات قبلاً دیده‌شده را می‌داشت، ولی پنل ادمین نباید دیتای قدیمی نشان بدهد؛ مثلاً درخواستی که قبلاً تأیید شده، نباید بعد از refresh دوباره در وضعیت pending دیده شود.',
        ),
        decision: tx(
          "The service worker's navigation fallback (the offline \"app shell\") explicitly excludes every admin route, and no runtime-caching rule was written for the Supabase calls the admin panel depends on — so those requests are never intercepted by the cache layer at all, online or offline.",
          'navigation fallback سرویس‌ورکر صراحتاً مسیرهای ادمین را کنار می‌گذارد. برای درخواست‌های Supabase موردنیاز پنل ادمین هم runtime-caching rule نداریم؛ بنابراین این داده‌ها توسط لایه‌ی کش رهگیری نمی‌شوند.',
        ),
        tradeoff: tx(
          'If an admin genuinely loses connection, they see a normal browser connection error instead of a safe-but-confusing cached shell — chosen deliberately over silently serving anything that could be mistaken for live data.',
          'اگر اتصال ادمین قطع شود، خطای معمولی مرورگر نمایش داده می‌شود، نه پوسته‌ی کش‌شده. این انتخاب آگاهانه است تا داده‌ی قدیمی شبیه داده‌ی زنده به نظر نرسد.',
        ),
      },
      {
        context: tx(
          "Portal content already had a localStorage-backed stale-while-revalidate layer built in — show the local copy instantly, refresh from the database in the background.",
          'محتوای پورتال از قبل یک لایه‌ی stale-while-revalidate مبتنی بر localStorage داشت — نمایش فوری نسخه‌ی محلی، به‌روزرسانی از دیتابیس در پس‌زمینه.',
        ),
        decision: tx(
          'Deliberately did not add a service-worker caching rule on top of that for the same data, since it would duplicate a stale-while-revalidate behaviour that already existed, with no added benefit and one more layer to keep in sync.',
          'برای همان داده runtime-caching rule تازه‌ای اضافه نشد؛ رفتار stale-while-revalidate موجود دوباره‌کاری می‌شد و فقط یک لایه‌ی دیگر برای نگهداری اضافه می‌کرد.',
        ),
        tradeoff: tx(
          'Only uploaded images get a cache-first rule with an expiration cap, oldest purged first — a narrower caching surface than "cache everything," but each caching decision maps to a specific, understood need rather than a blanket policy.',
          'فقط تصاویر آپلودشده cache می‌شوند و برای آن‌ها سقف انقضا داریم. تصمیم کش برای هر نوع داده بر اساس نیاز همان داده است، نه یک قانون واحد برای همه.',
        ),
      },
    ],
    engineeringHighlight: tx(
      'The hardest PWA decision was not making offline mode work; it was deciding what must never be cached. Public content, admin requests and uploaded images use different strategies because the same cache policy would create correctness risks. Admin routes are excluded from the cache, while only uploaded images receive HTTP caching with an expiry policy. Department Admin writes also use a fail-closed allow-list, so new settings stay denied until explicitly allowed.',
      'سخت‌ترین بخش PWA تصمیم‌گیری درباره‌ی چیزهایی بود که نباید کش شوند. محتوای عمومی، درخواست‌های ادمین و تصاویر آپلودشده سیاست‌های جدا دارند تا داده‌ی قدیمی به‌عنوان داده‌ی زنده نمایش داده نشود. مسیرهای ادمین کش نمی‌شوند و فقط تصاویر آپلودشده cache می‌شوند؛ allow-list نقش Department Admin هم fail-closed است.',
    ),
    dataIntegrityAndSecurity: tx(
      'Two admin roles are enforced with a database check constraint. Department-scoped writes go through a fail-closed allow-list, so an unlisted settings key is denied by default. RLS scopes what each role can read and write, and portal requests go through a rate-limited Supabase Edge Function.',
      'دو نقش ادمین با check constraint در سطح دیتابیس اجرا می‌شوند. دسترسی نوشتن هر بخش با allow-list fail-closed محدود شده است؛ کلیدی که صریحاً مجاز نشده باشد رد می‌شود. RLS دسترسی هر نقش را مشخص می‌کند و درخواست‌های پورتال از Edge Function با rate limit سمت سرور عبور می‌کنند.',
    ),
    responsiveAndRtl: tx(
      'RTL-first from the ground up — logical layout properties and perceptually uniform color tokens rather than an LTR layout patched with a right-to-left flag. Dari is the default language; English is available via a language-preference prompt shown once to first-time visitors.',
      'از ابتدا RTL را مبنا قرار داده‌ام، نه اینکه یک layout انگلیسی را بعداً راست‌چین کنم. دری زبان پیش‌فرض است و انگلیسی از طریق انتخاب زبان در دسترس بازدیدکننده‌های تازه قرار می‌گیرد.',
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
      "Building an offline-first PWA reinforced a simple rule: caching is a data decision, not just a performance feature. I now ask what happens when each piece of data is stale before choosing a cache policy for it.",
      'ساختن PWA آفلاین‌فرست به من یاد داد که کش فقط موضوع کارایی نیست؛ موضوع صحت داده هم هست. حالا قبل از انتخاب سیاست کش، اول می‌پرسم اگر این داده قدیمی باشد چه اتفاقی می‌افتد.',
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
      'Architecture, interface, backend and deployment stay on one path, so context is not lost between handoffs.',
      'معماری، رابط کاربری، بک‌اند و استقرار را در یک مسیر مشترک پیش می‌برم؛ چیزی بین تیم‌ها دست‌به‌دست نمی‌شود.',
    ),
  },
  {
    icon: 'Braces',
    title: tx('Technical consistency', 'یکدستی فنی'),
    description: tx(
      'One set of conventions across the stack: typed code, shared design tokens and a predictable structure.',
      'یک مجموعه قرارداد در سراسر استک: کد تایپ‌شده، توکن‌های طراحی مشترک و ساختاری منسجم.',
    ),
  },
  {
    icon: 'Blocks',
    title: tx('Maintainable architecture', 'معماری قابل‌نگهداری'),
    description: tx(
      'Clear boundaries between interface, business logic and data keep the product easy to change after launch.',
      'رابط کاربری، منطق کسب‌وکار و پایگاه‌داده در لایه‌های جدا می‌مانند، پس تغییر محصول بعد از راه‌اندازی ساده است.',
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
    title: tx('Long-term thinking', 'نگاه رو به جلو'),
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
    'آرتاویو را یک توسعه‌دهنده‌ی مستقل فول‌استک پیش می‌برد. هر پروژه را از برنامه‌ریزی و طراحی تا ساخت و استقرار خودم انجام می‌دهم؛ بنابراین تصمیم‌ها از دیتابیس تا جزئیات رابط کاربری در یک مسیر می‌مانند.',
  ),
  focus: [
    tx('Full-stack web applications', 'اپلیکیشن‌های وب فول‌استک'),
    tx('React and Next.js interfaces', 'رابط‌های کاربری React و Next.js'),
    tx('PostgreSQL data modeling', 'مدل‌سازی داده در PostgreSQL'),
    tx('Multilingual and RTL products', 'محصولات چندزبانه و RTL'),
  ],
}

/**
 * Selectors — the only way pages and components read content (§ 3.2).
 * Keeping the raw arrays module-private means the day this data moves to
 * PostgreSQL, only the bodies of these functions change.
 */

export function getCapabilities(): Capability[] {
  return capabilitiesData
}

/**
 * Phase 12.2 (roadmap § 12): the project selectors — `getFeaturedProjects`,
 * `getAllProjects`, `getProjectBySlug` — moved to `./home-content-projects`
 * and now read from Supabase instead of `featuredProjectsData` below. They
 * are not re-exported from here because that file imports `server-only`
 * (via `lib/supabase/content-queries.ts`) — this file (`home-content.ts`)
 * is still imported by a genuine Client Component (`site-shell.tsx`, for
 * `getDeveloperProfile()`), and a `server-only` import anywhere in this
 * file's module graph would break that component's build. Import the
 * project selectors from `@/lib/home-content-projects` directly.
 */

/**
 * The raw, file-based project array — for `scripts/import-content-to-db.ts`
 * only. Every page/component reads the Supabase-backed selectors in
 * `@/lib/home-content-projects`, never this.
 */
export function getAllProjectsRaw(): Project[] {
  return featuredProjectsData
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
