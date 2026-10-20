import 'server-only'

import { getDbClient } from './server'
import { galleryMediaIds, toPublicBlock, type BlockMediaAsset, type StoredBlockBody } from '@/lib/products/blocks'
import { moneyFromRow } from '@/lib/products/money'
import type {
  BillingPeriod,
  MaintenanceMode,
  ProjectPlatform,
  SaleOptionCta,
  SaleOptionKind,
  EngagementModel,
  FaqItem,
  LocalizedText,
  ProductSaleOption,
  ProductService,
  Project,
  ProjectBlock,
  ProjectMediaItem,
  Recommendation,
  Service,
  ServiceAddon,
  ServicePackage,
  ServiceProcessStep,
} from '@/types/content'

/**
 * Phase 12.2 selector-layer switch (roadmap § 12): read the Phase 12
 * entities — Project, Service, ServicePackage, ServiceAddon,
 * EngagementModel, Technology — from the database instead of
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
 * `getDbClient()`'s own callers in § 9.2, every function here
 * throws instead of silently returning an empty list when the client isn't
 * configured. A visibly broken page during a misconfigured deploy is
 * better than a page that silently renders "no projects" / "no services"
 * as if that were real content (§ 2 principle 15: never fake success).
 */

function requireClient() {
  const client = getDbClient()
  if (!client) {
    throw new Error(
      'The database is not configured (NEON_DATA_API_URL / NEON_SERVICE_JWT_PRIVATE_KEY) — ' +
        'content cannot be read from the database.',
    )
  }
  return client
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

/**
 * Phase 27: a project is read with its published blocks and — when it is a
 * product — its published sale options and after-sales services. The archived
 * engineering sections (`project_sections`, migration 0026) are not read at all.
 */

type ProjectMediaRow = {
  kind: string
  placement: string
  story_key: string | null
  story_anchor: string | null
  caption: LocalizedText | null
  sort_order: number
  media_assets: { url: string; alt: LocalizedText; width: number | null; height: number | null } | null
}

/** A `projects` row as the selectors read it (0003 + 0026). */
export type ProjectRow = {
  id: string
  slug: string
  title: LocalizedText
  category: LocalizedText
  summary: LocalizedText
  highlights: LocalizedText[] | null
  cover_image: string | null
  cover_media_id: string | null
  github_url: string | null
  live_url: string | null
  year: string | null
  related_service_slug: string | null
  featured: boolean
  published: boolean
  sort_order: number
  show_in_portfolio: boolean
  is_product: boolean
  brand_color: string | null
  accent_color: string | null
  industry: LocalizedText | null
  platforms: ProjectPlatform[] | null
  outcome_line: LocalizedText | null
  features: LocalizedText[] | null
  updated_at?: string
}

/** `product_sale_options` (0026). Amounts are `numeric`: the Data API may send them as strings. */
export type SaleOptionRow = {
  id: string
  project_id: string
  kind: SaleOptionKind
  title: LocalizedText
  summary: LocalizedText | null
  price_afn: number | string | null
  price_usd: number | string | null
  price_from: boolean
  billing_period: BillingPeriod
  maintenance: MaintenanceMode
  maintenance_price_afn: number | string | null
  maintenance_price_usd: number | string | null
  maintenance_period: 'month' | 'year' | null
  included: LocalizedText[] | null
  highlighted: boolean
  cta: SaleOptionCta
  published: boolean
  sort_order: number
}

/** `product_services` (0026). */
export type ProductServiceRow = {
  id: string
  project_id: string
  title: LocalizedText
  description: LocalizedText | null
  price_afn: number | string | null
  price_usd: number | string | null
  price_from: boolean
  period: BillingPeriod
  published: boolean
  sort_order: number
}

type BlockRow = { id: string; project_id: string; type: string; title: LocalizedText | null; body: StoredBlockBody | null; sort_order: number }
type TechLinkRow = { project_id: string; technologies: { name: string } | null }

const PROJECT_COLUMNS =
  'id, slug, title, category, summary, highlights, cover_image, cover_media_id, github_url, ' +
  'live_url, year, related_service_slug, featured, published, sort_order, show_in_portfolio, is_product, ' +
  'brand_color, accent_color, industry, platforms, outcome_line, features'

export function toSaleOption(row: SaleOptionRow): ProductSaleOption {
  const option: ProductSaleOption = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    price: moneyFromRow(row.price_afn, row.price_usd, row.price_from),
    billingPeriod: row.billing_period,
    maintenance: row.maintenance,
    included: row.included ?? [],
    highlighted: !!row.highlighted,
    cta: row.cta,
  }
  if (row.summary) option.summary = row.summary
  if (row.maintenance === 'optional') {
    option.maintenancePrice = moneyFromRow(row.maintenance_price_afn, row.maintenance_price_usd)
    if (row.maintenance_period) option.maintenancePeriod = row.maintenance_period
  }
  return option
}

