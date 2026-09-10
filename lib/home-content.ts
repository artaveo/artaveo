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
 * Every prose field is `{ en, fa }` (§ 3.2). `fa` mirrors `en` until Phase 5
 * writes real Persian copy — pages never read these arrays directly, only
 * through the selector functions at the bottom of this file.
 */

function en(value: string): LocalizedText {
  return { en: value, fa: value }
}

const capabilitiesData: Capability[] = [
  {
    icon: 'Layers',
    title: en('Full-stack development'),
    description: en('Interface, API and database in one workflow.'),
  },
  {
    icon: 'Smartphone',
    title: en('Responsive interfaces'),
    description: en('Designed for phones, desktops and everything between.'),
  },
  {
    icon: 'Boxes',
    title: en('Modern architecture'),
    description: en('Clear boundaries between UI, logic and data.'),
  },
  {
    icon: 'Gauge',
    title: en('Performance'),
    description: en('Fast loading and lean client-side code by default.'),
  },
  {
    icon: 'Globe',
    title: en('Remote collaboration'),
    description: en('Async-friendly process with clear written updates.'),
  },
]

const featuredProjectsData: Project[] = [
  {
    id: 'transportation-system',
    slug: 'transportation-system',
    title: en('Transportation System'),
    category: en('Full-stack platform'),
    summary: en(
      'A booking and operations platform for intercity bus companies: passengers search trips and pick seats on a live seat map, while operators manage routes, buses, drivers and trips from a database-backed admin.',
    ),
    highlights: [
      en('Seat holds and booking confirmation are enforced on the server, never in the browser'),
      en('Operations admin for routes, fleet, trips, bookings, reports and CSV exports'),
      en('PostgreSQL row-level security combined with server-side authorization checks'),
    ],
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Supabase', 'Tailwind CSS'],
    status: 'in-development',
    githubUrl: 'https://github.com/artaveo/Transportation-System',
    featured: true,
    published: true,
  },
  {
    id: 'pazhuhesh-portal',
    slug: 'pazhuhesh-portal',
    title: en('Pazhuhesh Complex Portal'),
    category: en('Web application'),
    summary: en(
      'A bilingual Dari and English portal for a student community — study lounge, academic advising, scholarships and achievements — run through a custom CMS that non-developers can manage safely.',
    ),
    highlights: [
      en('Two admin roles with role-based routing and permissions scoped per department'),
      en('Offline-first data layer and an installable PWA with tuned caching per data type'),
      en('RTL-native interface with persisted theme and language preferences'),
    ],
    technologies: ['React', 'Vite', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'PWA'],
    githubUrl: 'https://github.com/artaveo/pezhohesh-portal',
    featured: true,
    published: true,
  },
]

const servicesData: Service[] = [
  {
    id: 'web-development',
    slug: 'web-development',
    icon: 'Globe',
    title: en('Web development'),
    description: en(
      'Fast, accessible business websites with a clean, maintainable codebase behind them.',
    ),
    deliverables: [
      en('Responsive website'),
      en('Content structure ready for a CMS'),
      en('Metadata and SEO setup'),
    ],
  },
  {
    id: 'full-stack-development',
    slug: 'full-stack-development',
    icon: 'Layers',
    title: en('Full-stack development'),
    description: en(
      'One developer across interface, API and database, so the whole product follows one consistent design.',
    ),
    deliverables: [en('Frontend and backend'), en('Database schema'), en('Deployment')],
  },
  {
    id: 'web-applications',
    slug: 'web-applications',
    icon: 'AppWindow',
    title: en('Web applications'),
    description: en(
      'Dashboards, portals and internal tools with real authentication, user roles and data workflows.',
    ),
    deliverables: [
      en('Authentication and roles'),
      en('Admin panels'),
      en('Data-heavy interfaces'),
    ],
  },
  {
    id: 'frontend-development',
    slug: 'frontend-development',
    icon: 'PanelsTopLeft',
    title: en('Frontend development'),
    description: en(
      'Component-based interfaces in React and Next.js, built on a design system, with RTL and dark mode where needed.',
    ),
    deliverables: [
      en('Design system and components'),
      en('Responsive layouts'),
      en('Accessibility'),
    ],
  },
  {
    id: 'backend-apis',
    slug: 'backend-apis',
    icon: 'Server',
    title: en('Backend and APIs'),
    description: en(
      'Typed APIs, server-side validation and relational data models that keep business rules on the server.',
    ),
    deliverables: [en('API endpoints'), en('PostgreSQL data model'), en('Authorization rules')],
  },
  {
    id: 'maintenance',
    slug: 'maintenance',
    icon: 'Wrench',
    title: en('Maintenance and improvement'),
    description: en(
      'Taking over an existing codebase: fixing issues, improving performance and making it easier to change.',
    ),
    deliverables: [en('Code review'), en('Performance fixes'), en('Ongoing updates')],
  },
]

