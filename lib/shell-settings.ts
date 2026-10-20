import { commandItems, legalNav, mainNav, siteConfig, socialLinks, utilityNav, type NavKey } from '@/lib/site'

/**
 * Phase 27.6 — the site shell's settings come from the database: which navigation
 * items appear where (`navigation_items`) and the contact channels — e-mail,
 * WhatsApp, phone, external profiles (`site_settings`). The owner edits both in
 * the admin (Content → Navigation, Content → Settings); `lib/site.ts` keeps only
 * the structure the code needs (keys, the command palette's keywords) and the
 * fallback below.
 *
 * Pure module (no database, no React): the server read is
 * `lib/shell-settings-server.ts`, the client hooks are in
 * `components/site/site-flags.tsx`, the rules are unit-tested.
 */

export const NAV_SURFACES = ['header', 'footer', 'mobile', 'command-palette'] as const
export type NavSurface = (typeof NAV_SURFACES)[number]

/** Every key the shell knows a label for (`Nav.<key>` in messages/*.json). Same list as the database check (0026). */
export const NAV_KEYS: NavKey[] = [
  'home', 'products', 'work', 'services', 'about', 'insights',
  'designSystem', 'contact', 'start', 'consultation', 'privacy', 'terms',
]

export const LEGAL_KEYS: NavKey[] = ['privacy', 'terms']

export type ShellNavItem = {
  key: NavKey
  href: string
  hasDescription: boolean
  surfaces: NavSurface[]
}

export type ShellContact = {
  email: string | null
  /** International form, `+93…`. */
  whatsappNumber: string | null
  phoneNumber: string | null
}

export type ShellData = {
  /** Visible items only (`has_content`), in the owner's order. */
  nav: ShellNavItem[]
  contact: ShellContact
  profiles: { href: string; label: string }[]
}

// ---------------------------------------------------------------------------
// validation shared with the admin actions

/** A same-site path: `/`, `/work`, `/services/websites`. Never `//host` or a scheme. */
export function isSafeInternalHref(href: string): boolean {
  return typeof href === 'string' && href.length <= 200 && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/i.test(href)
}

/** An external profile: an https address and nothing else. */
export function isSafeExternalHref(href: string): boolean {
  if (typeof href !== 'string' || href.length > 500) return false
  try {
    return new URL(href).protocol === 'https:'
  } catch {
    return false
  }
}

/** `+93 79 068 5832`, `0093790685832`, `+93-790-685-832` → `+93790685832`; anything else → `'invalid'`. */
export function normalizePhoneNumber(input: string): string | 'invalid' {
  const compact = String(input ?? '').replace(/[\s().-]/g, '').replace(/^00/, '+')
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : 'invalid'
}

export function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/^\+/, '')}`
}

export function telHref(number: string): string {
  return `tel:${number}`
}

/** `+93790685832` → `+93 79 068 5832` for display (Afghan numbers); other countries keep the compact form. */
export function formatPhoneNumber(number: string): string {
  const afghan = /^\+93(\d{2})(\d{3})(\d{4})$/.exec(number)
  return afghan ? `+93 ${afghan[1]} ${afghan[2]} ${afghan[3]}` : number
}

// ---------------------------------------------------------------------------
// rows → shell data

type NavRow = { key: string; href: string; surfaces: string[] | null; has_description: boolean; has_content: boolean; sort_order: number }
type SettingsRow = {
  contact_email: string | null
  whatsapp_number: string | null
  phone_number: string | null
  external_profiles: { href: string; label: string }[] | null
}

export function buildShellData(navRows: NavRow[], settings: SettingsRow | null): ShellData {
  const nav = [...navRows]
    .filter((row) => row.has_content && (NAV_KEYS as string[]).includes(row.key) && isSafeInternalHref(row.href))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      key: row.key as NavKey,
      href: row.href,
      hasDescription: !!row.has_description,
      surfaces: (row.surfaces ?? []).filter((s): s is NavSurface => (NAV_SURFACES as readonly string[]).includes(s)),
    }))

  return {
    nav,
    contact: {
      email: settings?.contact_email || null,
      whatsappNumber: settings?.whatsapp_number || null,
      phoneNumber: settings?.phone_number || null,
    },
    profiles: (settings?.external_profiles ?? []).filter((p) => p && p.label && isSafeExternalHref(p.href)),
  }
}

/**
 * What the shell shows when the database cannot be read (a misconfigured preview,
 * an outage): the values the site shipped with, so a page never loses its
 * navigation. Never used while the database answers.
 */
export const FALLBACK_SHELL: ShellData = (() => {
  const command = new Set(commandItems.filter((c) => c.hasContent !== false).map((c) => c.labelKey))
  const items: ShellNavItem[] = []
  for (const item of mainNav) {
    if (item.hasContent === false) continue
    items.push({ key: item.key, href: item.href, hasDescription: !!item.hasDescription, surfaces: ['header', 'footer', 'mobile', 'command-palette'] })
  }
  for (const item of [...utilityNav, ...legalNav]) {
    items.push({ key: item.key, href: item.href, hasDescription: false, surfaces: command.has(item.key) ? ['footer', 'command-palette'] : ['footer'] })
  }
  for (const key of ['start', 'consultation'] as NavKey[]) {
    const command = commandItems.find((c) => c.labelKey === key)
    if (command) items.push({ key, href: command.href, hasDescription: false, surfaces: ['command-palette'] })
  }
  const whatsapp = socialLinks.find((link) => link.label === 'WhatsApp')?.href.match(/wa\.me\/(\d+)/)?.[1]
  return {
    nav: items,
    contact: { email: siteConfig.email, whatsappNumber: whatsapp ? `+${whatsapp}` : null, phoneNumber: whatsapp ? `+${whatsapp}` : null },
    profiles: socialLinks,
  }
})()

export function navFor(shell: ShellData, surface: NavSurface): ShellNavItem[] {
  return shell.nav.filter((item) => item.surfaces.includes(surface))
}
