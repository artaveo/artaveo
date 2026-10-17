'use server'

import { revalidatePath } from 'next/cache'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { requireDb } from '@/lib/admin/pipeline'
import { isSafeExternalHref, isSafeInternalHref, normalizePhoneNumber, NAV_SURFACES } from '@/lib/shell-settings'
import type { NavigationItemInput, SiteSettingsInput } from '@/types/cms'

/**
 * § 15's settings/availability and navigation editors. Since Phase 27.6 the
 * public shell — header, mobile menu, footer, command palette, the contact page —
 * reads these two tables (`lib/shell-settings.ts`), so every save revalidates the
 * whole site layout (every page carries the shell).
 *
 * Everything that ends up in an `href` is checked here: navigation links are
 * same-site paths, external profiles are https addresses, phone numbers are
 * stored in international form (`+93…`) — the database checks the same.
 */

type SettingsActionResult = { ok: false; code: 'forbidden' | 'not-configured' | 'invalid' | 'error' } | { ok: true }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireEditorSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

function revalidateShell(): void {
  revalidatePath('/', 'layout')
}

export async function updateSiteSettings(input: SiteSettingsInput): Promise<SettingsActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const profiles = (input.externalProfiles ?? []).map((p) => ({ href: String(p.href ?? '').trim(), label: String(p.label ?? '').trim() }))
  if (profiles.some((p) => !p.label || !isSafeExternalHref(p.href))) return { ok: false, code: 'invalid' }

  const email = input.contactEmail?.trim() || null
  if (email && !EMAIL.test(email)) return { ok: false, code: 'invalid' }
  const whatsapp = input.whatsappNumber?.trim() ? normalizePhoneNumber(input.whatsappNumber) : null
  const phone = input.phoneNumber?.trim() ? normalizePhoneNumber(input.phoneNumber) : null
  if (whatsapp === 'invalid' || phone === 'invalid') return { ok: false, code: 'invalid' }

  const { error } = await db
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
      external_profiles: profiles,
      contact_email: email,
      whatsapp_number: whatsapp,
      phone_number: phone,
    })
    .eq('id', true)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.site_settings_updated', entity: 'site_settings' })
  revalidateShell()
  return { ok: true }
}

export async function updateNavigationItem(id: string, input: NavigationItemInput): Promise<SettingsActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!UUID.test(String(id))) return { ok: false, code: 'invalid' }
  const db = requireDb()
  if (!db) return { ok: false, code: 'not-configured' }

  const href = String(input.href ?? '').trim()
  const surfaces = Array.isArray(input.surfaces) ? [...new Set(input.surfaces)] : []
  if (!isSafeInternalHref(href) || surfaces.some((s) => !(NAV_SURFACES as readonly string[]).includes(s))) {
    return { ok: false, code: 'invalid' }
  }
  const sortOrder = Number.isInteger(input.sortOrder) ? input.sortOrder : 0

  const { error } = await db
    .from('navigation_items')
    .update({
      href,
      surfaces,
      has_description: !!input.hasDescription,
      has_content: !!input.hasContent,
      sort_order: sortOrder,
    })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.navigation_item_updated', entity: 'navigation_item', entityId: id })
  revalidateShell()
  return { ok: true }
}
