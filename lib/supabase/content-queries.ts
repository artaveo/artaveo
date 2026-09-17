import 'server-only'

import { getSupabaseServerClient } from './server'
import type {
  DecisionRecord,
  EngagementModel,
  FaqItem,
  LocalizedText,
  Project,
  ProjectMediaItem,
  Service,
  ServiceAddon,
  ServicePackage,
  ServiceProcessStep,
} from '@/types/content'

/**
 * Phase 12.2 selector-layer switch (roadmap § 12): read the Phase 12
 * entities — Project, Service, ServicePackage, ServiceAddon,
 * EngagementModel, Technology — from Supabase instead of
 * `lib/home-content.ts`/`lib/services-content.ts`'s static arrays. Those
 * two files still hold the file-based content for everything NOT in that
 * list (Capability, Principle, ProcessStep, WorkingLanguage, ProcessPhase,
 * QualityCommitment, WorkingAgreementItem, HireChannel) and still hold the
 * raw arrays this module's data came from — `scripts/import-content-to-db.ts`
 * reads those raw arrays directly (`getAllProjectsRaw()` /
 * `getAllServicesRaw()` / `getEngagementModelsRaw()`), never through this
 * file, so the import script's source and this module's destination never
 * become the same object.
 *
 * By this phase the database is mandatory infrastructure, not an optional
 * enhancement the way `inquiries` was before D-10 — so unlike
 * `getSupabaseServerClient()`'s own callers in § 9.2, every function here
 * throws instead of silently returning an empty list when the client isn't
 * configured. A visibly broken page during a misconfigured deploy is
 * better than a page that silently renders "no projects" / "no services"
 * as if that were real content (§ 2 principle 15: never fake success).
 */

function requireClient() {
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error(
      'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — ' +
        'content cannot be read from the database.',
    )
  }
  return client
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

type ProjectSectionRow = { type: string; body: unknown; sort_order: number }

const SINGLE_SECTION_TYPES: Record<string, keyof Project> = {
  context: 'context',
  'problem-and-goals': 'problemAndGoals',
  architecture: 'architecture',
  'engineering-highlight': 'engineeringHighlight',
  'data-integrity-and-security': 'dataIntegrityAndSecurity',
  'responsive-and-rtl': 'responsiveAndRtl',
  quality: 'quality',
  'current-status-and-next': 'currentStatusAndNext',
  'lessons-learned': 'lessonsLearned',
}

type ProjectMediaRow = {
  kind: string
  placement: string
  caption: LocalizedText | null
  sort_order: number
  media_assets: { url: string; alt: LocalizedText } | null
}

function assembleProject(
  row: Record<string, any>,
  sections: ProjectSectionRow[],
  technologyNames: string[],
  mediaRows: ProjectMediaRow[],
): Project {
  const project: Project = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    highlights: row.highlights ?? [],
    technologies: technologyNames,
    status: row.status ?? undefined,
    coverImage: row.cover_image ?? undefined,
    githubUrl: row.github_url ?? undefined,
    liveUrl: row.live_url ?? undefined,
    year: row.year ?? undefined,
    role: row.role ?? undefined,
    featured: !!row.featured,
    published: !!row.published,
    relatedServiceSlug: row.related_service_slug ?? undefined,
  }

  const constraints: LocalizedText[] = []
  const keyDecisions: DecisionRecord[] = []

  for (const section of [...sections].sort((a, b) => a.sort_order - b.sort_order)) {
    if (section.type === 'constraint') {
      constraints.push(section.body as LocalizedText)
    } else if (section.type === 'key-decision') {
      keyDecisions.push(section.body as DecisionRecord)
    } else {
      const field = SINGLE_SECTION_TYPES[section.type]
      if (field) (project as any)[field] = section.body
    }
  }

  if (constraints.length > 0) project.constraints = constraints
  if (keyDecisions.length > 0) project.keyDecisions = keyDecisions

  const media: ProjectMediaItem[] = [...mediaRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((m) => m.media_assets)
    .map((m) => ({
      src: m.media_assets!.url,
      alt: m.media_assets!.alt,
      caption: m.caption ?? undefined,
      kind: m.kind as ProjectMediaItem['kind'],
      placement: m.placement as ProjectMediaItem['placement'],
    }))
  if (media.length > 0) project.media = media

  return project
}