/** The single delivery chain Artaveo covers end to end. */
const workflowStagesData: LocalizedText[] = [
  en('Idea'),
  en('Architecture'),
  en('Interface'),
  en('Frontend'),
  en('Backend'),
  en('Database'),
  en('Deployment'),
]

const differentiatorsData: Principle[] = [
  {
    icon: 'MessagesSquare',
    title: en('Direct communication'),
    description: en(
      'You talk to the person designing and writing the code. Nothing gets lost between account managers and subcontractors.',
    ),
  },
  {
    icon: 'Workflow',
    title: en('End-to-end ownership'),
    description: en(
      'Architecture, interface, backend and deployment happen in one workflow, so nothing falls between handoffs.',
    ),
  },
  {
    icon: 'Braces',
    title: en('Technical consistency'),
    description: en(
      'One set of conventions across the stack: typed code, shared design tokens and a predictable structure.',
    ),
  },
  {
    icon: 'Blocks',
    title: en('Maintainable architecture'),
    description: en(
      'Clear boundaries between interface, business logic and data keep the product easy to change after launch.',
    ),
  },
  {
    icon: 'GitBranch',
    title: en('Clear process'),
    description: en(
      'Defined stages with a visible result at the end of each one, so you always know what is done and what is next.',
    ),
  },
  {
    icon: 'ShieldCheck',
    title: en('Long-term thinking'),
    description: en(
      'Security, validation and performance are part of the first build, not a cleanup task before launch.',
    ),
  },
]

const techStackData: TechCategory[] = [
  {
    id: 'frontend',
    title: en('Frontend'),
    icon: 'PanelsTopLeft',
    items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'backend',
    title: en('Backend'),
    icon: 'Server',
    items: ['Node.js', 'REST APIs', 'Authentication', 'Server-side validation'],
  },
  {
    id: 'database',
    title: en('Database'),
    icon: 'Database',
    items: ['PostgreSQL', 'Supabase', 'Relational data modeling', 'Row-level security'],
  },
  {
    id: 'infrastructure',
    title: en('Infrastructure and tools'),
    icon: 'Cloud',
    items: ['Git', 'GitHub', 'Vercel', 'Docker'],
  },
]

const processStepsData: ProcessStep[] = [
  { id: 'discover', title: en('Discover'), description: en('Understand the goal, the users and the constraints.') },
  { id: 'plan', title: en('Plan'), description: en('Agree on scope, architecture and milestones.') },
  { id: 'design', title: en('Design'), description: en('Shape the interface and the data model together.') },
  { id: 'build', title: en('Build'), description: en('Develop in small increments you can review.') },
  { id: 'test', title: en('Test'), description: en('Check behavior, edge cases, devices and accessibility.') },
  { id: 'launch', title: en('Launch'), description: en('Deploy to production with monitoring in place.') },
  { id: 'support', title: en('Support'), description: en('Fix, improve and extend after release.') },
]

/**
 * Developer introduction. Replace `bio` with the real biography and add
 * `name` / `portrait` once they are ready — nothing personal is invented here.
 */
const developerData: DeveloperProfile = {
  bio: en(
    'Artaveo is run by one independent full-stack developer. Every project is planned, designed, built and deployed by the same person — which keeps decisions consistent from the database schema to the last detail of the interface.',
  ),
  focus: [
    en('Full-stack web applications'),
    en('React and Next.js interfaces'),
    en('PostgreSQL data modeling'),
    en('Multilingual and RTL products'),
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
    title: en('Keeping seat bookings correct under concurrent requests'),
    excerpt: en(
      'Why the database, not the browser, has to decide who owns a seat — and how holds and confirmations are modeled.',
    ),
    category: en('Backend'),
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'rtl-first-interfaces',
    slug: 'rtl-first-interfaces',
    title: en('Building RTL-first interfaces with logical CSS'),
    excerpt: en(
      'Practical notes on layouts that work in Persian and English without maintaining two sets of components.',
    ),
    category: en('Frontend'),
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'offline-first-content',
    slug: 'offline-first-content',
    title: en('Offline-first data loading for content-driven sites'),
    excerpt: en(
      'Rendering instantly from a local cache, then hydrating from the live database without showing stale state as truth.',
    ),
    category: en('Architecture'),
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
