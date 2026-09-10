export const featuredProjects = [
  {
    slug: 'atlas-analytics',
    title: 'Atlas Analytics',
    category: 'SaaS Platform',
    year: '2024',
    summary:
      'A real-time analytics platform rebuilt from a slow legacy stack into a fast, streaming dashboard used by thousands of teams daily.',
    image: '/images/work-analytics.png',
    metrics: [
      { value: '9x', label: 'Faster queries' },
      { value: '40%', label: 'Lower infra cost' },
    ],
    stack: ['Next.js', 'PostgreSQL', 'Redis'],
  },
  {
    slug: 'meridian-pay',
    title: 'Meridian Pay',
    category: 'Fintech App',
    year: '2024',
    summary:
      'End-to-end product design and engineering for a consumer banking app — from onboarding flows to a hardened payments backend.',
    image: '/images/work-fintech.png',
    metrics: [
      { value: '4.9', label: 'App store rating' },
      { value: '<200ms', label: 'p95 latency' },
    ],
    stack: ['React Native', 'Node', 'Stripe'],
  },
  {
    slug: 'northline-commerce',
    title: 'Northline Commerce',
    category: 'E-commerce',
    year: '2023',
    summary:
      'A headless storefront and custom checkout that cut page load times in half and lifted conversion across every market.',
    image: '/images/work-commerce.png',
    metrics: [
      { value: '+32%', label: 'Conversion' },
      { value: '0.4s', label: 'LCP' },
    ],
    stack: ['Next.js', 'Shopify', 'Vercel'],
  },
]

export const services = [
  {
    icon: 'Compass',
    title: 'Product & Architecture',
    description:
      'Turning a vague idea into a concrete plan — system design, data modeling, and a roadmap you can actually ship against.',
    points: ['Technical discovery', 'System architecture', 'Roadmapping'],
  },
  {
    icon: 'Palette',
    title: 'Design Systems',
    description:
      'Reusable, themeable component libraries and design tokens that keep a growing product consistent and fast to build.',
    points: ['Tokens & theming', 'Component libraries', 'Accessibility'],
  },
  {
    icon: 'Code',
    title: 'Full-Stack Engineering',
    description:
      'Frontend, backend, and everything between — typed end to end, tested, and built to survive real production traffic.',
    points: ['Web & API', 'Databases', 'Auth & payments'],
  },
  {
    icon: 'Rocket',
    title: 'Ship & Scale',
    description:
      'Deployment, observability, and performance work that keeps the product fast and reliable as usage grows.',
    points: ['CI/CD', 'Observability', 'Performance'],
  },
]

export const differentiators = [
  {
    icon: 'Radar',
    title: 'One team, end to end',
    description:
      'You work directly with the people writing the code. No handoffs, no telephone game between agency layers.',
  },
  {
    icon: 'Gauge',
    title: 'Performance as a default',
    description:
      'Speed is a feature. Every build is measured against real Core Web Vitals, not just a lighthouse screenshot.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Production-grade from day one',
    description:
      'Auth, validation, error handling, and security are built in from the first commit — not bolted on before launch.',
  },
  {
    icon: 'GitBranch',
    title: 'Transparent by process',
    description:
      'Small, reviewable pull requests and clear updates. You always know exactly where the project stands.',
  },
]

export const techStack = [
  { name: 'TypeScript', icon: 'Braces' },
  { name: 'Next.js', icon: 'Component' },
  { name: 'React', icon: 'Boxes' },
  { name: 'Node.js', icon: 'Server' },
  { name: 'PostgreSQL', icon: 'Database' },
  { name: 'Redis', icon: 'Zap' },
  { name: 'Tailwind CSS', icon: 'Palette' },
  { name: 'Vercel', icon: 'Cloud' },
  { name: 'Docker', icon: 'Blocks' },
  { name: 'GraphQL', icon: 'Workflow' },
  { name: 'Playwright', icon: 'Radar' },
  { name: 'AI SDK', icon: 'Sparkles' },
]

export const processSteps = [
  {
    step: '01',
    title: 'Discover',
    description:
      'We map the problem, the users, and the constraints — then agree on what success actually looks like.',
  },
  {
    step: '02',
    title: 'Design',
    description:
      'Architecture and interface take shape together, validated with prototypes before a line of production code.',
  },
  {
    step: '03',
    title: 'Build',
    description:
      'Tight, iterative delivery in small reviewable increments so you see working software every week.',
  },
  {
    step: '04',
    title: 'Ship & Support',
    description:
      'We launch, measure, and keep improving — with monitoring and a clear handover, or an ongoing partnership.',
  },
]

export const insights = [
  {
    slug: 'design-tokens-that-scale',
    title: 'Design tokens that actually scale across products',
    category: 'Design Systems',
    readingTime: '6 min read',
    date: 'Mar 2024',
  },
  {
    slug: 'shipping-fast-without-breaking',
    title: 'Shipping fast without breaking production',
    category: 'Engineering',
    readingTime: '8 min read',
    date: 'Feb 2024',
  },
  {
    slug: 'measuring-web-vitals',
    title: 'Measuring the Web Vitals that users feel',
    category: 'Performance',
    readingTime: '5 min read',
    date: 'Jan 2024',
  },
]