async function fetchProjectsByFilter(filter: (query: any) => any): Promise<Project[]> {
  const client = requireClient()

  let query = client
    .from('projects')
    .select(
      'id, slug, title, category, summary, highlights, status, cover_image, github_url, ' +
        'live_url, year, role, related_service_slug, featured, published, sort_order',
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })
  query = filter(query)

  const { data: projectRows, error: projectError } = await query
  if (projectError) throw new Error(`Failed to load projects: ${projectError.message}`)
  if (!projectRows || projectRows.length === 0) return []

  const projectIds = projectRows.map((p: any) => p.id)

  const [
    { data: sectionRows, error: sectionError },
    { data: techLinkRows, error: techLinkError },
    { data: mediaRows, error: mediaError },
  ] = await Promise.all([
    client
      .from('project_sections')
      .select('project_id, type, body, sort_order')
      .in('project_id', projectIds),
    client
      .from('project_technologies')
      .select('project_id, technologies(name)')
      .in('project_id', projectIds),
    client
      .from('project_media')
      .select('project_id, kind, placement, caption, sort_order, media_assets(url, alt)')
      .in('project_id', projectIds),
  ])
  if (sectionError) throw new Error(`Failed to load project_sections: ${sectionError.message}`)
  if (techLinkError) throw new Error(`Failed to load project_technologies: ${techLinkError.message}`)
  if (mediaError) throw new Error(`Failed to load project_media: ${mediaError.message}`)

  const sectionsByProject = new Map<string, ProjectSectionRow[]>()
  for (const row of sectionRows ?? []) {
    const list = sectionsByProject.get(row.project_id) ?? []
    list.push(row)
    sectionsByProject.set(row.project_id, list)
  }

  const techNamesByProject = new Map<string, string[]>()
  for (const row of (techLinkRows ?? []) as any[]) {
    const list = techNamesByProject.get(row.project_id) ?? []
    if (row.technologies?.name) list.push(row.technologies.name)
    techNamesByProject.set(row.project_id, list)
  }

  const mediaByProject = new Map<string, ProjectMediaRow[]>()
  for (const row of (mediaRows ?? []) as any[]) {
    const list = mediaByProject.get(row.project_id) ?? []
    list.push(row)
    mediaByProject.set(row.project_id, list)
  }

  return projectRows.map((row: any) =>
    assembleProject(
      row,
      sectionsByProject.get(row.id) ?? [],
      techNamesByProject.get(row.id) ?? [],
      mediaByProject.get(row.id) ?? [],
    ),
  )
}

export async function queryAllProjects(): Promise<Project[]> {
  return fetchProjectsByFilter((q) => q)
}

export async function queryFeaturedProjects(): Promise<Project[]> {
  return fetchProjectsByFilter((q) => q.eq('featured', true))
}

export async function queryProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await fetchProjectsByFilter((q) => q.eq('slug', slug))
  return projects[0]
}

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------

function assembleService(
  row: Record<string, any>,
  processSteps: { title: LocalizedText; description: LocalizedText; sort_order: number }[],
  packages: Record<string, any>[],
  addons: Record<string, any>[],
  faqs: Record<string, any>[],
): Service {
  const service: Service = {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: row.title,
    description: row.description,
    deliverables: row.deliverables ?? [],
    type: row.type ?? undefined,
    tagline: row.tagline ?? undefined,
    forWhom: row.for_whom?.length ? row.for_whom : undefined,
    notForWhom: row.not_for_whom?.length ? row.not_for_whom : undefined,
    problem: row.problem ?? undefined,
    whatIDo: row.what_i_do?.length ? row.what_i_do : undefined,
    included: row.included?.length ? row.included : undefined,
    notIncluded: row.not_included?.length ? row.not_included : undefined,
    timeline: row.timeline ?? undefined,
    requirements: row.requirements?.length ? row.requirements : undefined,
    relatedProjectSlugs: row.related_project_slugs?.length ? row.related_project_slugs : undefined,
    whatDrivesCost: row.what_drives_cost?.length ? row.what_drives_cost : undefined,
    paymentScheduleNote: row.payment_schedule_note ?? undefined,
  }

  if (processSteps.length > 0) {
    service.process = [...processSteps]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s): ServiceProcessStep => ({ title: s.title, description: s.description }))
  }

  if (packages.length > 0) {
    service.packages = packages.map(
      (pkg): ServicePackage => ({
        id: pkg.tier,
        name: pkg.name,
        summary: pkg.summary,
        forWhom: pkg.for_whom,
        included: pkg.included ?? [],
        notIncluded: pkg.not_included ?? [],
        deliverables: pkg.deliverables ?? [],
        deliveryDays:
          pkg.delivery_days_min != null && pkg.delivery_days_max != null
            ? { min: pkg.delivery_days_min, max: pkg.delivery_days_max }
            : undefined,
        revisions: pkg.revisions ?? undefined,
        supportDays: pkg.support_days ?? undefined,
        requirements: pkg.requirements?.length ? pkg.requirements : undefined,
        price: {
          type: pkg.price_type,
          amount: pkg.price_amount ?? undefined,
          currency: pkg.price_currency ?? undefined,
        },
      }),
    )
  }

  if (addons.length > 0) {
    service.addOns = [...addons]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (addon): ServiceAddon => ({
          id: addon.id,
          title: addon.title,
          description: addon.description,
          price: {
            type: addon.price_type,
            amount: addon.price_amount ?? undefined,
            currency: addon.price_currency ?? undefined,
          },
          deliveryImpactDays: addon.delivery_impact_days ?? undefined,
        }),
      )
  }

  if (faqs.length > 0) {
    service.faq = [...faqs]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f): FaqItem => ({ question: f.question, answer: f.answer }))
  }

  return service
}

