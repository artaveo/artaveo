import 'server-only'

import { getDbClient } from '@/lib/db/server'
import { captureError } from '@/lib/observability/store'
import { buildShellMenus, EMPTY_MENUS, type ShellMenus } from '@/lib/shell-menus'
import { buildShellData, FALLBACK_SHELL, type ShellData } from '@/lib/shell-settings'
import type { Locale } from '@/types/content'

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

/**
 * Phase 29.1 — the entries of the header's Products and Services mega menus
 * and of the footer's columns: the published products and services, in the
 * page's language. Same tolerance as `getShellData()`: when they cannot be
 * read the menus are empty (the header shows its plain links, the footer its
 * pages) and the failure is recorded. Saving a project, a product's options or
 * a service in the admin revalidates the layout (`app/actions/content.ts`,
 * `app/actions/products.ts`).
 */
export async function getShellMenus(locale: Locale): Promise<ShellMenus> {
  if (!getDbClient()) return EMPTY_MENUS
  try {
    const [{ getProducts }, { getAllServices }] = await Promise.all([import('@/lib/home-content-projects'), import('@/lib/services-content')])
    const [products, services] = await Promise.all([getProducts(), getAllServices()])
    return buildShellMenus(products, services, locale)
  } catch (err) {
    await captureError(err, { event: 'shell.menus_read_failed', source: 'database', level: 'warn', fields: { consequence: 'the header and footer showed no product or service entries' } })
    return EMPTY_MENUS
  }
}
