import 'server-only'

import { listMediaAssets } from '@/lib/admin/media'
import { requireSupabase } from '@/lib/admin/pipeline'
import { normalizeCategory } from '@/lib/articles/category'
import type { DecisionRecord, LocalizedText } from '@/types/content'
import type {
  AdminArticle,
  AdminEngagementModel,
  AdminFaqItem,
  AdminProcessStep,
  AdminProject,
  AdminRecommendation,
  AdminRecommendationRequest,
  AdminService,
  AdminServiceAddon,
  AdminServiceListItem,
  AdminServicePackage,
  AdminTechnology,
  LocaleCompleteness,
  RecommendationRequestStatus,
  RecommendationStatus,
  ArticleFormOptions,
} from '@/types/cms'

/**
 * Admin read layer for the § 15.1 Services cluster. Unlike
 * `lib/supabase/content-queries.ts` (the public selector layer, which
 * `.eq('published', true)` on every query and throws when Supabase isn't
 * configured — § 12.2's "database is mandatory infrastructure" rule),
 * these functions read every row regardless of `published` (an editor
 * must be able to open and finish a draft) and return `null` rather than
 * throwing when Supabase isn't configured, matching every other
 * `lib/admin/*` module's "not configured" convention (`lib/admin/pipeline.ts`)
 * so the admin UI can show the same honest not-configured state the leads
 * pages already use instead of a hard 500.
 */

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** A single `LocalizedText`'s completeness: both locales must have non-empty text. */
function textComplete(value: LocalizedText | null | undefined): LocaleCompleteness {
  return { en: isNonEmpty(value?.en), fa: isNonEmpty(value?.fa) }
}

function mergeCompleteness(items: LocaleCompleteness[]): LocaleCompleteness {
  return {
    en: items.every((item) => item.en),
    fa: items.every((item) => item.fa),
  }
}

/**
 * § 15's "publishing a locale requires its required fields" — the
 * required fields are the ones the `services` table itself declares
 * `not null` (`title`, `description`): everything else on `Service` is
 * optional content that may legitimately still be empty in a published
 * service (roadmap § 7.1's own "empty means hidden" rule). Fields the
 * editor *has* started filling in are still checked per-locale so a
 * half-translated bullet doesn't silently ship — but an entirely absent
 * optional field never blocks completeness.
 */
export function serviceCompleteness(service: {
  title: LocalizedText
  description: LocalizedText
  tagline?: LocalizedText | null
  problem?: LocalizedText | null
  timeline?: LocalizedText | null
  paymentScheduleNote?: LocalizedText | null
  forWhom?: LocalizedText[]
  notForWhom?: LocalizedText[]
  whatIDo?: LocalizedText[]
  included?: LocalizedText[]
  notIncluded?: LocalizedText[]
  requirements?: LocalizedText[]
  whatDrivesCost?: LocalizedText[]
  deliverables?: LocalizedText[]
}): LocaleCompleteness {
  const checks: LocaleCompleteness[] = [textComplete(service.title), textComplete(service.description)]
  for (const optional of [service.tagline, service.problem, service.timeline, service.paymentScheduleNote]) {
    if (optional) checks.push(textComplete(optional))
  }
  for (const list of [
    service.forWhom,
    service.notForWhom,
    service.whatIDo,
    service.included,
    service.notIncluded,
    service.requirements,
    service.whatDrivesCost,
    service.deliverables,
  ]) {
    for (const item of list ?? []) checks.push(textComplete(item))
  }
  return mergeCompleteness(checks)
}

export function engagementModelCompleteness(model: {
  title: LocalizedText
  whenItFits: LocalizedText
  billing: LocalizedText
}): LocaleCompleteness {
  return mergeCompleteness([textComplete(model.title), textComplete(model.whenItFits), textComplete(model.billing)])
}

export function packageCompleteness(pkg: {
  name: LocalizedText
  summary: LocalizedText
  forWhom: LocalizedText
  included?: LocalizedText[]
  notIncluded?: LocalizedText[]
  deliverables?: LocalizedText[]
  requirements?: LocalizedText[]
}): LocaleCompleteness {
  const checks = [textComplete(pkg.name), textComplete(pkg.summary), textComplete(pkg.forWhom)]
  for (const list of [pkg.included, pkg.notIncluded, pkg.deliverables, pkg.requirements]) {
    for (const item of list ?? []) checks.push(textComplete(item))
  }
  return mergeCompleteness(checks)
}

