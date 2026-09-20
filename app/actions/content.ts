'use server'

import { revalidatePath } from 'next/cache'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { assertUuid } from '@/lib/postgrest'
import { writeAuditLog } from '@/lib/admin/audit'
import {
  articleCompleteness,
  engagementModelCompleteness,
  getArticleAdmin,
  getProjectAdmin,
  getRecommendationAdmin,
  getServiceAdmin,
  projectCompleteness,
  recommendationCompleteness,
  serviceCompleteness,
} from '@/lib/admin/content'
import { requireSupabase } from '@/lib/admin/pipeline'
import { normalizeCategory } from '@/lib/articles/category'
import { collectMediaIds, parseArticleBody } from '@/lib/articles/markdown'
import { findPlaceholders } from '@/lib/articles/placeholders'
import { revalidateArticleRoutes } from '@/lib/insights-revalidate'
import { generateRequestToken } from '@/lib/recommendations'
import { enqueueRecommendationChanges, enqueueRecommendationRequest } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import { notifyManualPublish } from '@/lib/notifications/publish-notice'
import { clearRecipientForRequest } from '@/lib/recommendation-privacy'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/types/content'
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
  | {
      ok: false
      code:
        | 'forbidden'
        | 'not-configured'
        | 'duplicate-slug'
        | 'not-complete'
        // Phase 17 — article-only publish/schedule gates:
        | 'has-placeholder'
        | 'missing-image'
        | 'invalid-schedule'
        | 'error'
    }
  | { ok: true }

export type ContentActionResultWithId =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'duplicate-slug' | 'invalid-schedule' | 'error' }
  | { ok: true; id: string }

async function requireEditorSession(): Promise<{ userId: string; email: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return { code: 'forbidden' }
  return { userId: session.userId, email: session.email }
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
  await notifyManualPublish(supabase, { entity: 'service', id, actorEmail: auth.email })
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
  await notifyManualPublish(supabase, { entity: 'project', id, actorEmail: auth.email })
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
// articles (§ 15.2, Phase 17)
//
// Public routes now read `articles` (`lib/insights.ts`), so every action that
// can change what a visitor sees calls `revalidateArticleRoutes`.
// ---------------------------------------------------------------------------

const ARTICLE_FORM_STATUSES = ['draft', 'review', 'scheduled', 'archived'] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function cleanIds(ids: string[] | undefined, exclude?: string): string[] {
  return [...new Set((ids ?? []).filter((id) => UUID_PATTERN.test(id) && id !== exclude))]
}

/**
 * `YYYY-MM-DD` → that day's UTC midnight (ISO), or `null` when it is not a
 * real calendar date or lies before today (UTC). A date equal to the one the
 * article is *already* scheduled for is always accepted, so re-saving an
 * article whose sweep has not run yet is never blocked by its own date.
 */
function scheduleToTimestamp(date: string | null, alreadyScheduledAs?: string | null): string | null {
  if (!date || !DATE_PATTERN.test(date)) return null
  const at = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== date) return null
  if (alreadyScheduledAs && new Date(alreadyScheduledAs).getTime() === at.getTime()) return at.toISOString()
  if (date < new Date().toISOString().slice(0, 10)) return null
  return at.toISOString()
}

function articleContentToRow(input: ArticleInput) {
  return {
    slug: input.slug.trim(),
    title: { en: input.title.en.trim(), fa: input.title.fa.trim() },
    excerpt: { en: input.excerpt.en.trim(), fa: input.excerpt.fa.trim() },
    body: { en: input.body.en.trim(), fa: input.body.fa.trim() },
    category: normalizeCategory(input.category),
  }
}

/**
 * Replaces an article's project/service/related-article links. `supabase-js`
 * has no multi-statement transaction, so this is delete-then-insert per table
 * and **not atomic** — a failure between the two leaves that table's links
 * empty until the editor saves again. Acceptable for editor-set, non-critical
 * link lists (nothing is lost that isn't one click to re-pick); disclosed in
 * PHASE-17-README rather than hidden. `related` is stored in both directions
 * so an article's related set is the same from either side.
 */
