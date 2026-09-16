'use server'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { requireSupabase } from '@/lib/admin/pipeline'
import type { NavigationItemInput, SiteSettingsInput } from '@/types/cms'

/**
 * § 15's settings/availability and navigation editors. Both write to
 * real, live tables (0007) — but, unlike every other § 15 entity, no
 * `revalidatePath` call here: the public site's Availability Card and
 * nav surfaces don't read from these tables yet (still
 * `lib/home-content.ts`/`lib/site.ts`'s static values — see
 * `docs/phases/PHASE-15-README.md`), so there is nothing cached to
 * invalidate. Revalidation is added the same day the public read path
 * is switched over, not before.
 */

type SettingsActionResult = { ok: false; code: 'forbidden' | 'not-configured' | 'error' } | { ok: true }

async function requireEditorSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

export async function updateSiteSettings(input: SiteSettingsInput): Promise<SettingsActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('site_settings')
    .update({
      availability_state: input.availabilityState,
      next_opening: input.nextOpening,
      response_commitment: { en: input.responseCommitment.en.trim(), fa: input.responseCommitment.fa.trim() },
      timezone: input.timezone.trim(),
      languages: input.languages.map((lang) => ({
        name: { en: lang.name.en.trim(), fa: lang.name.fa.trim() },
        note: { en: lang.note.en.trim(), fa: lang.note.fa.trim() },
      })),
      external_profiles: input.externalProfiles.map((p) => ({ href: p.href.trim(), label: p.label.trim() })),
    })
    .eq('id', true)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.site_settings_updated', entity: 'site_settings' })
  return { ok: true }
}

export async function updateNavigationItem(id: string, input: NavigationItemInput): Promise<SettingsActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('navigation_items')
    .update({
      href: input.href.trim(),
      surfaces: input.surfaces,
      has_description: input.hasDescription,
      has_content: input.hasContent,
      sort_order: input.sortOrder,
    })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.navigation_item_updated', entity: 'navigation_item', entityId: id })
  return { ok: true }
}