export function addonCompleteness(addon: { title: LocalizedText; description: LocalizedText }): LocaleCompleteness {
  return mergeCompleteness([textComplete(addon.title), textComplete(addon.description)])
}

export function faqCompleteness(faq: { question: LocalizedText; answer: LocalizedText }): LocaleCompleteness {
  return mergeCompleteness([textComplete(faq.question), textComplete(faq.answer)])
}

function assembleAdminService(
  row: Record<string, any>,
  steps: Record<string, any>[],
  packages: Record<string, any>[],
  addons: Record<string, any>[],
  faqs: Record<string, any>[],
): AdminService {
  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: row.title,
    description: row.description,
    deliverables: row.deliverables ?? [],
    type: row.type ?? undefined,
    tagline: row.tagline ?? undefined,
    forWhom: row.for_whom ?? [],
    notForWhom: row.not_for_whom ?? [],
    problem: row.problem ?? undefined,
    whatIDo: row.what_i_do ?? [],
    included: row.included ?? [],
    notIncluded: row.not_included ?? [],
    timeline: row.timeline ?? undefined,
    requirements: row.requirements ?? [],
    relatedProjectSlugs: row.related_project_slugs ?? [],
    whatDrivesCost: row.what_drives_cost ?? [],
    paymentScheduleNote: row.payment_schedule_note ?? undefined,
    published: !!row.published,
    updatedAt: row.updated_at,
    process: [...steps]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s): AdminProcessStep => ({ id: s.id, title: s.title, description: s.description, sortOrder: s.sort_order })),
    packages: [...packages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (pkg): AdminServicePackage => ({
          id: pkg.tier,
          rowId: pkg.id,
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
          requirements: pkg.requirements ?? [],
          price: { type: pkg.price_type, amount: pkg.price_amount ?? undefined, currency: pkg.price_currency ?? undefined },
          sortOrder: pkg.sort_order,
        }),
      ),
    addOns: [...addons]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (addon): AdminServiceAddon => ({
          id: addon.id,
          title: addon.title,
          description: addon.description,
          price: { type: addon.price_type, amount: addon.price_amount ?? undefined, currency: addon.price_currency ?? undefined },
          deliveryImpactDays: addon.delivery_impact_days ?? undefined,
          sortOrder: addon.sort_order,
        }),
      ),
    faq: [...faqs]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f): AdminFaqItem => ({ id: f.id, question: f.question, answer: f.answer, sortOrder: f.sort_order })),
  }
}

const SERVICE_COLUMNS =
  'id, slug, icon, title, description, deliverables, type, tagline, for_whom, not_for_whom, problem, ' +
  'what_i_do, included, not_included, timeline, requirements, related_project_slugs, what_drives_cost, ' +
  'payment_schedule_note, published, sort_order, updated_at'

export async function listServicesAdmin(): Promise<AdminServiceListItem[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .order('sort_order', { ascending: true })
  if (error || !data) {
    console.error('listServicesAdmin failed:', error)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type ?? undefined,
    published: !!row.published,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    completeness: serviceCompleteness({
      title: row.title,
      description: row.description,
      tagline: row.tagline,
      problem: row.problem,
      timeline: row.timeline,
      paymentScheduleNote: row.payment_schedule_note,
      forWhom: row.for_whom,
      notForWhom: row.not_for_whom,
      whatIDo: row.what_i_do,
      included: row.included,
      notIncluded: row.not_included,
      requirements: row.requirements,
      whatDrivesCost: row.what_drives_cost,
      deliverables: row.deliverables,
    }),
  }))
}

export async function getServiceAdmin(id: string): Promise<AdminService | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase.from('services').select(SERVICE_COLUMNS).eq('id', id).maybeSingle()
  if (error || !row) return null

  const [{ data: steps }, { data: packages }, { data: addons }, { data: faqs }] = await Promise.all([
    supabase.from('service_process_steps').select('*').eq('service_id', id),
    supabase.from('service_packages').select('*').eq('service_id', id),
    supabase.from('service_addons').select('*').eq('service_id', id),
    supabase.from('faqs').select('*').eq('scope', 'service').eq('service_id', id),
  ])

  return assembleAdminService(row, steps ?? [], packages ?? [], addons ?? [], faqs ?? [])
}