async function saveArticleRelations(
  supabase: NonNullable<ReturnType<typeof requireSupabase>>,
  id: string,
  input: Pick<ArticleInput, 'projectIds' | 'serviceIds' | 'relatedArticleIds'>,
): Promise<boolean> {
  const projectIds = cleanIds(input.projectIds)
  const serviceIds = cleanIds(input.serviceIds)
  const relatedIds = cleanIds(input.relatedArticleIds, id)

  // `id` is interpolated into a PostgREST filter below — callers have already
  // checked it against UUID_PATTERN, never pass an unvalidated one here.
  const cleared = await Promise.all([
    supabase.from('article_projects').delete().eq('article_id', id),
    supabase.from('article_services').delete().eq('article_id', id),
    supabase.from('article_related').delete().or(`article_id.eq.${assertUuid(id)},related_article_id.eq.${assertUuid(id)}`),
  ])
  if (cleared.some((result) => result.error)) return false

  const writes = []
  if (projectIds.length) {
    writes.push(supabase.from('article_projects').insert(projectIds.map((project_id, sort_order) => ({ article_id: id, project_id, sort_order }))))
  }
  if (serviceIds.length) {
    writes.push(supabase.from('article_services').insert(serviceIds.map((service_id, sort_order) => ({ article_id: id, service_id, sort_order }))))
  }
  if (relatedIds.length) {
    writes.push(
      supabase.from('article_related').insert(
        relatedIds.flatMap((relatedId) => [
          { article_id: id, related_article_id: relatedId },
          { article_id: relatedId, related_article_id: id },
        ]),
      ),
    )
  }
  const results = await Promise.all(writes)
  return results.every((result) => !result.error)
}

export async function createArticle(input: ArticleInput): Promise<ContentActionResultWithId> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!isValidSlug(input.slug) || !ARTICLE_FORM_STATUSES.includes(input.status)) return { ok: false, code: 'error' }

  const scheduledAt = input.status === 'scheduled' ? scheduleToTimestamp(input.scheduledFor) : null
  if (input.status === 'scheduled' && !scheduledAt) return { ok: false, code: 'invalid-schedule' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase
    .from('articles')
    .insert({ ...articleContentToRow(input), status: input.status, ...(scheduledAt ? { published_at: scheduledAt } : {}) })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  const linked = await saveArticleRelations(supabase, data.id, input)
  await writeAuditLog({ actor: auth.userId, action: 'content.article_created', entity: 'article', entityId: data.id, after: { slug: input.slug, status: input.status } })
  // The article row exists either way. A failed link write does not turn a created article into an error (a retry would only hit
  // `duplicate-slug`): the editor lands on the edit page, where the empty link lists are visible and can simply be picked again.
  if (!linked) console.error(`[articles] created ${data.id} but could not save its links`)
  return { ok: true, id: data.id }
}

export async function updateArticle(id: string, input: ArticleInput): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!UUID_PATTERN.test(id) || !isValidSlug(input.slug) || !ARTICLE_FORM_STATUSES.includes(input.status)) return { ok: false, code: 'error' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: current } = await supabase.from('articles').select('slug, status, published_at').eq('id', id).maybeSingle()
  if (!current) return { ok: false, code: 'error' }

  // A published article stays published when it is saved: only `publishArticle`,
  // `unpublishArticle` and `archiveArticle` move an article across the public
  // line. (Before Phase 17 this action wrote `status` from the form, which for
  // a published article always arrived as 'draft' — saving a typo fix silently
  // unpublished the article. Nothing public read `articles` yet, so it never
  // showed; it would have from the first real article.)
  const isPublished = current.status === 'published'
  let statusColumns: Record<string, unknown> = {}
  if (!isPublished) {
    statusColumns = { status: input.status }
    if (input.status === 'scheduled') {
      const scheduledAt = scheduleToTimestamp(input.scheduledFor, current.published_at)
      if (!scheduledAt) return { ok: false, code: 'invalid-schedule' }
      statusColumns.published_at = scheduledAt
    }
  }

  const { error } = await supabase.from('articles').update({ ...articleContentToRow(input), ...statusColumns }).eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, code: 'duplicate-slug' }
    return { ok: false, code: 'error' }
  }

  const linked = await saveArticleRelations(supabase, id, input)
  await writeAuditLog({ actor: auth.userId, action: 'content.article_updated', entity: 'article', entityId: id })
  if (isPublished) revalidateArticleRoutes([current.slug, input.slug])
  if (!linked) return { ok: false, code: 'error' }
  return { ok: true }
}

