'use server'

import { revalidatePath } from 'next/cache'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import {
  articleCompleteness,
  engagementModelCompleteness,
  estimateReadingMinutes,
  getArticleAdmin,
  getProjectAdmin,
  getRecommendationAdmin,
  getServiceAdmin,
  projectCompleteness,
  recommendationCompleteness,
  serviceCompleteness,
} from '@/lib/admin/content'
import { requireSupabase } from '@/lib/admin/pipeline'
import { generateRequestToken } from '@/lib/recommendations'
import { routing } from '@/i18n/routing'
import type {
  AddonInput,
  ArticleInput,
  EngagementModelInput,
  FaqInput,
  PackageInput,
  ProcessStepInput,
  ProjectCoreInput,
  ProjectSectionsInput,
  RecommendationInput,
  RecommendationRequestInput,
  RecommendationStatus,
  ServiceCoreInput,
} from '@/types/cms'

/**
 * § 15.1 Server Actions for the Services cluster (services, packages,
 * add-ons, FAQs, engagement models). Same shape as `app/actions/pipeline.ts`:
 * every action re-checks its own session independently, writes an
 * `audit_log` row for every real mutation, and returns an honest error
 * code rather than a raw Postgres message. Unlike the Lead Pipeline
 * (owner-only, § 13/§ 14), content is `editor`-accessible — no
 * `canAccessLeads`-style role gate here, per § 13's own "editor: content
 * only" role definition; editors don't need MFA either (owner-only per
 * § 13), so `mfaSatisfied` alone is the right check for both roles.
 */

export type ContentActionResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'duplicate-slug' | 'not-complete' | 'error' }
  | { ok: true }

export type ContentActionResultWithId =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'duplicate-slug' | 'error' }
  | { ok: true; id: string }

async function requireEditorSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

/**
 * Every § 15.1 public route that reads a service or engagement model, in
 * both locales — "on-demand revalidation of affected routes after
 * publish" (§ 15). Cheap to over-call: `revalidatePath` on a path that
 * isn't statically cached is a harmless no-op, so this doesn't try to be
 * clever about which action needs which subset.
 */
function revalidateServiceRoutes(slugs: (string | null | undefined)[]): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/services`)
    revalidatePath(`/${locale}/start`)
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${locale}/services/${slug}`)
    }
  }
}

function revalidateProjectRoutes(slugs: (string | null | undefined)[]): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/work`)
    revalidatePath(`/${locale}`)
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${locale}/work/${slug}`)
    }
  }
}

