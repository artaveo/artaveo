import type { LocalizedText } from '@/types/content'
import { formatPhoneNumber, telHref, whatsappHref, type ShellContact } from '@/lib/shell-settings'

/**
 * Phase 31.4 — `/contact` offers direct channels only (D-05, revised in
 * revision 45): WhatsApp, phone and e-mail, each shown only when the owner
 * set it in the admin (Content → Contact & availability — `site_settings`,
 * Phase 27.6). The Hire Channel Selector (direct vs a freelance platform) is
 * retired; real external profiles stay as links in the footer.
 */

export type DirectContactKind = 'whatsapp' | 'phone' | 'email'

export type DirectContactChannel = {
  id: DirectContactKind
  label: LocalizedText
  /** What the visitor sees: the number or the address. */
  value: string
  href: string
  external: boolean
}

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

/** WhatsApp first — the main channel in Afghanistan (§ 14.0) — then phone, then e-mail. */
export function getDirectContactChannels(contact: ShellContact): DirectContactChannel[] {
  const channels: DirectContactChannel[] = []
  if (contact.whatsappNumber) {
    channels.push({ id: 'whatsapp', label: tx('WhatsApp', 'واتس‌اپ'), value: formatPhoneNumber(contact.whatsappNumber), href: whatsappHref(contact.whatsappNumber), external: true })
  }
  if (contact.phoneNumber) {
    channels.push({ id: 'phone', label: tx('Phone', 'تلفن'), value: formatPhoneNumber(contact.phoneNumber), href: telHref(contact.phoneNumber), external: false })
  }
  if (contact.email) {
    channels.push({ id: 'email', label: tx('E-mail', 'ایمیل'), value: contact.email, href: `mailto:${contact.email}`, external: false })
  }
  return channels
}