export async function listGlobalFaqsAdmin(): Promise<AdminFaqItem[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('faqs')
    .select('id, question, answer, sort_order')
    .eq('scope', 'global')
    .order('sort_order', { ascending: true })
  if (error || !data) {
    console.error('listGlobalFaqsAdmin failed:', error)
    return []
  }

  return data.map((row: any) => ({ id: row.id, question: row.question, answer: row.answer, sortOrder: row.sort_order }))
}

export async function listEngagementModelsAdmin(): Promise<AdminEngagementModel[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('engagement_models')
    .select('id, slug, title, when_it_fits, billing, published, sort_order, updated_at')
    .order('sort_order', { ascending: true })
  if (error || !data) {
    console.error('listEngagementModelsAdmin failed:', error)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    whenItFits: row.when_it_fits,
    billing: row.billing,
    published: !!row.published,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }))
}

export async function getEngagementModelAdmin(id: string): Promise<AdminEngagementModel | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase
    .from('engagement_models')
    .select('id, slug, title, when_it_fits, billing, published, sort_order, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !row) return null

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    whenItFits: row.when_it_fits,
    billing: row.billing,
    published: !!row.published,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }
}

// ---------------------------------------------------------------------------
// projects (§ 15.2)
// ---------------------------------------------------------------------------

const SINGLE_SECTION_FIELDS = [
  'context',
  'problemAndGoals',
  'architecture',
  'engineeringHighlight',
  'dataIntegrityAndSecurity',
  'responsiveAndRtl',
  'quality',
  'currentStatusAndNext',
  'lessonsLearned',
] as const

/**
 * § 15's "required fields" for a project: `title`, `category`, `summary`
 * (the three `not null` columns on `projects`, 0003). The whole
 * case-study body is optional content — § 6.1's own "omitted, never
 * guessed" rule — so an entirely unwritten case study never blocks
 * publishing; a *partially* written one is checked per-locale like
 * every other entity, so a half-translated section can't silently ship.
 */
export function projectCompleteness(project: {
  title: LocalizedText
  category: LocalizedText
  summary: LocalizedText
  highlights?: LocalizedText[]
  role?: LocalizedText | null
  context?: LocalizedText | null
  problemAndGoals?: LocalizedText | null
  constraints?: LocalizedText[]
  architecture?: LocalizedText | null
  keyDecisions?: DecisionRecord[]
  engineeringHighlight?: LocalizedText | null
  dataIntegrityAndSecurity?: LocalizedText | null
  responsiveAndRtl?: LocalizedText | null
  quality?: LocalizedText | null
  currentStatusAndNext?: LocalizedText | null
  lessonsLearned?: LocalizedText | null
}): LocaleCompleteness {
  const checks: LocaleCompleteness[] = [
    textComplete(project.title),
    textComplete(project.category),
    textComplete(project.summary),
  ]
  for (const field of SINGLE_SECTION_FIELDS) {
    const value = (project as unknown as Record<string, LocalizedText | null | undefined>)[field]
    if (value) checks.push(textComplete(value))
  }
  if (project.role) checks.push(textComplete(project.role))
  for (const item of project.highlights ?? []) checks.push(textComplete(item))
  for (const item of project.constraints ?? []) checks.push(textComplete(item))
  for (const decision of project.keyDecisions ?? []) {
    checks.push(textComplete(decision.context), textComplete(decision.decision), textComplete(decision.tradeoff))
  }
  return mergeCompleteness(checks)
}

type ProjectSectionRow = { type: string; body: any; sort_order: number }

const PROJECT_COLUMNS =
  'id, slug, title, category, summary, highlights, status, cover_image, github_url, live_url, year, role, ' +
  'related_service_slug, featured, published, sort_order, updated_at'

