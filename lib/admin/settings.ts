import 'server-only'

import { requireSupabase } from '@/lib/admin/pipeline'
import type { AdminNavigationItem, AdminSiteSettings } from '@/types/cms'

/**
 * Admin read layer for § 15's settings/availability and navigation
 * editors. Both tables (0007) are real, live, already-seeded singleton/
 * fixed-set data — see `docs/phases/PHASE-15-README.md` for why editing
 * them here does not yet change what the public site renders (the
 * public read path is still `lib/home-content.ts`/`lib/site.ts`'s static
 * values, a separate, larger, deliberately-not-bundled-in refactor).
 */

export async function getSiteSettings(): Promise<AdminSiteSettings | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('site_settings')
    .select('availability_state, next_opening, response_commitment, timezone, languages, external_profiles, updated_at')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) {
    console.error('getSiteSettings failed:', error)
    return null
  }

  return {
    availabilityState: data.availability_state,
    nextOpening: data.next_opening ?? null,
    responseCommitment: data.response_commitment,
    timezone: data.timezone,
    languages: data.languages ?? [],
    externalProfiles: data.external_profiles ?? [],
    updatedAt: data.updated_at,
  }
}

export async function listNavigationItemsAdmin(): Promise<AdminNavigationItem[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('navigation_items')
    .select('id, key, href, surfaces, has_description, has_content, sort_order')
    .order('sort_order', { ascending: true })
  if (error || !data) {
    console.error('listNavigationItemsAdmin failed:', error)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    key: row.key,
    href: row.href,
    surfaces: row.surfaces ?? [],
    hasDescription: !!row.has_description,
    hasContent: !!row.has_content,
    sortOrder: row.sort_order,
  }))
}