async function fetchServicesByFilter(filter: (query: any) => any): Promise<Service[]> {
  const client = requireClient()

  let query = client
    .from('services')
    .select(
      'id, slug, icon, title, description, deliverables, type, tagline, for_whom, not_for_whom, ' +
        'problem, what_i_do, included, not_included, timeline, requirements, related_project_slugs, ' +
        'what_drives_cost, payment_schedule_note, published, sort_order',
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })
  query = filter(query)

  const { data: serviceRows, error: serviceError } = await query
  if (serviceError) throw new Error(`Failed to load services: ${serviceError.message}`)
  if (!serviceRows || serviceRows.length === 0) return []

  const serviceIds = serviceRows.map((s: any) => s.id)

  const [
    { data: stepRows, error: stepError },
    { data: packageRows, error: packageError },
    { data: addonRows, error: addonError },
    { data: faqRows, error: faqError },
  ] = await Promise.all([
    client.from('service_process_steps').select('service_id, title, description, sort_order').in('service_id', serviceIds),
    client.from('service_packages').select('*').in('service_id', serviceIds),
    client.from('service_addons').select('*').in('service_id', serviceIds),
    client.from('faqs').select('*').eq('scope', 'service').in('service_id', serviceIds),
  ])
  if (stepError) throw new Error(`Failed to load service_process_steps: ${stepError.message}`)
  if (packageError) throw new Error(`Failed to load service_packages: ${packageError.message}`)
  if (addonError) throw new Error(`Failed to load service_addons: ${addonError.message}`)
  if (faqError) throw new Error(`Failed to load faqs: ${faqError.message}`)

  const groupBy = <T extends { service_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>()
    for (const row of rows ?? []) {
      const list = map.get(row.service_id) ?? []
      list.push(row)
      map.set(row.service_id, list)
    }
    return map
  }

  type ProcessStepRow = { service_id: string; title: LocalizedText; description: LocalizedText; sort_order: number }
  const stepsByService = groupBy<ProcessStepRow>(stepRows as ProcessStepRow[] | null)
  const packagesByService = groupBy(packageRows as any)
  const addonsByService = groupBy(addonRows as any)
  const faqsByService = groupBy(faqRows as any)

  return serviceRows.map((row: any) =>
    assembleService(
      row,
      stepsByService.get(row.id) ?? [],
      packagesByService.get(row.id) ?? [],
      addonsByService.get(row.id) ?? [],
      faqsByService.get(row.id) ?? [],
    ),
  )
}

export async function queryAllServices(): Promise<Service[]> {
  return fetchServicesByFilter((q) => q)
}

export async function queryServiceBySlug(slug: string): Promise<Service | undefined> {
  const services = await fetchServicesByFilter((q) => q.eq('slug', slug))
  return services[0]
}

// ---------------------------------------------------------------------------
// engagement_models
// ---------------------------------------------------------------------------

export async function queryEngagementModels(): Promise<EngagementModel[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_models')
    .select('slug, title, when_it_fits, billing, sort_order')
    .eq('published', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`Failed to load engagement_models: ${error.message}`)

  return (data ?? []).map(
    (row: any): EngagementModel => ({
      id: row.slug,
      name: row.title,
      whenItFits: row.when_it_fits,
      billing: row.billing,
    }),
  )
}