function assembleAdminProject(row: Record<string, any>, sections: ProjectSectionRow[], technologyNames: string[]): AdminProject {
  const project: AdminProject = {
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
    updatedAt: row.updated_at,
  }

  const constraints: LocalizedText[] = []
  const keyDecisions: DecisionRecord[] = []
  const SINGLE_SECTION_TYPES: Record<string, string> = {
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

  return project
}

export async function listProjectsAdmin(): Promise<(AdminProject & { completeness: LocaleCompleteness })[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: rows, error } = await supabase.from('projects').select(PROJECT_COLUMNS).order('sort_order', { ascending: true })
  if (error || !rows) {
    console.error('listProjectsAdmin failed:', error)
    return []
  }
  if (rows.length === 0) return []

  const ids = rows.map((r: any) => r.id)
  const [{ data: sectionRows }, { data: techLinkRows }] = await Promise.all([
    supabase.from('project_sections').select('project_id, type, body, sort_order').in('project_id', ids),
    supabase.from('project_technologies').select('project_id, technologies(name)').in('project_id', ids),
  ])

  const sectionsByProject = new Map<string, ProjectSectionRow[]>()
  for (const row of sectionRows ?? []) {
    const list = sectionsByProject.get((row as any).project_id) ?? []
    list.push(row as ProjectSectionRow)
    sectionsByProject.set((row as any).project_id, list)
  }
  const techNamesByProject = new Map<string, string[]>()
  for (const row of (techLinkRows ?? []) as any[]) {
    const list = techNamesByProject.get(row.project_id) ?? []
    if (row.technologies?.name) list.push(row.technologies.name)
    techNamesByProject.set(row.project_id, list)
  }

  return rows.map((row: any) => {
    const project = assembleAdminProject(row, sectionsByProject.get(row.id) ?? [], techNamesByProject.get(row.id) ?? [])
    return { ...project, completeness: projectCompleteness(project) }
  })
}

export async function getProjectAdmin(id: string): Promise<AdminProject | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase.from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle()
  if (error || !row) return null

  const [{ data: sections }, { data: techLinks }] = await Promise.all([
    supabase.from('project_sections').select('project_id, type, body, sort_order').eq('project_id', id),
    supabase.from('project_technologies').select('project_id, technologies(name)').eq('project_id', id),
  ])

  const technologyNames = ((techLinks ?? []) as any[]).map((row) => row.technologies?.name).filter(Boolean)
  return assembleAdminProject(row, (sections ?? []) as ProjectSectionRow[], technologyNames)
}

export async function listTechnologiesAdmin(): Promise<AdminTechnology[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('technologies').select('id, slug, name, category').order('category', { ascending: true }).order('name', { ascending: true })
  if (error || !data) {
    console.error('listTechnologiesAdmin failed:', error)
    return []
  }
  return data as AdminTechnology[]
}

/** The technology ids currently linked to a project — separate from `getProjectAdmin`'s `technologies: string[]` (names, the public shape) because the project *form* needs real ids to drive a checkbox picker against `listTechnologiesAdmin()`. */
export async function getProjectTechnologyIds(projectId: string): Promise<string[]> {
  const supabase = requireSupabase()
  if (!supabase) return []

  const { data } = await supabase.from('project_technologies').select('technology_id').eq('project_id', projectId)
  return (data ?? []).map((row: any) => row.technology_id)
}

// ---------------------------------------------------------------------------
// articles (§ 15.2)
// ---------------------------------------------------------------------------

/** § 15's "required fields" for an article: `title`, `excerpt`, `body` (the `not null` columns, 0005). `category` is optional and checked only if present, same pattern as every other entity. */
export function articleCompleteness(article: {
  title: LocalizedText
  excerpt: LocalizedText
  body: LocalizedText
  category?: LocalizedText | null
}): LocaleCompleteness {
  const checks = [textComplete(article.title), textComplete(article.excerpt), textComplete(article.body)]
  if (article.category) checks.push(textComplete(article.category))
  return mergeCompleteness(checks)
}

const ARTICLE_COLUMNS = 'id, slug, title, excerpt, body, category, status, published_at, updated_at'

function assembleAdminArticle(
  row: Record<string, any>,
  relations: { projectIds: string[]; serviceIds: string[]; relatedArticleIds: string[] },
): AdminArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: normalizeCategory(row.category),
    status: row.status,
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at,
    ...relations,
  }
}

const NO_RELATIONS = { projectIds: [], serviceIds: [], relatedArticleIds: [] }

export async function listArticlesAdmin(): Promise<(AdminArticle & { completeness: LocaleCompleteness })[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('articles').select(ARTICLE_COLUMNS).order('updated_at', { ascending: false })
  if (error || !data) {
    console.error('listArticlesAdmin failed:', error)
    return []
  }
  // The list view never shows relations, so it does not pay to load them.
  return data.map((row: any) => {
    const article = assembleAdminArticle(row, NO_RELATIONS)
    return { ...article, completeness: articleCompleteness(article) }
  })
}