/** § 3.3's "Recommendations — rendered only when ≥ 1 verified recommendation is published" section lives on Home only (this phase doesn't add a dedicated recommendations page). */
function revalidateRecommendationRoutes(): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`)
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length <= 96
}

function toJsonbOrNull(value: { en: string; fa: string } | null) {
  if (!value) return null
  return { en: value.en.trim(), fa: value.fa.trim() }
}

function cleanList(list: { en: string; fa: string }[]) {
  return list.map((item) => ({ en: item.en.trim(), fa: item.fa.trim() })).filter((item) => item.en || item.fa)
}

function serviceCoreToRow(input: ServiceCoreInput) {
  return {
    slug: input.slug.trim(),
    icon: input.icon.trim(),
    title: { en: input.title.en.trim(), fa: input.title.fa.trim() },
    description: { en: input.description.en.trim(), fa: input.description.fa.trim() },
    deliverables: cleanList(input.deliverables),
    type: input.type ?? null,
    tagline: toJsonbOrNull(input.tagline),
    for_whom: cleanList(input.forWhom),
    not_for_whom: cleanList(input.notForWhom),
    problem: toJsonbOrNull(input.problem),
    what_i_do: cleanList(input.whatIDo),
    included: cleanList(input.included),
    not_included: cleanList(input.notIncluded),
    timeline: toJsonbOrNull(input.timeline),
    requirements: cleanList(input.requirements),
    related_project_slugs: input.relatedProjectSlugs.map((s) => s.trim()).filter(Boolean),
    what_drives_cost: cleanList(input.whatDrivesCost),
    payment_schedule_note: toJsonbOrNull(input.paymentScheduleNote),
  }
}

// ---------------------------------------------------------------------------
// services — core fields
// ---------------------------------------------------------------------------

export async function createService(input: ServiceCoreInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('services')
    .insert({ ...serviceCoreToRow(input), published: false })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.service_created', entity: 'service', entityId: data.id, after: { slug: input.slug } })
  revalidateServiceRoutes([input.slug])
  return { ok: true, id: data.id }
}

export async function updateService(id: string, input: ServiceCoreInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: before } = await supabase.from('services').select('slug').eq('id', id).maybeSingle()

  const { error } = await supabase.from('services').update(serviceCoreToRow(input)).eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.service_updated', entity: 'service', entityId: id, after: { slug: input.slug } })
  revalidateServiceRoutes([before?.slug, input.slug])
  return { ok: true }
}

/** § 15: "publishing a locale requires its required fields" — checked against both locales before flipping the one sitewide flag (see `docs/phases/PHASE-15-README.md`). */
export async function publishService(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const service = await getServiceAdmin(id)
  if (!service) return { ok: false, code: 'error' }

  const completeness = serviceCompleteness(service)
  if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }

  const { error } = await supabase.from('services').update({ published: true }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.service_published', entity: 'service', entityId: id })
  revalidateServiceRoutes([service.slug])
  return { ok: true }
}

export async function unpublishService(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase.from('services').update({ published: false }).eq('id', id).select('slug').maybeSingle()
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.service_unpublished', entity: 'service', entityId: id })
  revalidateServiceRoutes([data?.slug])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// service process steps
// ---------------------------------------------------------------------------

export async function createProcessStep(serviceId: string, input: ProcessStepInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { count } = await supabase
    .from('service_process_steps')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const { error } = await supabase.from('service_process_steps').insert({
    service_id: serviceId,
    title: toJsonbOrNull(input.title),
    description: toJsonbOrNull(input.description),
    sort_order: count ?? 0,
  })
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.process_step_created', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function updateProcessStep(id: string, serviceId: string, input: ProcessStepInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('service_process_steps')
    .update({ title: toJsonbOrNull(input.title), description: toJsonbOrNull(input.description) })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.process_step_updated', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function deleteProcessStep(id: string, serviceId: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('service_process_steps').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.process_step_deleted', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// service packages — one row per tier, upserted on (service_id, tier)
// ---------------------------------------------------------------------------

export async function upsertPackage(serviceId: string, input: PackageInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('service_packages').upsert(
    {
      service_id: serviceId,
      tier: input.tier,
      name: toJsonbOrNull(input.name),
      summary: toJsonbOrNull(input.summary),
      for_whom: toJsonbOrNull(input.forWhom),
      included: cleanList(input.included),
      not_included: cleanList(input.notIncluded),
      deliverables: cleanList(input.deliverables),
      delivery_days_min: input.deliveryDays?.min ?? null,
      delivery_days_max: input.deliveryDays?.max ?? null,
      revisions: input.revisions,
      support_days: input.supportDays,
      requirements: cleanList(input.requirements),
      price_type: input.price.type,
      price_amount: input.price.amount ?? null,
      price_currency: input.price.currency ?? null,
    },
    { onConflict: 'service_id,tier' },
  )
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.package_upserted', entity: 'service', entityId: serviceId, after: { tier: input.tier } })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function deletePackage(rowId: string, serviceId: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('service_packages').delete().eq('id', rowId)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.package_deleted', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// service add-ons
// ---------------------------------------------------------------------------

export async function createAddon(serviceId: string, input: AddonInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { count } = await supabase.from('service_addons').select('id', { count: 'exact', head: true }).eq('service_id', serviceId)

  const { error } = await supabase.from('service_addons').insert({
    service_id: serviceId,
    title: toJsonbOrNull(input.title),
    description: toJsonbOrNull(input.description),
    price_type: input.price.type,
    price_amount: input.price.amount ?? null,
    price_currency: input.price.currency ?? null,
    delivery_impact_days: input.deliveryImpactDays,
    sort_order: count ?? 0,
  })
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.addon_created', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function updateAddon(id: string, serviceId: string, input: AddonInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('service_addons')
    .update({
      title: toJsonbOrNull(input.title),
      description: toJsonbOrNull(input.description),
      price_type: input.price.type,
      price_amount: input.price.amount ?? null,
      price_currency: input.price.currency ?? null,
      delivery_impact_days: input.deliveryImpactDays,
    })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.addon_updated', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function deleteAddon(id: string, serviceId: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('service_addons').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.addon_deleted', entity: 'service', entityId: serviceId })
  revalidateServiceRoutes([])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// faqs — scope 'service' (tied to a service) or 'global'
// ---------------------------------------------------------------------------

export async function createFaq(scope: 'service' | 'global', serviceId: string | null, input: FaqInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  let countQuery = supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('scope', scope)
  if (scope === 'service') countQuery = countQuery.eq('service_id', serviceId)
  const { count } = await countQuery

  const { error } = await supabase.from('faqs').insert({
    scope,
    service_id: scope === 'service' ? serviceId : null,
    question: toJsonbOrNull(input.question),
    answer: toJsonbOrNull(input.answer),
    sort_order: count ?? 0,
  })
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.faq_created', entity: scope === 'service' ? 'service' : 'faq', entityId: serviceId ?? undefined })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function updateFaq(id: string, serviceId: string | null, input: FaqInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('faqs')
    .update({ question: toJsonbOrNull(input.question), answer: toJsonbOrNull(input.answer) })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.faq_updated', entity: serviceId ? 'service' : 'faq', entityId: serviceId ?? id })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function deleteFaq(id: string, serviceId: string | null): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('faqs').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.faq_deleted', entity: serviceId ? 'service' : 'faq', entityId: serviceId ?? id })
  revalidateServiceRoutes([])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// engagement models
// ---------------------------------------------------------------------------

export async function createEngagementModel(input: EngagementModelInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('engagement_models')
    .insert({
      slug: input.slug.trim(),
      title: toJsonbOrNull(input.title),
      when_it_fits: toJsonbOrNull(input.whenItFits),
      billing: toJsonbOrNull(input.billing),
      published: false,
    })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.engagement_model_created', entity: 'engagement_model', entityId: data.id })
  revalidateServiceRoutes([])
  return { ok: true, id: data.id }
}

export async function updateEngagementModel(id: string, input: EngagementModelInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('engagement_models')
    .update({
      slug: input.slug.trim(),
      title: toJsonbOrNull(input.title),
      when_it_fits: toJsonbOrNull(input.whenItFits),
      billing: toJsonbOrNull(input.billing),
    })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.engagement_model_updated', entity: 'engagement_model', entityId: id })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function publishEngagementModel(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: row } = await supabase.from('engagement_models').select('title, when_it_fits, billing').eq('id', id).maybeSingle()
  if (!row) return { ok: false, code: 'error' }

  const completeness = engagementModelCompleteness({ title: row.title, whenItFits: row.when_it_fits, billing: row.billing })
  if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }

  const { error } = await supabase.from('engagement_models').update({ published: true }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.engagement_model_published', entity: 'engagement_model', entityId: id })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function unpublishEngagementModel(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('engagement_models').update({ published: false }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.engagement_model_unpublished', entity: 'engagement_model', entityId: id })
  revalidateServiceRoutes([])
  return { ok: true }
}

export async function deleteEngagementModel(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('engagement_models').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.engagement_model_deleted', entity: 'engagement_model', entityId: id })
  revalidateServiceRoutes([])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// projects (§ 15.2)
// ---------------------------------------------------------------------------

function projectCoreToRow(input: ProjectCoreInput) {
  return {
    slug: input.slug.trim(),
    title: { en: input.title.en.trim(), fa: input.title.fa.trim() },
    category: { en: input.category.en.trim(), fa: input.category.fa.trim() },
    summary: { en: input.summary.en.trim(), fa: input.summary.fa.trim() },
    highlights: cleanList(input.highlights),
    status: input.status ?? null,
    cover_image: input.coverImage?.trim() || null,
    github_url: input.githubUrl?.trim() || null,
    live_url: input.liveUrl?.trim() || null,
    year: input.year?.trim() || null,
    role: toJsonbOrNull(input.role),
    related_service_slug: input.relatedServiceSlug?.trim() || null,
    featured: input.featured,
  }
}

async function replaceProjectTechnologies(projectId: string, technologyIds: string[]): Promise<void> {
  const supabase = requireSupabase()
  if (!supabase) return
  await supabase.from('project_technologies').delete().eq('project_id', projectId)
  if (technologyIds.length > 0) {
    await supabase.from('project_technologies').insert(technologyIds.map((technology_id) => ({ project_id: projectId, technology_id })))
  }
}

export async function createProject(input: ProjectCoreInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...projectCoreToRow(input), published: false })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await replaceProjectTechnologies(data.id, input.technologyIds)
  await writeAuditLog({ actor: auth.userId, action: 'content.project_created', entity: 'project', entityId: data.id, after: { slug: input.slug } })
  revalidateProjectRoutes([input.slug])
  return { ok: true, id: data.id }
}

export async function updateProject(id: string, input: ProjectCoreInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: before } = await supabase.from('projects').select('slug').eq('id', id).maybeSingle()

  const { error } = await supabase.from('projects').update(projectCoreToRow(input)).eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await replaceProjectTechnologies(id, input.technologyIds)
  await writeAuditLog({ actor: auth.userId, action: 'content.project_updated', entity: 'project', entityId: id, after: { slug: input.slug } })
  revalidateProjectRoutes([before?.slug, input.slug])
  return { ok: true }
}

/**
 * Replaces every `project_sections` row for this project in one pass —
 * the form always submits the complete case study, so a delete-then-
 * insert is simpler and safer than diffing against what's already there
 * (no risk of an orphaned row from a section the editor cleared).
 */
export async function updateProjectSections(id: string, input: ProjectSectionsInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error: deleteError } = await supabase.from('project_sections').delete().eq('project_id', id)
  if (deleteError) return { ok: false, code: 'error' }

  const rows: { project_id: string; type: string; body: unknown; sort_order: number }[] = []
  const singleSections: [string, { en: string; fa: string } | null][] = [
    ['context', input.context],
    ['problem-and-goals', input.problemAndGoals],
    ['architecture', input.architecture],
    ['engineering-highlight', input.engineeringHighlight],
    ['data-integrity-and-security', input.dataIntegrityAndSecurity],
    ['responsive-and-rtl', input.responsiveAndRtl],
    ['quality', input.quality],
    ['current-status-and-next', input.currentStatusAndNext],
    ['lessons-learned', input.lessonsLearned],
  ]
  for (const [type, value] of singleSections) {
    const jsonb = toJsonbOrNull(value)
    if (jsonb) rows.push({ project_id: id, type, body: jsonb, sort_order: 0 })
  }
  cleanList(input.constraints).forEach((constraint, index) => {
    rows.push({ project_id: id, type: 'constraint', body: constraint, sort_order: index })
  })
  input.keyDecisions
    .filter((d) => d.context.en || d.context.fa || d.decision.en || d.decision.fa || d.tradeoff.en || d.tradeoff.fa)
    .forEach((decision, index) => {
      rows.push({
        project_id: id,
        type: 'key-decision',
        body: {
          context: { en: decision.context.en.trim(), fa: decision.context.fa.trim() },
          decision: { en: decision.decision.en.trim(), fa: decision.decision.fa.trim() },
          tradeoff: { en: decision.tradeoff.en.trim(), fa: decision.tradeoff.fa.trim() },
        },
        sort_order: index,
      })
    })

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('project_sections').insert(rows)
    if (insertError) return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_sections_updated', entity: 'project', entityId: id })
  revalidateProjectRoutes([])
  return { ok: true }
}

export async function publishProject(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const project = await getProjectAdmin(id)
  if (!project) return { ok: false, code: 'error' }

  const completeness = projectCompleteness(project)
  if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }

  const { error } = await supabase.from('projects').update({ published: true }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_published', entity: 'project', entityId: id })
  revalidateProjectRoutes([project.slug])
  return { ok: true }
}

export async function unpublishProject(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase.from('projects').update({ published: false }).eq('id', id).select('slug').maybeSingle()
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_unpublished', entity: 'project', entityId: id })
  revalidateProjectRoutes([data?.slug])
  return { ok: true }
}

// ---------------------------------------------------------------------------
// articles (§ 15.2) — schema-ahead-of-use: no public page reads `articles`
// yet (Phase 17), so no revalidation call here — nothing to revalidate.
// ---------------------------------------------------------------------------

function articleInputToRow(input: ArticleInput) {
  return {
    slug: input.slug.trim(),
    title: { en: input.title.en.trim(), fa: input.title.fa.trim() },
    excerpt: { en: input.excerpt.en.trim(), fa: input.excerpt.fa.trim() },
    body: { en: input.body.en.trim(), fa: input.body.fa.trim() },
    category: toJsonbOrNull(input.category),
    status: input.status,
    reading_time_minutes: estimateReadingMinutes(input.body),
  }
}

export async function createArticle(input: ArticleInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase.from('articles').insert(articleInputToRow(input)).select('id').single()
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.article_created', entity: 'article', entityId: data.id, after: { slug: input.slug } })
  return { ok: true, id: data.id }
}

export async function updateArticle(id: string, input: ArticleInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('articles').update(articleInputToRow(input)).eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.article_updated', entity: 'article', entityId: id })
  return { ok: true }
}

export async function publishArticle(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const article = await getArticleAdmin(id)
  if (!article) return { ok: false, code: 'error' }

  const completeness = articleCompleteness(article)
  if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }

  const { error } = await supabase
    .from('articles')
    .update({ status: 'published', published_at: article.publishedAt ?? new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.article_published', entity: 'article', entityId: id })
  return { ok: true }
}

/** Reverts to `draft` — § 15's "unpublish" for the richer article status enum. `published_at` is left as-is (a historical record of when it first went live), not cleared. */
export async function unpublishArticle(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('articles').update({ status: 'draft' }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.article_unpublished', entity: 'article', entityId: id })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// recommendations & recommendation requests (§ 16, 0005/0015)
// ---------------------------------------------------------------------------

function recommendationInputToRow(input: RecommendationInput) {
  return {
    person_name: input.personName.trim(),
    person_title: input.personTitle?.trim() || null,
    company: input.company?.trim() || null,
    relationship: input.relationship.trim(),
    statement: { en: input.statement.en.trim(), fa: input.statement.fa.trim() },
    recommendation_date: input.recommendationDate || null,
    source_url: input.sourceUrl?.trim() || null,
    verification: input.verification,
    related_project_id: input.relatedProjectId,
    related_service_id: input.relatedServiceId,
    consent_to_publish: input.consentToPublish,
  }
}

/**
 * The admin's own direct entries — a real testimonial the owner found
 * on a platform profile or the person's own public profile
 * (`verification: 'platform-review' | 'public-profile'`), not something
 * that came through a request link. Always created `'pending'`, same as
 * every other entity's create-then-explicitly-publish pattern — even a
 * manually-entered row goes through the one real moderation gate
 * (`moderateRecommendation`) rather than skipping it because the owner
 * typed it in themselves.
 */
export async function createRecommendation(input: RecommendationInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (input.verification === 'verified-request') return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('recommendations')
    .insert({ ...recommendationInputToRow(input), status: 'pending' })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.recommendation_created', entity: 'recommendation', entityId: data.id })
  return { ok: true, id: data.id }
}

/**
 * Edits any field — the admin's own manual entries freely, and a
 * request-flow submission only for the narrow case § 16 names: "typos
 * only with consent" (the recommender's own consent, already given at
 * submission — a correction never changes what they said, only fixes a
 * spelling slip or fills in the locale they didn't write in).
 */
export async function updateRecommendation(id: string, input: RecommendationInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('recommendations').update(recommendationInputToRow(input)).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.recommendation_updated', entity: 'recommendation', entityId: id })
  revalidateRecommendationRoutes()
  return { ok: true }
}

export async function deleteRecommendation(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('recommendations').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.recommendation_deleted', entity: 'recommendation', entityId: id })
  revalidateRecommendationRoutes()
  return { ok: true }
}

export type ModerateRecommendationResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'not-complete' | 'no-consent' | 'note-required' | 'error' }
  | { ok: true }

/**
 * The one real moderation gate (§ 16: "moderation queue: approve ·
 * request change · reject"). No database trigger enforces this
 * transition graph (see 0015's migration header for why) — it's a
 * small, fully reversible action set behind the same `editor` session
 * check every other content action already uses, not a one-way funnel
 * like the lead pipeline.
 *
 * `approve` requires both real per-locale completeness (§ 15's own
 * "publishing a locale requires its required fields" rule, reused here)
 * and the recommender's own `consentToPublish` — two independent gates,
 * checked separately so the error the admin sees actually names which
 * one is missing rather than a single generic block.
 */
export async function moderateRecommendation(
  id: string,
  action: 'approve' | 'reject' | 'request-change',
  note?: string,
): Promise<ModerateRecommendationResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const rec = await getRecommendationAdmin(id)
  if (!rec) return { ok: false, code: 'error' }

  let nextStatus: RecommendationStatus
  let moderationNote: string | null = null
  let auditAction: string

  if (action === 'approve') {
    const completeness = recommendationCompleteness(rec)
    if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }
    if (!rec.consentToPublish) return { ok: false, code: 'no-consent' }
    nextStatus = 'approved'
    auditAction = 'content.recommendation_approved'
  } else if (action === 'reject') {
    nextStatus = 'rejected'
    moderationNote = note?.trim() || null
    auditAction = 'content.recommendation_rejected'
  } else {
    const trimmedNote = note?.trim() ?? ''
    if (!trimmedNote) return { ok: false, code: 'note-required' }
    nextStatus = 'changes-requested'
    moderationNote = trimmedNote
    auditAction = 'content.recommendation_changes_requested'
  }

  const { error } = await supabase
    .from('recommendations')
    .update({ status: nextStatus, moderation_note: moderationNote })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: auditAction, entity: 'recommendation', entityId: id, after: { status: nextStatus } })
  revalidateRecommendationRoutes()
  return { ok: true }
}

/**
 * § 16: "the owner generates a single-use request link." One row per
 * link; `token` (`generateRequestToken()` — 24 random bytes, base64url)
 * is the entire access control (`recommendation_requests` has no public
 * RLS policy — see 0015's migration note), so this is the one and only
 * place a token is minted.
 */
export async function createRecommendationRequest(input: RecommendationRequestInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

  const { data, error } = await supabase
    .from('recommendation_requests')
    .insert({
      token: generateRequestToken(),
      note: input.note.trim() || null,
      suggested_related_project_id: input.suggestedRelatedProjectId,
      suggested_related_service_id: input.suggestedRelatedServiceId,
      created_by: auth.userId,
      expires_at: expiresAt,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.recommendation_request_created', entity: 'recommendation_request', entityId: data.id })
  return { ok: true, id: data.id }
}

/** Revokes a link regardless of its current state — same "owner can always undo" reasoning `unpublishService` etc. already follow; `requestLinkStatus` (`lib/admin/content.ts`) always shows `revoked_at` first, so a revoked-after-submission link still reads as inert even though its recommendation row is untouched. */
export async function revokeRecommendationRequest(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('recommendation_requests').update({ revoked_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.recommendation_request_revoked', entity: 'recommendation_request', entityId: id })
  return { ok: true }
}

