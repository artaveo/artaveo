import 'server-only'

import type { Project } from '@/types/content'

/**
 * Phase 12.2 (roadmap § 12) — project selectors, database-backed. Split
 * out of `lib/home-content.ts` on purpose: that file is still imported by
 * a Client Component (`components/site/site-shell.tsx`, for
 * `getDeveloperProfile()`), and this module's `server-only` import (via
 * `lib/db/content-queries.ts`) would break that component's client
 * bundle if it lived in the same file. Only Server Components import from
 * here — pages (`app/[locale]/work/**`, `app/[locale]/services/[slug]`,
 * `app/sitemap.ts`) and Server Components under `components/home/`.
 *
 * The `@/lib/db/content-queries` import below is dynamic, not a
 * static top-level import, for the same reason `lib/services-content.ts`
 * uses a dynamic import for it: `scripts/import-content-to-db.ts` loads
 * `lib/home-content.ts` directly via Node, which cannot resolve the `@/`
 * alias — a static import here would risk breaking that resolution path
 * if this module were ever reached from there (it currently isn't, since
 * the script imports `getAllProjectsRaw()` from `home-content.ts`
 * directly, not from this file — but keeping the import dynamic here too
 * means that stays true even if that ever changes).
 *
 * The file-based source these functions used to read
 * (`featuredProjectsData` in `lib/home-content.ts`) still exists — it's
 * now the input to `scripts/import-content-to-db.ts`, exposed there as
 * `getAllProjectsRaw()`, not read by these functions at all.
 */

/** Featured portfolio projects (Phase 27.1: only those with `showInPortfolio`). */
export async function getFeaturedProjects(): Promise<Project[]> {
  const { queryFeaturedProjects } = await import('@/lib/db/content-queries')
  return (await queryFeaturedProjects()).filter((project) => project.showInPortfolio)
}

/** Every published portfolio project, featured-first — backs `/work` (§ 6.1). Phase 27.1: a product that is switched out of the portfolio is not here. */
export async function getAllProjects(): Promise<Project[]> {
  const { queryAllProjects } = await import('@/lib/db/content-queries')
  const projects = (await queryAllProjects()).filter((project) => project.showInPortfolio)
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured))
}

/** A single published portfolio project by slug, or `undefined` — backs `/work/[slug]` (§ 6.1). */
export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const { queryProjectBySlug } = await import('@/lib/db/content-queries')
  const project = await queryProjectBySlug(slug)
  return project?.showInPortfolio ? project : undefined
}

/** Phase 27.3 — every published product with its published ways to get it and after-sales services. */
export async function getProducts(): Promise<Project[]> {
  const { queryProducts } = await import('@/lib/db/content-queries')
  return queryProducts()
}

/** Phase 30 — one published product by slug, or `undefined` — backs `/products/[slug]`. Independent of the portfolio switch. */
export async function getProductBySlug(slug: string): Promise<Project | undefined> {
  const { queryProductBySlug } = await import('@/lib/db/content-queries')
  return queryProductBySlug(slug)
}