export function toProductService(row: ProductServiceRow): ProductService {
  const service: ProductService = {
    id: row.id,
    title: row.title,
    price: moneyFromRow(row.price_afn, row.price_usd, row.price_from),
    period: row.period,
  }
  if (row.description) service.description = row.description
  return service
}

function groupByProject<T extends { project_id: string }>(rows: T[] | null | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows ?? []) {
    const list = map.get(row.project_id) ?? []
    list.push(row)
    map.set(row.project_id, list)
  }
  return map
}

/**
 * `drafts`: the admin preview only — the project, its blocks, options and services
 * whether published or not. Every public caller leaves it off.
 */
// The query builder's own generic type is not worth spelling out for a pass-through filter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFilter = (query: any) => any

async function fetchProjectsByFilter(filter: QueryFilter, { drafts = false }: { drafts?: boolean } = {}): Promise<Project[]> {
  const client = requireClient()

  let query = client.from('projects').select(PROJECT_COLUMNS).order('sort_order', { ascending: true })
  if (!drafts) query = query.eq('published', true)
  query = filter(query)

  const { data, error: projectError } = await query
  if (projectError) throw new Error(`Failed to load projects: ${projectError.message}`)
  const projectRows = (data ?? []) as unknown as ProjectRow[]
  if (projectRows.length === 0) return []

  const projectIds = projectRows.map((p) => p.id)
  const productIds = projectRows.filter((p) => p.is_product).map((p) => p.id)
  const none = Promise.resolve({ data: [] as never[], error: null })

  const [
    { data: blockRows, error: blockError },
    { data: techLinkRows, error: techLinkError },
    { data: mediaRows, error: mediaError },
    { data: optionRows, error: optionError },
    { data: serviceRows, error: serviceError },
  ] = await Promise.all([
    (drafts ? client.from('project_blocks').select('id, project_id, type, title, body, sort_order').in('project_id', projectIds) : client.from('project_blocks').select('id, project_id, type, title, body, sort_order').in('project_id', projectIds).eq('published', true)).order('sort_order', { ascending: true }),
    client.from('project_technologies').select('project_id, technologies(name)').in('project_id', projectIds),
    client
      .from('project_media')
      .select(
        'project_id, kind, placement, story_key, story_anchor, caption, sort_order, media_assets(url, alt, width, height)',
      )
      .in('project_id', projectIds),
    productIds.length
      ? (drafts ? client.from('product_sale_options').select('*').in('project_id', productIds) : client.from('product_sale_options').select('*').in('project_id', productIds).eq('published', true)).order('sort_order', { ascending: true })
      : none,
    productIds.length
      ? (drafts ? client.from('product_services').select('*').in('project_id', productIds) : client.from('product_services').select('*').in('project_id', productIds).eq('published', true)).order('sort_order', { ascending: true })
      : none,
  ])
  if (blockError) throw new Error(`Failed to load project_blocks: ${blockError.message}`)
  if (techLinkError) throw new Error(`Failed to load project_technologies: ${techLinkError.message}`)
  if (mediaError) throw new Error(`Failed to load project_media: ${mediaError.message}`)
  if (optionError) throw new Error(`Failed to load product_sale_options: ${optionError.message}`)
  if (serviceError) throw new Error(`Failed to load product_services: ${serviceError.message}`)

  // One query for every library image the projects point at: covers and gallery blocks.
  const assetIds = new Set<string>()
  const blocks = (blockRows ?? []) as unknown as BlockRow[]
  for (const row of projectRows) if (row.cover_media_id) assetIds.add(row.cover_media_id)
  for (const block of blocks) for (const id of galleryMediaIds(block.type, block.body ?? {})) assetIds.add(id)
  const mediaById = new Map<string, BlockMediaAsset>()
  if (assetIds.size > 0) {
    const { data: assets, error: assetError } = await client
      .from('media_assets')
      .select('id, url, alt, width, height')
      .in('id', [...assetIds])
    if (assetError) throw new Error(`Failed to load media_assets: ${assetError.message}`)
    for (const asset of (assets ?? []) as BlockMediaAsset[]) mediaById.set(asset.id, asset)
  }

  const blocksByProject = groupByProject(blocks)
  const mediaByProject = groupByProject((mediaRows ?? []) as unknown as (ProjectMediaRow & { project_id: string })[])
  const optionsByProject = groupByProject((optionRows ?? []) as unknown as SaleOptionRow[])
  const servicesByProject = groupByProject((serviceRows ?? []) as unknown as ProductServiceRow[])
  const techNamesByProject = new Map<string, string[]>()
  for (const row of (techLinkRows ?? []) as unknown as TechLinkRow[]) {
    const list = techNamesByProject.get(row.project_id) ?? []
    if (row.technologies?.name) list.push(row.technologies.name)
    techNamesByProject.set(row.project_id, list)
  }

  return projectRows.map((row): Project => {
    const media: ProjectMediaItem[] = (mediaByProject.get(row.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((m) => m.media_assets)
      .map((m) => ({
        src: m.media_assets!.url,
        alt: m.media_assets!.alt,
        caption: m.caption ?? undefined,
        kind: m.kind as ProjectMediaItem['kind'],
        placement: m.placement as ProjectMediaItem['placement'],
        storyKey: m.story_key ?? undefined,
        storyAnchor: m.story_anchor ?? undefined,
        width: m.media_assets!.width ?? undefined,
        height: m.media_assets!.height ?? undefined,
      }))

    const blocks: ProjectBlock[] = (blocksByProject.get(row.id) ?? [])
      .map((block) => toPublicBlock({ ...block, body: block.body ?? {} }, mediaById))
      .filter((block): block is ProjectBlock => block !== null)

    const cover = row.cover_media_id ? mediaById.get(row.cover_media_id) : undefined

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      summary: row.summary,
      highlights: row.highlights ?? [],
      technologies: techNamesByProject.get(row.id) ?? [],
      coverImage: cover?.url ?? row.cover_image ?? undefined,
      ...(media.length > 0 ? { media } : {}),
      githubUrl: row.github_url ?? undefined,
      liveUrl: row.live_url ?? undefined,
      year: row.year ?? undefined,
      featured: !!row.featured,
      published: !!row.published,
      relatedServiceSlug: row.related_service_slug ?? undefined,
      showInPortfolio: row.show_in_portfolio !== false,
      isProduct: !!row.is_product,
      brandColor: row.brand_color ?? undefined,
      accentColor: row.accent_color ?? undefined,
      industry: row.industry ?? undefined,
      platforms: row.platforms ?? [],
      outcomeLine: row.outcome_line ?? undefined,
      features: row.features ?? [],
      blocks,
      saleOptions: row.is_product ? (optionsByProject.get(row.id) ?? []).map(toSaleOption) : [],
      productServices: row.is_product ? (servicesByProject.get(row.id) ?? []).map(toProductService) : [],
    }
  })
}

/** Every published project (portfolio and products alike). */
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

/** Admin preview: one project as it would render, drafts included (callers check the admin session first). */
export async function queryProjectPreview(id: string): Promise<Project | undefined> {
  const projects = await fetchProjectsByFilter((q) => q.eq('id', id), { drafts: true })
  return projects[0]
}

/** Phase 27.3 — every published product, with its published ways to get it. */
export async function queryProducts(): Promise<Project[]> {
  return fetchProjectsByFilter((q) => q.eq('is_product', true))
}

/** Phase 30 — one published product by its address, with its published ways to get it and after-sales services. */
export async function queryProductBySlug(slug: string): Promise<Project | undefined> {
  const products = await fetchProjectsByFilter((q) => q.eq('is_product', true).eq('slug', slug))
  return products[0]
}

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------

function assembleService(
  row: Record<string, any>,
  processSteps: { title: LocalizedText; description: LocalizedText; sort_order: number }[],
  packagesIn: Record<string, any>[],
  addonsIn: Record<string, any>[],
  faqs: Record<string, any>[],
): Service {
  let packages = packagesIn
  let addons = addonsIn
  const service: Service = {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: row.title,
    description: row.description,
    deliverables: row.deliverables ?? [],
    type: row.type ?? undefined,
    kind: row.kind ?? undefined,
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

  const fromPrice = moneyFromRow(row.from_price_afn, row.from_price_usd, true)
  if (fromPrice.afn !== undefined || fromPrice.usd !== undefined) service.fromPrice = fromPrice

  // Phase 27.4: packages (and the add-ons sold with them) are optional per service.
  if (!row.show_packages) {
    packages = []
    addons = []
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
        'what_drives_cost, payment_schedule_note, published, sort_order, kind, from_price_afn, from_price_usd, show_packages',
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

/** Phase 31.2 — "how working together goes" on /services: the global FAQs (Content → Global FAQs), in the owner's order. */
export async function queryGlobalFaqs(): Promise<FaqItem[]> {
  const client = requireClient()
  const { data, error } = await client.from('faqs').select('question, answer, sort_order').eq('scope', 'global').order('sort_order', { ascending: true })
  if (error) throw new Error(`Failed to load faqs: ${error.message}`)
  return (data ?? []).map((row: any): FaqItem => ({ question: row.question, answer: row.answer }))
}

// ---------------------------------------------------------------------------
// engagement_models
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// recommendations (roadmap § 16)
// ---------------------------------------------------------------------------

/**
 * Public reads only ever see `status = 'approved'` rows — the same
 * `recommendations` RLS policy already enforces this at the database
 * level (0005); the explicit `.eq('status', 'approved')` here is the
 * same defense-in-depth every other selector in this file already
 * applies on top of RLS, not a substitute for it. `kind` is derived,
 * never stored (see 0015's migration header) — `'testimonial'` whenever
 * either related row is present, `'recommendation'` otherwise.
 */
export async function queryApprovedRecommendations(): Promise<Recommendation[]> {
  const client = requireClient()

  const { data, error } = await client
    .from('recommendations')
    .select(
      'id, person_name, person_title, company, relationship, statement, recommendation_date, ' +
        'source_url, verification, sort_order, projects(slug), services(slug)',
    )
    .eq('status', 'approved')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load recommendations: ${error.message}`)

  return (data ?? []).map((row: any): Recommendation => {
    const relatedProjectSlug = row.projects?.slug ?? undefined
    const relatedServiceSlug = row.services?.slug ?? undefined
    return {
      id: row.id,
      personName: row.person_name,
      personTitle: row.person_title ?? undefined,
      company: row.company ?? undefined,
      relationship: row.relationship,
      statement: row.statement,
      recommendationDate: row.recommendation_date ?? undefined,
      sourceUrl: row.source_url ?? undefined,
      verification: row.verification ?? 'verified-request',
      relatedProjectSlug,
      relatedServiceSlug,
      kind: relatedProjectSlug || relatedServiceSlug ? 'testimonial' : 'recommendation',
    }
  })
}

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
