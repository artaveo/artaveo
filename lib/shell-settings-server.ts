import 'server-only'

import { getDbClient } from '@/lib/db/server'
import { captureError } from '@/lib/observability/store'
import { buildShellData, FALLBACK_SHELL, type ShellData } from '@/lib/shell-settings'

/**
 * Phase 27.6 — reads the shell's navigation and contact settings for the root
 * layout. Tolerant by design, like `hasPublishedArticles()`: when the database
 * cannot be read the shell falls back to the values the site shipped with
 * (`FALLBACK_SHELL`) instead of taking every page down, and the failure is
 * recorded. Saving either table in the admin revalidates the layout
 * (`app/actions/settings.ts`).
 */
export async function getShellData(): Promise<ShellData> {
  const db = getDbClient()
  if (!db) return FALLBACK_SHELL

  try {
    const [nav, settings] = await Promise.all([
      db.from('navigation_items').select('key, href, surfaces, has_description, has_content, sort_order'),
      db.from('site_settings').select('contact_email, whatsapp_number, phone_number, external_profiles').eq('id', true).maybeSingle(),
    ])
    if (nav.error || settings.error || !nav.data) throw nav.error ?? settings.error ?? new Error('no navigation rows')
    return buildShellData(nav.data as unknown as Parameters<typeof buildShellData>[0], (settings.data as unknown as Parameters<typeof buildShellData>[1]) ?? null)
  } catch (err) {
    await captureError(err, { event: 'shell.settings_read_failed', source: 'database', level: 'warn', fields: { consequence: 'the shell used its built-in navigation and contact values' } })
    return FALLBACK_SHELL
  }
}