/**
 * § 15 "publishing … requires its required fields", plus two Phase 17 gates
 * that belong at this exact moment because nothing else can enforce them for
 * database-held content: no unresolved placeholder (§ 16.3 — the build-time
 * check cannot see the database) and no embedded image that no longer exists.
 */
export async function publishArticle(id: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!UUID_PATTERN.test(id)) return { ok: false, code: 'error' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const article = await getArticleAdmin(id)
  if (!article) return { ok: false, code: 'error' }

  const completeness = articleCompleteness(article)
  if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }

  const placeholders = findPlaceholders(
    article.title.en, article.title.fa, article.excerpt.en, article.excerpt.fa, article.body.en, article.body.fa,
    article.category?.en ?? '', article.category?.fa ?? '',
  )
  if (placeholders.length > 0) return { ok: false, code: 'has-placeholder' }

  const mediaIds = new Set([...collectMediaIds(parseArticleBody(article.body.en).blocks), ...collectMediaIds(parseArticleBody(article.body.fa).blocks)])
  if (mediaIds.size > 0) {
    const { data: found, error: mediaError } = await supabase.from('media_assets').select('id').in('id', [...mediaIds])
    if (mediaError) return { ok: false, code: 'error' }
    if ((found ?? []).length < mediaIds.size) return { ok: false, code: 'missing-image' }
  }

  // A first-ever publish (or one scheduled for a future date, published early)
  // goes live *now*; an article that was live before keeps its original date.
  const now = new Date()
  const keepDate = article.publishedAt && new Date(article.publishedAt) <= now
  const { error } = await supabase
    .from('articles')
    .update({ status: 'published', published_at: keepDate ? article.publishedAt : now.toISOString() })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.article_published', entity: 'article', entityId: id })
  revalidateArticleRoutes([article.slug], { visibilityChanged: true })
  await notifyManualPublish(supabase, { entity: 'article', id, actorEmail: auth.email })
  return { ok: true }
}

/** Reverts to `draft` — § 15's "unpublish". `published_at` is left as-is (a historical record of when it first went live), not cleared. */
export async function unpublishArticle(id: string): Promise<ContentActionResult> {
  return moveArticleOffPublic(id, 'draft', 'content.article_unpublished')
}

/** Removes an article from the public site but keeps it, and its URL history, in the admin. */
export async function archiveArticle(id: string): Promise<ContentActionResult> {
  return moveArticleOffPublic(id, 'archived', 'content.article_archived')
}

async function moveArticleOffPublic(id: string, status: 'draft' | 'archived', action: string): Promise<ContentActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!UUID_PATTERN.test(id)) return { ok: false, code: 'error' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data, error } = await supabase.from('articles').update({ status }).eq('id', id).select('slug').maybeSingle()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action, entity: 'article', entityId: id })
  revalidateArticleRoutes([data.slug], { visibilityChanged: true })
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

  // D-14 — the recommender's e-mail address, if the owner gave one. A change
  // request goes to them by e-mail; a finished moderation (approved or
  // rejected) ends the reason to hold the address at all.
  if (rec.requestId) {
    if (nextStatus === 'changes-requested') {
      await sendChangeRequestEmail(supabase, rec.requestId, moderationNote ?? '')
    } else if (nextStatus === 'approved' || nextStatus === 'rejected') {
      await clearRecipientForRequest(supabase, rec.requestId)
    }
  }
  return { ok: true }
}

