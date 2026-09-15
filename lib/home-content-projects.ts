import 'server-only'

import type { Project } from '@/types/content'

/**
 * Phase 12.2 (roadmap § 12) — project selectors, Supabase-backed. Split
 * out of `lib/home-content.ts` on purpose: that file is still imported by
 * a Client Component (`components/site/site-shell.tsx`, for
 * `getDeveloperProfile()`), and this module's `server-only` import (via
 * `lib/supabase/content-queries.ts`) would break that component's client
 * bundle if it lived in the same file. Only Server Components import from
 * here — pages (`app/[locale]/work/**`, `app/[locale]/services/[slug]`,
 * `app/sitemap.ts`) and Server Components under `components/home/`.
 *
 * The `@/lib/supabase/content-queries` import below is dynamic, not a
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

export async function getFeaturedProjects(): Promise<Project[]> {
  const { queryFeaturedProjects } = await import('@/lib/supabase/content-queries')
  return queryFeaturedProjects()
}

/** Every published project, featured-first — backs `/work` (§ 6.1). */
export async function getAllProjects(): Promise<Project[]> {
  const { queryAllProjects } = await import('@/lib/supabase/content-queries')
  const projects = await queryAllProjects()
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured))
}

/** A single published project by slug, or `undefined` — backs `/work/[slug]` (§ 6.1). */
export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const { queryProjectBySlug } = await import('@/lib/supabase/content-queries')
  return queryProjectBySlug(slug)
}