export async function getArticleAdmin(id: string): Promise<AdminArticle | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase.from('articles').select(ARTICLE_COLUMNS).eq('id', id).maybeSingle()
  if (error || !row) return null

  const [projects, services, related] = await Promise.all([
    supabase.from('article_projects').select('project_id').eq('article_id', id).order('sort_order'),
    supabase.from('article_services').select('service_id').eq('article_id', id).order('sort_order'),
    supabase.from('article_related').select('related_article_id').eq('article_id', id),
  ])
  return assembleAdminArticle(row, {
    projectIds: (projects.data ?? []).map((r: any) => r.project_id),
    serviceIds: (services.data ?? []).map((r: any) => r.service_id),
    relatedArticleIds: (related.data ?? []).map((r: any) => r.related_article_id),
  })
}

/** Everything the article form can link to or insert — see `ArticleFormOptions`. */
export async function getArticleFormOptions(excludeArticleId?: string): Promise<ArticleFormOptions | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const [projects, services, articles, media] = await Promise.all([
    supabase.from('projects').select('id, slug, title, published').order('sort_order'),
    supabase.from('services').select('id, slug, title, published').order('sort_order'),
    supabase.from('articles').select('id, slug, title').order('updated_at', { ascending: false }),
    listMediaAssets(),
  ])

  return {
    projects: (projects.data ?? []).map((r: any) => ({ id: r.id, slug: r.slug, title: r.title, published: !!r.published })),
    services: (services.data ?? []).map((r: any) => ({ id: r.id, slug: r.slug, title: r.title, published: !!r.published })),
    articles: (articles.data ?? [])
      .filter((r: any) => r.id !== excludeArticleId)
      .map((r: any) => ({ id: r.id, slug: r.slug, title: r.title })),
    media: media ?? [],
  }
}

// ---------------------------------------------------------------------------
// recommendations & recommendation requests (§ 16, 0005/0015)
// ---------------------------------------------------------------------------

/**
 * § 16's required field, matching the `not null` columns 0005/0015
 * actually declare: `personName`, `relationship`, and `statement`.
 * `consentToPublish` is a separate, non-locale gate checked directly by
 * `app/actions/content.ts#approveRecommendation` — a row can be
 * bilingually complete and still not consented, and the two are
 * different kinds of "not ready to publish" (one is a translation gap,
 * the other is a real explicit-consent requirement § 16 names).
 */
export function recommendationCompleteness(rec: { personName: string; relationship: string; statement: LocalizedText }): LocaleCompleteness {
  return mergeCompleteness([
    { en: isNonEmpty(rec.personName), fa: isNonEmpty(rec.personName) },
    { en: isNonEmpty(rec.relationship), fa: isNonEmpty(rec.relationship) },
    textComplete(rec.statement),
  ])
}

const RECOMMENDATION_COLUMNS =
  'id, person_name, person_title, company, relationship, statement, recommendation_date, source_url, ' +
  'verification, status, consent_to_publish, moderation_note, related_project_id, related_service_id, ' +
  'request_id, sort_order, created_at, projects(title), services(title)'

