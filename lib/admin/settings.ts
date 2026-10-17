import 'server-only'

import { requireDb } from '@/lib/admin/pipeline'
import type { AdminNavigationItem, AdminSiteSettings } from '@/types/cms'
import { captureError } from '@/lib/observability/store'

/**
 * Admin read layer for § 15's settings/availability and navigation
 * editors. Both tables (0007) are real, live, already-seeded singleton/
 * fixed-set data. Since Phase 27.6 the public shell reads them too
 * (`lib/shell-settings-server.ts`): navigation, e-mail, WhatsApp, phone and
 * external profiles. The availability card still reads `lib/home-content.ts`.
 */

export async function getSiteSettings(): Promise<AdminSiteSettings | null> {
  const db = requireDb()
  if (!db) return null

  const { data, error } = await db
    .from('site_settings')
    .select('availability_state, next_opening, response_commitment, timezone, languages, external_profiles, updated_at, contact_email, whatsapp_number, phone_number')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) {
    await captureError(error, { event: 'admin.get_site_settings_failed', source: 'database' })
    return null
  }

  return {
    availabilityState: data.availability_state,
    nextOpening: data.next_opening ?? null,
    responseCommitment: data.response_commitment,
    timezone: data.timezone,
    languages: data.languages ?? [],
    externalProfiles: data.external_profiles ?? [],
    contactEmail: data.contact_email ?? null,
    whatsappNumber: data.whatsapp_number ?? null,
    phoneNumber: data.phone_number ?? null,
    updatedAt: data.updated_at,
  }
}

export async function listNavigationItemsAdmin(): Promise<AdminNavigationItem[] | null> {
  const db = requireDb()
  if (!db) return null

  const { data, error } = await db
    .from('navigation_items')
    .select('id, key, href, surfaces, has_description, has_content, sort_order')
    .order('sort_order', { ascending: true })
  if (error || !data) {
    await captureError(error, { event: 'admin.list_navigation_items_admin_failed', source: 'database' })
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
