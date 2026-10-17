'use server'

import { revalidatePath } from 'next/cache'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { productServiceCompleteness, saleOptionCompleteness } from '@/lib/admin/content'
import { requireDb } from '@/lib/admin/pipeline'
import { blockCompleteness, cleanText, cleanTextList, isBlockType, normalizeBlockBody } from '@/lib/products/blocks'
import { cleanAmount, moneyFromRow } from '@/lib/products/money'
import { routing } from '@/i18n/routing'
import { SALE_OPTION_KINDS, type LocalizedText, type Money, type ProjectBlockType } from '@/types/content'
import type { BlockInput, ProductServiceInput, SaleOptionInput } from '@/types/cms'

/**
 * Phase 27.2 / 27.3 — the admin's Server Actions for a project's content blocks,
 * its ways to get it (sale options) and its after-sales services. Same contract
 * as `app/actions/content.ts`: every action checks its own session (editor or
 * owner, past MFA), never trusts its arguments (ids, enums, amounts and block
 * bodies are all re-checked here), writes an `audit_log` row for every real
 * change and revalidates the public pages that show it.
 *
 * Publishing a block, option or service needs it complete in both languages
 * (§ 15) — a half-translated price card never reaches the site.
 */

export type ProductActionResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid' | 'not-complete' | 'not-found' | 'error' }
  | { ok: true }