/**
 * § 16: "the owner generates a single-use request link." One row per
 * link; `token` (`generateRequestToken()` — 24 random bytes, base64url)
 * is the entire access control (`recommendation_requests` has no public
 * RLS policy — see 0015's migration note), so this is the one and only
 * place a token is minted.
 */
export type CreateRecommendationRequestResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid-email' | 'error' }
  /** `email`: no address given · queued for sending · saved, but the e-mail could not be queued (the link still works — copy it). */
  | { ok: true; id: string; email: 'none' | 'queued' | 'queue-failed' }

const RECIPIENT_EMAIL_SHAPE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/

export async function createRecommendationRequest(input: RecommendationRequestInput): Promise<CreateRecommendationRequestResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  // D-14: the address is optional. When present it must be well-formed and
  // comes with the language the e-mails are written in.
  const recipientEmail = input.recipientEmail?.trim().toLowerCase() || null
  if (recipientEmail && (recipientEmail.length > 320 || !RECIPIENT_EMAIL_SHAPE.test(recipientEmail))) {
    return { ok: false, code: 'invalid-email' }
  }
  const recipientLocale: Locale = input.recipientLocale === 'fa' ? 'fa' : 'en'

  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null
  const token = generateRequestToken()

  const { data, error } = await supabase
    .from('recommendation_requests')
    .insert({
      token,
      note: input.note.trim() || null,
      suggested_related_project_id: input.suggestedRelatedProjectId,
      suggested_related_service_id: input.suggestedRelatedServiceId,
      created_by: auth.userId,
      expires_at: expiresAt,
      recipient_email: recipientEmail,
      recipient_locale: recipientEmail ? recipientLocale : null,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  // The address itself is never written to the audit log — only that one was given.
  await writeAuditLog({
    actor: auth.userId,
    action: 'content.recommendation_request_created',
    entity: 'recommendation_request',
    entityId: data.id,
    after: { emailGiven: Boolean(recipientEmail) },
  })

  if (!recipientEmail) return { ok: true, id: data.id, email: 'none' }

  try {
    const rows = await enqueueRecommendationRequest(supabase, {
      requestId: data.id,
      token,
      recipientEmail,
      locale: recipientLocale,
      expiresAt,
    })
    if (rows.length === 0) return { ok: true, id: data.id, email: 'queue-failed' }
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
    return { ok: true, id: data.id, email: 'queued' }
  } catch (err) {
    console.error('recommendation request e-mail could not be queued (the link itself was created):', err)
    return { ok: true, id: data.id, email: 'queue-failed' }
  }
}

/** Queues "please change this" for a request that has an address; a request without one is a no-op (the owner shares the link by hand, as before). */
async function sendChangeRequestEmail(
  supabase: NonNullable<ReturnType<typeof requireSupabase>>,
  requestId: string,
  note: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('recommendation_requests')
      .select('token, recipient_email, recipient_locale')
      .eq('id', requestId)
      .maybeSingle()
    if (!data?.recipient_email) return

    const rows = await enqueueRecommendationChanges(supabase, {
      requestId,
      token: data.token as string,
      recipientEmail: data.recipient_email as string,
      locale: (data.recipient_locale as Locale | null) === 'fa' ? 'fa' : 'en',
      note,
      moderatedAt: new Date().toISOString(),
    })
    await processAfterEnqueue(
      supabase,
      rows.map((row) => row.id),
    )
  } catch (err) {
    console.error('change-request e-mail failed (the moderation itself was saved):', err)
  }
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
  // D-14: a revoked link has no further use for the recommender's address, and a link e-mail still waiting to go out must not go out.
  await clearRecipientForRequest(supabase, id)
  return { ok: true }
}

