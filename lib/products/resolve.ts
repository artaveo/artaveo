import 'server-only'

import type { DbClient } from '@/lib/db/server'
import type { ProductServiceRow, SaleOptionRow } from '@/lib/db/content-queries'
import { moneyFromRow } from '@/lib/products/money'
import type { Project } from '@/types/content'
import type { ProductChoice, ProductSnapshot } from '@/types/inquiry'

/**
 * Phase 27.5 — turns what a visitor picked (a product slug, maybe a sale option,
 * maybe after-sales services) into the rows it means, checked against the
 * database: the product must be published and be a product; the option and
 * the services must be published and belong to it. Anything else is refused —
 * a request can only ever name something the site really offers.
 *
 * Returns the ids to store and the snapshot of titles and prices at this moment.
 */
export async function resolveProductSelection(
  db: DbClient,
  selection: { productSlug: string; saleOptionId?: string | null; productServiceIds?: string[] },
): Promise<{ projectId: string; saleOptionId: string | null; serviceIds: string[]; snapshot: ProductSnapshot } | null> {
  const { data: product } = await db
    .from('projects')
    .select('id, slug, title')
    .eq('slug', selection.productSlug)
    .eq('published', true)
    .eq('is_product', true)
    .maybeSingle()
  if (!product) return null
  const p = product as { id: string; slug: string; title: ProductSnapshot['product']['title'] }

  let option: ProductSnapshot['option'] = null
  if (selection.saleOptionId) {
    const { data } = await db
      .from('product_sale_options')
      .select('id, kind, title, price_afn, price_usd, price_from, billing_period')
      .eq('id', selection.saleOptionId)
      .eq('project_id', p.id)
      .eq('published', true)
      .maybeSingle()
    if (!data) return null
    const row = data as unknown as SaleOptionRow
    option = { id: row.id, kind: row.kind, title: row.title, price: moneyFromRow(row.price_afn, row.price_usd, row.price_from), billingPeriod: row.billing_period }
  }

  const wanted = [...new Set(selection.productServiceIds ?? [])]
  let services: ProductSnapshot['services'] = []
  if (wanted.length > 0) {
    const { data } = await db
      .from('product_services')
      .select('id, title, price_afn, price_usd, price_from, period, sort_order')
      .in('id', wanted)
      .eq('project_id', p.id)
      .eq('published', true)
    const rows = (data ?? []) as unknown as ProductServiceRow[]
    if (rows.length !== wanted.length) return null
    services = rows
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({ id: row.id, title: row.title, price: moneyFromRow(row.price_afn, row.price_usd, row.price_from), period: row.period }))
  }

  return {
    projectId: p.id,
    saleOptionId: option?.id ?? null,
    serviceIds: services.map((service) => service.id),
    snapshot: { product: { id: p.id, slug: p.slug, title: p.title }, option, services },
  }
}

/** The public product list, slimmed to what a request form needs to offer. */
export function toProductChoices(products: Pick<Project, 'slug' | 'title' | 'saleOptions' | 'productServices'>[]): ProductChoice[] {
  return products.map((product) => ({
    slug: product.slug,
    title: product.title,
    saleOptions: product.saleOptions.map(({ id, kind, title, price, billingPeriod }) => ({ id, kind, title, price, billingPeriod })),
    services: product.productServices.map(({ id, title, price, period }) => ({ id, title, price, period })),
  }))
}