export type ProductActionResultWithId =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid' | 'not-found' | 'error' }
  | { ok: true; id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BILLING = ['once', 'month', 'year'] as const
const MAINTENANCE = ['included', 'optional', 'not-offered'] as const
const CTAS = ['purchase-request', 'demo-request', 'contact'] as const

type ChildTable = 'project_blocks' | 'product_sale_options' | 'product_services'
const ENTITY: Record<ChildTable, string> = {
  project_blocks: 'project_block',
  product_sale_options: 'product_sale_option',
  product_services: 'product_service',
}

async function requireEditorSession(): Promise<{ userId: string } | null> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return null
  return { userId: session.userId }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** Every public page a project's content can appear on, in both languages. */
async function revalidateProject(db: NonNullable<ReturnType<typeof requireDb>>, projectId: string): Promise<void> {
  const { data } = await db.from('projects').select('slug').eq('id', projectId).maybeSingle()
  const slug = (data as { slug?: string } | null)?.slug
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`)
    revalidatePath(`/${locale}/work`)
    revalidatePath(`/${locale}/products`)
    revalidatePath(`/${locale}/start`)
    if (slug) {
      revalidatePath(`/${locale}/work/${slug}`)
      revalidatePath(`/${locale}/products/${slug}`)
    }
  }
}

async function projectExists(db: NonNullable<ReturnType<typeof requireDb>>, projectId: string): Promise<boolean> {
  const { data } = await db.from('projects').select('id').eq('id', projectId).maybeSingle()
  return Boolean(data)
}

async function nextSortOrder(db: NonNullable<ReturnType<typeof requireDb>>, table: ChildTable, projectId: string): Promise<number> {
  const { data } = await db.from(table).select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1)
  const last = (data as { sort_order: number }[] | null)?.[0]?.sort_order
  return typeof last === 'number' ? last + 1 : 0
}

function cleanMoney(input: Money | null | undefined): { afn: number | null; usd: number | null; from: boolean } | 'invalid' {
  const afn = cleanAmount(input?.afn)
  const usd = cleanAmount(input?.usd)
  if (afn === 'invalid' || usd === 'invalid') return 'invalid'
  return { afn, usd, from: Boolean(input?.from) }
}

// ---------------------------------------------------------------------------
// shared: delete, reorder, publish

async function deleteChild(table: ChildTable, id: string, projectId: string): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(id) || !isUuid(projectId)) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data, error } = await db.from(table).delete().eq('id', id).eq('project_id', projectId).select('id')
  if (error) return { ok: false, code: 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'not-found' }

  await writeAuditLog({ actor: auth.userId, action: `content.${ENTITY[table]}_deleted`, entity: ENTITY[table], entityId: id, after: { projectId } })
  await revalidateProject(db, projectId)
  return { ok: true }
}

/** Saves a new order: `orderedIds` must be exactly this project's rows, each once. */
async function reorderChildren(table: ChildTable, projectId: string, orderedIds: string[]): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(projectId) || !Array.isArray(orderedIds) || !orderedIds.every(isUuid)) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data: rows, error } = await db.from(table).select('id').eq('project_id', projectId)
  if (error || !rows) return { ok: false, code: 'error' }
  const existing = new Set((rows as { id: string }[]).map((row) => row.id))
  if (new Set(orderedIds).size !== orderedIds.length || orderedIds.length !== existing.size || !orderedIds.every((id) => existing.has(id))) {
    return { ok: false, code: 'invalid' }
  }

  for (const [index, id] of orderedIds.entries()) {
    const { error: updateError } = await db.from(table).update({ sort_order: index }).eq('id', id).eq('project_id', projectId)
    if (updateError) return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: `content.${ENTITY[table]}s_reordered`, entity: 'project', entityId: projectId })
  await revalidateProject(db, projectId)
  return { ok: true }
}

async function setChildPublished(table: ChildTable, id: string, projectId: string, published: boolean): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(id) || !isUuid(projectId)) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data: row } = await db.from(table).select('*').eq('id', id).eq('project_id', projectId).maybeSingle()
  if (!row) return { ok: false, code: 'not-found' }

  if (published) {
    // One shape for the three tables; each branch reads only its own columns (title is `not null` on the two product tables).
    type Row = { type: ProjectBlockType; title: LocalizedText; body: Record<string, unknown> | null; summary: LocalizedText | null; included: LocalizedText[] | null; description: LocalizedText | null }
    const r = row as unknown as Row
    const completeness =
      table === 'project_blocks'
        ? blockCompleteness(r.type, r.title, r.body ?? {})
        : table === 'product_sale_options'
          ? saleOptionCompleteness({ title: r.title, summary: r.summary, included: r.included ?? [] })
          : productServiceCompleteness({ title: r.title, description: r.description })
    if (!completeness.en || !completeness.fa) return { ok: false, code: 'not-complete' }
  }

  const { error } = await db.from(table).update({ published }).eq('id', id).eq('project_id', projectId)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({
    actor: auth.userId,
    action: `content.${ENTITY[table]}_${published ? 'published' : 'unpublished'}`,
    entity: ENTITY[table],
    entityId: id,
    after: { projectId },
  })
  await revalidateProject(db, projectId)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// 27.2 blocks

function blockRow(input: BlockInput): { type: string; title: { en: string; fa: string } | null; body: Record<string, unknown> } | null {
  if (!input || !isBlockType(input.type)) return null
  const body = normalizeBlockBody(input.type, input.body)
  if (!body) return null
  return { type: input.type, title: cleanText(input.title), body }
}

/**
 * A gallery may only point at images that exist in the media library and carry
 * alt text — the same rule every other public image follows (§ 15).
 */
async function galleryImagesValid(db: NonNullable<ReturnType<typeof requireDb>>, row: { type: string; body: Record<string, unknown> }): Promise<boolean> {
  if (row.type !== 'gallery') return true
  const ids = ((row.body.images as { mediaId: string }[] | undefined) ?? []).map((image) => image.mediaId)
  if (ids.length === 0) return true
  const { data } = await db.from('media_assets').select('id, alt').in('id', ids)
  const found = new Map(((data ?? []) as { id: string; alt: { en?: string; fa?: string } | null }[]).map((asset) => [asset.id, asset]))
  return ids.every((id) => {
    const alt = found.get(id)?.alt
    return Boolean(alt?.en?.trim() && alt?.fa?.trim())
  })
}

export async function createProjectBlock(projectId: string, input: BlockInput): Promise<ProductActionResultWithId> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = blockRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }
  if (!(await projectExists(db, projectId))) return { ok: false, code: 'not-found' }
  if (!(await galleryImagesValid(db, row))) return { ok: false, code: 'invalid' }

  const { data, error } = await db
    .from('project_blocks')
    .insert({ ...row, project_id: projectId, published: false, sort_order: await nextSortOrder(db, 'project_blocks', projectId) })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_block_created', entity: 'project_block', entityId: data.id, after: { projectId, type: row.type } })
  return { ok: true, id: data.id }
}

/** Saving a published block keeps it published only while it stays complete; otherwise it goes back to draft. */
export async function updateProjectBlock(id: string, projectId: string, input: BlockInput): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(id) || !isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = blockRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data: current } = await db.from('project_blocks').select('type, published').eq('id', id).eq('project_id', projectId).maybeSingle()
  if (!current) return { ok: false, code: 'not-found' }
  if ((current as { type: string }).type !== row.type) return { ok: false, code: 'invalid' }
  if (!(await galleryImagesValid(db, row))) return { ok: false, code: 'invalid' }

  const completeness = blockCompleteness(input.type, row.title, row.body)
  const stillPublished = (current as { published: boolean }).published && completeness.en && completeness.fa

  const { error } = await db.from('project_blocks').update({ title: row.title, body: row.body, published: stillPublished }).eq('id', id).eq('project_id', projectId)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_block_updated', entity: 'project_block', entityId: id, after: { projectId } })
  await revalidateProject(db, projectId)
  return { ok: true }
}

export async function deleteProjectBlock(id: string, projectId: string): Promise<ProductActionResult> {
  return deleteChild('project_blocks', id, projectId)
}

export async function reorderProjectBlocks(projectId: string, orderedIds: string[]): Promise<ProductActionResult> {
  return reorderChildren('project_blocks', projectId, orderedIds)
}

export async function publishProjectBlock(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('project_blocks', id, projectId, true)
}

export async function unpublishProjectBlock(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('project_blocks', id, projectId, false)
}

// ---------------------------------------------------------------------------
// 27.3 sale options

function saleOptionRow(input: SaleOptionInput): Record<string, unknown> | null {
  if (!input || !(SALE_OPTION_KINDS as string[]).includes(input.kind)) return null
  if (!(BILLING as readonly string[]).includes(input.billingPeriod)) return null
  if (!(MAINTENANCE as readonly string[]).includes(input.maintenance)) return null
  if (!(CTAS as readonly string[]).includes(input.cta)) return null
  const title = cleanText(input.title)
  if (!title) return null
  const price = cleanMoney(input.price)
  if (price === 'invalid') return null

  let maintenance = { afn: null as number | null, usd: null as number | null }
  let maintenancePeriod: string | null = null
  if (input.maintenance === 'optional') {
    const m = cleanMoney(input.maintenancePrice)
    if (m === 'invalid') return null
    maintenance = { afn: m.afn, usd: m.usd }
    if (input.maintenancePeriod !== null && input.maintenancePeriod !== undefined && !['month', 'year'].includes(input.maintenancePeriod)) return null
    maintenancePeriod = input.maintenancePeriod ?? null
    // A maintenance price needs its period (the database refuses it otherwise).
    if ((maintenance.afn !== null || maintenance.usd !== null) && !maintenancePeriod) return null
  }

  return {
    kind: input.kind,
    title,
    summary: cleanText(input.summary),
    price_afn: price.afn,
    price_usd: price.usd,
    price_from: price.from,
    billing_period: input.billingPeriod,
    maintenance: input.maintenance,
    maintenance_price_afn: maintenance.afn,
    maintenance_price_usd: maintenance.usd,
    maintenance_period: maintenancePeriod,
    included: cleanTextList(input.included),
    highlighted: Boolean(input.highlighted),
    cta: input.cta,
  }
}

/** At most one highlighted option per product: highlighting one clears the others first. */
async function clearOtherHighlights(db: NonNullable<ReturnType<typeof requireDb>>, projectId: string, exceptId?: string): Promise<boolean> {
  let query = db.from('product_sale_options').update({ highlighted: false }).eq('project_id', projectId).eq('highlighted', true)
  if (exceptId) query = query.neq('id', exceptId)
  const { error } = await query
  return !error
}

export async function createSaleOption(projectId: string, input: SaleOptionInput): Promise<ProductActionResultWithId> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = saleOptionRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }
  if (!(await projectExists(db, projectId))) return { ok: false, code: 'not-found' }
  if (row.highlighted && !(await clearOtherHighlights(db, projectId))) return { ok: false, code: 'error' }

  const { data, error } = await db
    .from('product_sale_options')
    .insert({ ...row, project_id: projectId, published: false, sort_order: await nextSortOrder(db, 'product_sale_options', projectId) })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.product_sale_option_created', entity: 'product_sale_option', entityId: data.id, after: { projectId, kind: row.kind } })
  await revalidateProject(db, projectId)
  return { ok: true, id: data.id }
}

export async function updateSaleOption(id: string, projectId: string, input: SaleOptionInput): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(id) || !isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = saleOptionRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data: current } = await db.from('product_sale_options').select('published, price_afn, price_usd').eq('id', id).eq('project_id', projectId).maybeSingle()
  if (!current) return { ok: false, code: 'not-found' }
  if (row.highlighted && !(await clearOtherHighlights(db, projectId, id))) return { ok: false, code: 'error' }

  const completeness = saleOptionCompleteness({ title: row.title as LocalizedText, summary: row.summary as LocalizedText | null, included: row.included as LocalizedText[] })
  const stillPublished = (current as { published: boolean }).published && completeness.en && completeness.fa

  const { error } = await db.from('product_sale_options').update({ ...row, published: stillPublished }).eq('id', id).eq('project_id', projectId)
  if (error) return { ok: false, code: 'error' }

  const priced = current as { price_afn: number | string | null; price_usd: number | string | null }
  const before = moneyFromRow(priced.price_afn, priced.price_usd)
  await writeAuditLog({
    actor: auth.userId,
    action: 'content.product_sale_option_updated',
    entity: 'product_sale_option',
    entityId: id,
    // Prices are business facts the owner will want a history of.
    before: { price: before },
    after: { projectId, price: { afn: row.price_afn, usd: row.price_usd } },
  })
  await revalidateProject(db, projectId)
  return { ok: true }
}

export async function deleteSaleOption(id: string, projectId: string): Promise<ProductActionResult> {
  return deleteChild('product_sale_options', id, projectId)
}

export async function reorderSaleOptions(projectId: string, orderedIds: string[]): Promise<ProductActionResult> {
  return reorderChildren('product_sale_options', projectId, orderedIds)
}

export async function publishSaleOption(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('product_sale_options', id, projectId, true)
}

export async function unpublishSaleOption(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('product_sale_options', id, projectId, false)
}

// ---------------------------------------------------------------------------
// 27.3 after-sales services

function productServiceRow(input: ProductServiceInput): Record<string, unknown> | null {
  if (!input || !(BILLING as readonly string[]).includes(input.period)) return null
  const title = cleanText(input.title)
  if (!title) return null
  const price = cleanMoney(input.price)
  if (price === 'invalid') return null
  return {
    title,
    description: cleanText(input.description),
    price_afn: price.afn,
    price_usd: price.usd,
    price_from: price.from,
    period: input.period,
  }
}

export async function createProductService(projectId: string, input: ProductServiceInput): Promise<ProductActionResultWithId> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = productServiceRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }
  if (!(await projectExists(db, projectId))) return { ok: false, code: 'not-found' }

  const { data, error } = await db
    .from('product_services')
    .insert({ ...row, project_id: projectId, published: false, sort_order: await nextSortOrder(db, 'product_services', projectId) })
    .select('id')
    .single()
  if (error || !data) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.product_service_created', entity: 'product_service', entityId: data.id, after: { projectId } })
  await revalidateProject(db, projectId)
  return { ok: true, id: data.id }
}

export async function updateProductService(id: string, projectId: string, input: ProductServiceInput): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(id) || !isUuid(projectId)) return { ok: false, code: 'invalid' }
  const row = productServiceRow(input)
  if (!row) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data: current } = await db.from('product_services').select('published').eq('id', id).eq('project_id', projectId).maybeSingle()
  if (!current) return { ok: false, code: 'not-found' }
  const completeness = productServiceCompleteness({ title: row.title as LocalizedText, description: row.description as LocalizedText | null })
  const stillPublished = (current as { published: boolean }).published && completeness.en && completeness.fa

  const { error } = await db.from('product_services').update({ ...row, published: stillPublished }).eq('id', id).eq('project_id', projectId)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.product_service_updated', entity: 'product_service', entityId: id, after: { projectId, price: { afn: row.price_afn, usd: row.price_usd } } })
  await revalidateProject(db, projectId)
  return { ok: true }
}

export async function deleteProductService(id: string, projectId: string): Promise<ProductActionResult> {
  return deleteChild('product_services', id, projectId)
}

export async function reorderProductServices(projectId: string, orderedIds: string[]): Promise<ProductActionResult> {
  return reorderChildren('product_services', projectId, orderedIds)
}

export async function publishProductService(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('product_services', id, projectId, true)
}

export async function unpublishProductService(id: string, projectId: string): Promise<ProductActionResult> {
  return setChildPublished('product_services', id, projectId, false)
}

// ---------------------------------------------------------------------------
// 27.3 the one switch

/** "A project becomes a product with one switch" — and stops being one the same way (its options are kept). */
export async function setProjectIsProduct(projectId: string, isProduct: boolean): Promise<ProductActionResult> {
  const auth = await requireEditorSession()
  if (!auth) return { ok: false, code: 'forbidden' }
  if (!isUuid(projectId) || typeof isProduct !== 'boolean') return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const { data, error } = await db.from('projects').update({ is_product: isProduct }).eq('id', projectId).select('id')
  if (error) return { ok: false, code: 'error' }
  if (!data || data.length === 0) return { ok: false, code: 'not-found' }

  await writeAuditLog({ actor: auth.userId, action: isProduct ? 'content.project_made_product' : 'content.project_unmade_product', entity: 'project', entityId: projectId })
  await revalidateProject(db, projectId)
  return { ok: true }
}