function assembleAdminRecommendation(row: Record<string, any>): AdminRecommendation {
  return {
    id: row.id,
    personName: row.person_name,
    personTitle: row.person_title ?? null,
    company: row.company ?? null,
    relationship: row.relationship,
    statement: row.statement,
    recommendationDate: row.recommendation_date ?? null,
    sourceUrl: row.source_url ?? null,
    verification: row.verification ?? null,
    status: row.status,
    consentToPublish: !!row.consent_to_publish,
    moderationNote: row.moderation_note ?? null,
    relatedProjectId: row.related_project_id ?? null,
    relatedProjectTitle: row.projects?.title ?? null,
    relatedServiceId: row.related_service_id ?? null,
    relatedServiceTitle: row.services?.title ?? null,
    requestId: row.request_id ?? null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

/** Newest first — a moderation queue is worked front-to-back on what just came in, unlike the published-content lists above which follow `sort_order` (an editor-controlled display order that has no meaning here yet). */
export async function listRecommendationsAdmin(): Promise<(AdminRecommendation & { completeness: LocaleCompleteness })[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('recommendations').select(RECOMMENDATION_COLUMNS).order('created_at', { ascending: false })
  if (error || !data) {
    console.error('listRecommendationsAdmin failed:', error)
    return []
  }
  return data.map((row: any) => {
    const rec = assembleAdminRecommendation(row)
    return { ...rec, completeness: recommendationCompleteness(rec) }
  })
}

export async function getRecommendationAdmin(id: string): Promise<AdminRecommendation | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase.from('recommendations').select(RECOMMENDATION_COLUMNS).eq('id', id).maybeSingle()
  if (error || !row) return null
  return assembleAdminRecommendation(row)
}

/**
 * A link's display status is always computed from its own columns, not
 * stored — the same "derive, don't duplicate state" call 0015's
 * migration header makes for `kind`. `revokedAt` wins over everything
 * else (an owner who revokes a used-and-submitted link still wants it to
 * read as inert); `recommendationId` set means the recommender has
 * submitted, regardless of what happened to that recommendation since
 * (approved/rejected/changes-requested all still mean "submitted" from
 * the link's own point of view — the recommendation row's own `status`
 * carries the rest).
 */
function requestLinkStatus(row: Record<string, any>): RecommendationRequestStatus {
  if (row.revoked_at) return 'revoked'
  if (row.recommendation_id) return 'submitted'
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'expired'
  return 'awaiting'
}

const REQUEST_COLUMNS =
  'id, token, note, suggested_related_project_id, suggested_related_service_id, created_at, expires_at, ' +
  'used_at, revoked_at, recommendation_id, recipient_email, recipient_locale, ' +
  'suggested_project:projects!recommendation_requests_suggested_related_project_id_fkey(title), ' +
  'suggested_service:services!recommendation_requests_suggested_related_service_id_fkey(title), ' +
  // Disambiguated on purpose: the two tables reference each other (0005's
  // `recommendations.request_id` and 0015's `recommendation_requests.recommendation_id`),
  // so a bare `recommendations(status)` is rejected by PostgREST with PGRST201
  // ("more than one relationship") and the whole list came back empty. Found in
  // Phase 19 against a real PostgREST; see docs/phases/PHASE-19-README.md.
  'recommendations!recommendation_requests_recommendation_id_fkey(status)'

function assembleAdminRequest(
  row: Record<string, any>,
  lastEmail: AdminRecommendationRequest['lastEmail'] = null,
): AdminRecommendationRequest {
  return {
    id: row.id,
    token: row.token,
    note: row.note ?? null,
    suggestedRelatedProjectId: row.suggested_related_project_id ?? null,
    suggestedRelatedProjectTitle: row.suggested_project?.title ?? null,
    suggestedRelatedServiceId: row.suggested_related_service_id ?? null,
    suggestedRelatedServiceTitle: row.suggested_service?.title ?? null,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    usedAt: row.used_at ?? null,
    revokedAt: row.revoked_at ?? null,
    recommendationId: row.recommendation_id ?? null,
    recommendationStatus: (row.recommendations?.status as RecommendationStatus | undefined) ?? null,
    status: requestLinkStatus(row),
    recipientEmail: (row.recipient_email as string | null) ?? null,
    recipientLocale: (row.recipient_locale as 'en' | 'fa' | null) ?? null,
    lastEmail,
  }
}

export async function listRecommendationRequestsAdmin(): Promise<AdminRecommendationRequest[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('recommendation_requests').select(REQUEST_COLUMNS).order('created_at', { ascending: false })
  if (error || !data) {
    console.error('listRecommendationRequestsAdmin failed:', error)
    return []
  }

  // D-14: what became of the e-mail the site queued for each link — newest per
  // request. One extra read; the notification log itself stays owner-only, so
  // this carries only the kind, status and provider, never a body or address.
  const ids = data.map((row: Record<string, any>) => row.id as string)
  const latest = new Map<string, NonNullable<AdminRecommendationRequest['lastEmail']>>()
  if (ids.length > 0) {
    const { data: emails } = await supabase
      .from('notification_outbox')
      .select('entity_id, kind, status, last_provider, created_at')
      .eq('entity_type', 'recommendation_request')
      .in('entity_id', ids)
      .order('created_at', { ascending: false })
    for (const email of (emails ?? []) as Record<string, any>[]) {
      if (!latest.has(email.entity_id)) {
        latest.set(email.entity_id, { kind: email.kind, status: email.status, provider: email.last_provider ?? null })
      }
    }
  }
  return data.map((row: Record<string, any>) => assembleAdminRequest(row, latest.get(row.id) ?? null))
}

