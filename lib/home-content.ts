import type {
  ArticlePreview,
  Capability,
  DeveloperProfile,
  LocalizedText,
  Principle,
  ProcessStep,
  Project,
  Service,
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
    featured: true,
    published: true,
  },
  {
    id: 'pazhuhesh-portal',
    slug: 'pazhuhesh-portal',
    title: tx('Pazhuhesh Complex Portal', 'پورتال مجتمع پژوهش'),
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
    githubUrl: 'https://github.com/artaveo/pezhohesh-portal',
    role: tx(
      'Sole developer: architecture, database schema, frontend, backend and admin, planned and built end to end.',
      'توسعه‌دهنده‌ی یگانه: معماری، طرح پایگاه داده، فرانت‌اند، بک‌اند و پنل مدیریت، از ابتدا تا انتها برنامه‌ریزی و ساخته‌شده.',
    ),
    featured: true,
    published: true,
  },
]

const servicesData: Service[] = [
  {
    id: 'web-development',
    slug: 'web-development',
    icon: 'Globe',
    title: tx('Web development', 'توسعه‌ی وب'),
    description: tx(
      'Fast, accessible business websites with a clean, maintainable codebase behind them.',
      'وب‌سایت‌های تجاری سریع و در دسترس، با کدی تمیز و قابل نگهداری پشت آن.',
    ),
    deliverables: [
      tx('Responsive website', 'وب‌سایت واکنش‌گرا'),
      tx('Content structure ready for a CMS', 'ساختار محتوایی آماده برای CMS'),
      tx('Metadata and SEO setup', 'تنظیمات متادیتا و سئو'),
    ],
  },
  {
    id: 'full-stack-development',
    slug: 'full-stack-development',
    icon: 'Layers',
    title: tx('Full-stack development', 'توسعه‌ی فول‌استک'),
    description: tx(
      'One developer across interface, API and database, so the whole product follows one consistent design.',
      'یک توسعه‌دهنده در سراسر رابط کاربری، API و پایگاه داده، تا کل محصول از یک طراحی یکدست پیروی کند.',
    ),
    deliverables: [
      tx('Frontend and backend', 'فرانت‌اند و بک‌اند'),
      tx('Database schema', 'طرح پایگاه داده'),
      tx('Deployment', 'استقرار'),
    ],
  },
  {
    id: 'web-applications',
    slug: 'web-applications',
    icon: 'AppWindow',
    title: tx('Web applications', 'اپلیکیشن‌های وب'),
    description: tx(
      'Dashboards, portals and internal tools with real authentication, user roles and data workflows.',
      'داشبورد، پورتال و ابزارهای داخلی با احراز هویت واقعی، نقش‌های کاربری و روند کار داده.',
    ),
    deliverables: [
      tx('Authentication and roles', 'احراز هویت و نقش‌ها'),
      tx('Admin panels', 'پنل‌های مدیریت'),
      tx('Data-heavy interfaces', 'رابط‌های کاربری داده‌محور'),
    ],
  },
  {
    id: 'frontend-development',
    slug: 'frontend-development',
    icon: 'PanelsTopLeft',
    title: tx('Frontend development', 'توسعه‌ی فرانت‌اند'),
    description: tx(
      'Component-based interfaces in React and Next.js, built on a design system, with RTL and dark mode where needed.',
      'رابط‌های کاربری کامپوننت‌محور در React و Next.js، ساخته‌شده روی یک سیستم طراحی، همراه با پشتیبانی RTL و حالت تاریک در صورت نیاز.',
    ),
    deliverables: [
      tx('Design system and components', 'سیستم طراحی و کامپوننت‌ها'),
      tx('Responsive layouts', 'چیدمان‌های واکنش‌گرا'),
      tx('Accessibility', 'دسترس‌پذیری'),
    ],
  },
  {
    id: 'backend-apis',
    slug: 'backend-apis',
    icon: 'Server',
    title: tx('Backend and APIs', 'بک‌اند و API'),
    description: tx(
      'Typed APIs, server-side validation and relational data models that keep business rules on the server.',
      'APIهای تایپ‌شده، اعتبارسنجی سمت سرور و مدل‌های داده‌ی رابطه‌ای که قواعد کسب‌وکار را روی سرور نگه می‌دارند.',
    ),
    deliverables: [
      tx('API endpoints', 'endpointهای API'),
      tx('PostgreSQL data model', 'مدل داده‌ی PostgreSQL'),
      tx('Authorization rules', 'قواعد سطح دسترسی'),
    ],
  },
  {
    id: 'maintenance',
    slug: 'maintenance',
    icon: 'Wrench',
    title: tx('Maintenance and improvement', 'نگهداری و بهبود'),
    description: tx(
      'Taking over an existing codebase: fixing issues, improving performance and making it easier to change.',
      'در دست گرفتن یک کدبیس موجود: رفع مشکلات، بهبود کارایی و ساده‌تر کردن تغییرات آینده.',
    ),
    deliverables: [
      tx('Code review', 'بازبینی کد'),
      tx('Performance fixes', 'رفع مشکلات کارایی'),
      tx('Ongoing updates', 'به‌روزرسانی‌های مستمر'),
    ],
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

export function getServices(): Service[] {
  return servicesData
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
