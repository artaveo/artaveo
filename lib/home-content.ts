import type {
  ArticlePreview,
  Capability,
  DeveloperProfile,
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
 * live here — no invented clients, metrics, dates or testimonials.
 */

export const capabilities: Capability[] = [
  {
    icon: 'Layers',
    title: 'Full-stack development',
    description: 'Interface, API and database in one workflow.',
  },
  {
    icon: 'Smartphone',
    title: 'Responsive interfaces',
    description: 'Designed for phones, desktops and everything between.',
  },
  {
    icon: 'Boxes',
    title: 'Modern architecture',
    description: 'Clear boundaries between UI, logic and data.',
  },
  {
    icon: 'Gauge',
    title: 'Performance',
    description: 'Fast loading and lean client-side code by default.',
  },
  {
    icon: 'Globe',
    title: 'Remote collaboration',
    description: 'Async-friendly process with clear written updates.',
  },
]

export const featuredProjects: Project[] = [
  {
    id: 'transportation-system',
    slug: 'transportation-system',
    title: 'Transportation System',
    category: 'Full-stack platform',
    summary:
      'A booking and operations platform for intercity bus companies: passengers search trips and pick seats on a live seat map, while operators manage routes, buses, drivers and trips from a database-backed admin.',
    highlights: [
      'Seat holds and booking confirmation are enforced on the server, never in the browser',
      'Operations admin for routes, fleet, trips, bookings, reports and CSV exports',
      'PostgreSQL row-level security combined with server-side authorization checks',
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
    title: 'Pazhuhesh Complex Portal',
    category: 'Web application',
    summary:
      'A bilingual Dari and English portal for a student community — study lounge, academic advising, scholarships and achievements — run through a custom CMS that non-developers can manage safely.',
    highlights: [
      'Two admin roles with role-based routing and permissions scoped per department',
      'Offline-first data layer and an installable PWA with tuned caching per data type',
      'RTL-native interface with persisted theme and language preferences',
    ],
    technologies: ['React', 'Vite', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'PWA'],
    githubUrl: 'https://github.com/artaveo/pezhohesh-portal',
    featured: true,
    published: true,
  },
]

export const services: Service[] = [
  {
    id: 'web-development',
    slug: 'web-development',
    icon: 'Globe',
    title: 'Web development',
    description:
      'Fast, accessible business websites with a clean, maintainable codebase behind them.',
    deliverables: ['Responsive website', 'Content structure ready for a CMS', 'Metadata and SEO setup'],
  },
  {
    id: 'full-stack-development',
    slug: 'full-stack-development',
    icon: 'Layers',
    title: 'Full-stack development',
    description:
      'One developer across interface, API and database, so the whole product follows one consistent design.',
    deliverables: ['Frontend and backend', 'Database schema', 'Deployment'],
  },
  {
    id: 'web-applications',
    slug: 'web-applications',
    icon: 'AppWindow',
    title: 'Web applications',
    description:
      'Dashboards, portals and internal tools with real authentication, user roles and data workflows.',
    deliverables: ['Authentication and roles', 'Admin panels', 'Data-heavy interfaces'],
  },
  {
    id: 'frontend-development',
    slug: 'frontend-development',
    icon: 'PanelsTopLeft',
    title: 'Frontend development',
    description:
      'Component-based interfaces in React and Next.js, built on a design system, with RTL and dark mode where needed.',
    deliverables: ['Design system and components', 'Responsive layouts', 'Accessibility'],
  },
  {
    id: 'backend-apis',
    slug: 'backend-apis',
    icon: 'Server',
    title: 'Backend and APIs',
    description:
      'Typed APIs, server-side validation and relational data models that keep business rules on the server.',
    deliverables: ['API endpoints', 'PostgreSQL data model', 'Authorization rules'],
  },
  {
    id: 'maintenance',
    slug: 'maintenance',
    icon: 'Wrench',
    title: 'Maintenance and improvement',
    description:
      'Taking over an existing codebase: fixing issues, improving performance and making it easier to change.',
    deliverables: ['Code review', 'Performance fixes', 'Ongoing updates'],
  },
]

/** The single delivery chain Artaveo covers end to end. */
export const workflowStages = [
  'Idea',
  'Architecture',
  'Interface',
  'Frontend',
  'Backend',
  'Database',
  'Deployment',
]

export const differentiators: Principle[] = [
  {
    icon: 'MessagesSquare',
    title: 'Direct communication',
    description:
      'You talk to the person designing and writing the code. Nothing gets lost between account managers and subcontractors.',
  },
  {
    icon: 'Workflow',
    title: 'End-to-end ownership',
    description:
      'Architecture, interface, backend and deployment happen in one workflow, so nothing falls between handoffs.',
  },
  {
    icon: 'Braces',
    title: 'Technical consistency',
    description:
      'One set of conventions across the stack: typed code, shared design tokens and a predictable structure.',
  },
  {
    icon: 'Blocks',
    title: 'Maintainable architecture',
    description:
      'Clear boundaries between interface, business logic and data keep the product easy to change after launch.',
  },
  {
    icon: 'GitBranch',
    title: 'Clear process',
    description:
      'Defined stages with a visible result at the end of each one, so you always know what is done and what is next.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Long-term thinking',
    description:
      'Security, validation and performance are part of the first build, not a cleanup task before launch.',
  },
]

export const techStack: TechCategory[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    icon: 'PanelsTopLeft',
    items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'backend',
    title: 'Backend',
    icon: 'Server',
    items: ['Node.js', 'REST APIs', 'Authentication', 'Server-side validation'],
  },
  {
    id: 'database',
    title: 'Database',
    icon: 'Database',
    items: ['PostgreSQL', 'Supabase', 'Relational data modeling', 'Row-level security'],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure and tools',
    icon: 'Cloud',
    items: ['Git', 'GitHub', 'Vercel', 'Docker'],
  },
]

export const processSteps: ProcessStep[] = [
  {
    id: 'discover',
    title: 'Discover',
    description: 'Understand the goal, the users and the constraints.',
  },
  {
    id: 'plan',
    title: 'Plan',
    description: 'Agree on scope, architecture and milestones.',
  },
  {
    id: 'design',
    title: 'Design',
    description: 'Shape the interface and the data model together.',
  },
  {
    id: 'build',
    title: 'Build',
    description: 'Develop in small increments you can review.',
  },
  {
    id: 'test',
    title: 'Test',
    description: 'Check behavior, edge cases, devices and accessibility.',
  },
  {
    id: 'launch',
    title: 'Launch',
    description: 'Deploy to production with monitoring in place.',
  },
  {
    id: 'support',
    title: 'Support',
    description: 'Fix, improve and extend after release.',
  },
]

/**
 * Developer introduction. Replace `bio` with the real biography and add
 * `name` / `portrait` once they are ready — nothing personal is invented here.
 */
export const developer: DeveloperProfile = {
  bio: 'Artaveo is run by one independent full-stack developer. Every project is planned, designed, built and deployed by the same person — which keeps decisions consistent from the database schema to the last detail of the interface.',
  focus: [
    'Full-stack web applications',
    'React and Next.js interfaces',
    'PostgreSQL data modeling',
    'Multilingual and RTL products',
  ],
}

/**
 * Planned articles. They stay marked as “in writing” until `publishedAt`
 * and `readingMinutes` are set by the admin.
 */
export const insights: ArticlePreview[] = [
  {
    id: 'concurrent-seat-booking',
    slug: 'concurrent-seat-booking',
    title: 'Keeping seat bookings correct under concurrent requests',
    excerpt:
      'Why the database, not the browser, has to decide who owns a seat — and how holds and confirmations are modeled.',
    category: 'Backend',
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'rtl-first-interfaces',
    slug: 'rtl-first-interfaces',
    title: 'Building RTL-first interfaces with logical CSS',
    excerpt:
      'Practical notes on layouts that work in Persian and English without maintaining two sets of components.',
    category: 'Frontend',
    publishedAt: null,
    readingMinutes: null,
  },
  {
    id: 'offline-first-content',
    slug: 'offline-first-content',
    title: 'Offline-first data loading for content-driven sites',
    excerpt:
      'Rendering instantly from a local cache, then hydrating from the live database without showing stale state as truth.',
    category: 'Architecture',
    publishedAt: null,
    readingMinutes: null,
  },
]
