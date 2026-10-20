import type { DeveloperProfile, LocalizedText, ProjectSeed, TechCategory } from '@/types/content'

/**
 * The content seed for projects and the founder's profile.
 *
 * Every page reads projects from the database (`lib/home-content-projects.ts`);
 * this file is what `scripts/import-content-to-db.ts` writes there, and what
 * the integration suite compares the database with. Only real, verifiable
 * facts live here — no invented clients, metrics, dates or testimonials (§ 16.7).
 *
 * Phase 32: the public texts are written for the customer (§ 16.1) — the same
 * words migration `0031_project_texts` put in the live database. The archived
 * engineering write-ups of revisions 1–44 (context, architecture, decisions,
 * constraints, "my role", …) and the unused old Home copy are gone from the
 * seed; the archived rows stay in the database as history and are never read.
 * Every prose field is `{ en, fa }` (§ 3.2), each written for its own reader.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

const featuredProjectsData: ProjectSeed[] = [
  {
    id: 'transportation-system',
    slug: 'transportation-system',
    title: tx('Ticket Sales & Transport Management', 'سیستم فروش تکت و مدیریت ترانسپورت'),
    category: tx('Web system', 'سیستم تحت وب'),
    summary: tx(
      'Ticket sales and day-to-day management for intercity transport companies. Passengers find a trip, buy their ticket online and pick their own seat; the company runs routes, buses, drivers, trips and sales from one panel.',
      'سیستم فروش تکت و مدیریت برای شرکت‌های ترانسپورتی بین‌شهری. مسافر سفر را پیدا می‌کند، تکتش را آنلاین می‌گیرد و چوکی‌اش را خودش انتخاب می‌کند؛ شرکت مسیرها، بس‌ها، رانندگان، سفرها و فروش را از یک پنل اداره می‌کند.',
    ),
    highlights: [],
    // Admin data (the technology picker), never shown on the public site (§ 16.1 rule 3).
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Supabase', 'Tailwind CSS'],
    status: 'in-development',
    githubUrl: 'https://github.com/artaveo/Transportation-System',
    year: '2026',
    featured: true,
    published: true,
    showInPortfolio: true,
    isProduct: false,
    brandColor: '#14243D',
    accentColor: '#F2A93B',
    industry: tx('Passenger transport', 'ترانسپورت مسافربری'),
    platforms: ['web'],
    features: [
      tx('Passengers find a trip and buy the ticket online', 'مسافر سفر را پیدا می‌کند و تکت را آنلاین می‌خرد'),
      tx('Each passenger picks their seat on the bus seat map', 'هر مسافر چوکی خود را روی نقشه‌ی چوکی‌های بس انتخاب می‌کند'),
      tx('Passengers look up their ticket any time with its code', 'مسافر تکت خود را هر وقت با کد آن پیدا می‌کند'),
      tx('Routes, buses, drivers and trips run from one panel', 'مسیرها، بس‌ها، رانندگان و سفرها از یک پنل اداره می‌شوند'),
      tx('Sales reports by date and route', 'گزارش فروش بر اساس تاریخ و مسیر'),
      tx('Loyalty levels and discount coupons', 'سطح‌های وفاداری و کوپن‌های تخفیف'),
    ],
    blocks: [{ type: 'features', title: tx('What it does', 'کارهایی که انجام می‌دهد'), body: {} }],
  },
  {
    id: 'pazhuhesh-portal',
    slug: 'pazhuhesh-portal',
    title: tx('Pezhohesh Complex Website', 'وب‌سایت مجتمع پژوهش'),
    category: tx('Website and admin panel', 'وب‌سایت و پنل مدیریت'),
    summary: tx(
      "The website and admin panel of an education centre: its study lounge, academic advising, scholarships and student achievements. The centre's staff keep everything up to date themselves.",
      'وب‌سایت و پنل مدیریت یک مرکز آموزشی: سالون مطالعه، مشوره‌ی تحصیلی، بورسیه‌ها و دستاوردهای محصلان. کارمندان مرکز همه‌چیز را خودشان به‌روز می‌کنند.',
    ),
    highlights: [],
    technologies: ['React', 'Vite', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'PWA'],
    status: 'live',
    githubUrl: 'https://github.com/artaveo/pezhohesh-portal',
    year: '2026',
    featured: true,
    published: true,
    showInPortfolio: true,
    isProduct: false,
    brandColor: '#123B2C',
    accentColor: '#7FD8B0',
    industry: tx('Education', 'آموزش'),
    platforms: ['web'],
    features: [
      tx('A study lounge page with its facilities and rules', 'صفحه‌ی سالون مطالعه با امکانات و مقررات آن'),
      tx('Scholarships the staff publish themselves', 'بورسیه‌هایی که کارمندان خودشان نشر می‌کنند'),
      tx('Academic services and advising requests', 'خدمات تحصیلی و درخواست مشوره'),
      tx('A page for student achievements', 'صفحه‌ی دستاوردهای محصلان'),
      tx('Separate access for the director and each department head', 'دسترسی جدا برای مدیر کل و مدیر هر بخش'),
      tx('Light and dark appearance', 'نمای روشن و تاریک'),
    ],
    blocks: [{ type: 'features', title: tx('What it does', 'کارهایی که انجام می‌دهد'), body: {} }],
  },
]

/**
 * How the import script files a project's technologies into the admin's
 * technology categories (`technologies.category`). Admin data — never shown on
 * the public site.
 */
const techStackData: TechCategory[] = [
  { id: 'frontend', title: tx('Frontend', 'فرانت‌اند'), icon: 'PanelsTopLeft', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'] },
  { id: 'backend', title: tx('Backend', 'بک‌اند'), icon: 'Server', items: ['Node.js', 'REST APIs', 'Authentication', 'Server-side validation'] },
  { id: 'database', title: tx('Database', 'پایگاه داده'), icon: 'Database', items: ['PostgreSQL', 'Supabase', 'Relational data modeling', 'Row-level security'] },
  { id: 'infrastructure', title: tx('Infrastructure and tools', 'زیرساخت و ابزارها'), icon: 'Cloud', items: ['Git', 'GitHub', 'Vercel', 'Docker'] },
]

/** The founder (D-02), as the About page and the sitewide structured data show him. */
const developerData: DeveloperProfile = {
  name: 'Zakir Naseri',
  portrait: '/Profile-pic.jpg',
  timezone: 'UTC',
  availability: {
    state: 'available',
    updatedAt: '2026-09-11',
    responseCommitment: tx('Replies the same day, usually within a few hours', 'جواب در همان روز، معمولاً طی چند ساعت'),
  },
  bio: tx(
    'Zakir Naseri founded Artaveo, which designs and builds websites, management systems, mobile apps and desktop software for businesses.',
    'ذاکر ناصری آرتاویو را بنیان گذاشت؛ آرتاویو برای کسب‌وکارها وب‌سایت، سیستم مدیریتی، اپلیکیشن موبایل و نرم‌افزار کمپیوتری طراحی می‌کند و می‌سازد.',
  ),
}

/**
 * The raw, file-based project array — for `scripts/import-content-to-db.ts`
 * and the integration suite only. Every page reads the database-backed
 * selectors in `@/lib/home-content-projects`, never this.
 */
export function getAllProjectsRaw(): ProjectSeed[] {
  return featuredProjectsData
}

export function getTechStack(): TechCategory[] {
  return techStackData
}

export function getDeveloperProfile(): DeveloperProfile {
  return developerData
}
