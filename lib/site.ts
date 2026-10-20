/**
 * `email` is a real, owner-confirmed inbox (not the unverified
 * `hello@artaveo.studio` placeholder removed in § 3.5). It is an interim
 * contact channel until a production domain is registered and D-01 is
 * fully resolved with a domain-backed address (SPF/DKIM/DMARC) for
 * § 9.3's automated notifications — it is also the current owner-alert
 * recipient there (`lib/notifications/templates.ts`) while sending stays
 * on the console provider.
 */
export const siteConfig = {
  name: 'Artaveo',
  tagline: 'Software design and development',
  description:
    'Artaveo designs and builds websites, management systems, mobile apps and desktop software for businesses.',
  email: 'artaveo.dev@gmail.com',
  location: 'Remote · Worldwide',
}

/**
 * `key` maps to `Nav.<key>` / `Nav.<key>Description` in `messages/*.json`
 * (§ 5.1) — the href is locale-independent structure, the copy is not.
 */
export type NavKey =
  | 'home'
  | 'products'
  | 'work'
  | 'services'
  | 'about'
  | 'insights'
  | 'designSystem'
  | 'contact'
  | 'start'
  | 'consultation'
  | 'privacy'
  | 'terms'

/**
 * Sections whose visibility is decided by real content in the database
 * rather than a static flag (see `components/site/site-flags.tsx`).
 */
export type ContentFlag = 'insights'

export type NavItem = {
  href: string
  key: NavKey
  hasDescription?: boolean
  /**
   * Set to `false` to hide this item from every nav surface (header,
   * mobile nav, footer, command palette) without deleting the route
   * definition — § 5.2's "Insights hidden until content exists" rule.
   * Flip to `true` (or drop the field) once Phase 17 publishes real
   * articles behind `/insights`.
   *
   * Phase 17: items that also carry `contentFlag` ignore this field —
   * their visibility comes from the flag, resolved server-side.
   */
  hasContent?: boolean
  /** Visibility derived from real content instead of `hasContent` (Phase 17). */
  contentFlag?: ContentFlag
}

/**
 * Phase 27.6: which items a visitor sees, where and in which order comes from the
 * database (`navigation_items`, edited in the admin — `lib/shell-settings.ts`).
 * These lists are the structure the code needs and the fallback the shell uses
 * only when the database cannot be read.
 */
export const mainNav: NavItem[] = [
  { href: '/', key: 'home' },
  // Phase 30: /products exists; the shell still hides it while no product is published (lib/shell-menus.ts).
  { href: '/products', key: 'products', hasDescription: true },
  { href: '/work', key: 'work', hasDescription: true },
  { href: '/services', key: 'services', hasDescription: true },
  { href: '/about', key: 'about', hasDescription: true },
  // Hidden from every nav surface for now, whether or not an article is published (Phase 26.5):
  // the articles that exist are engineering notes, not customer reading. Phase 33 decides when
  // articles get a link again (a footer link first) — until then this stays `hasContent: false`
  // with no `contentFlag`, so a published article does not bring the link back by itself.
  { href: '/insights', key: 'insights', hasDescription: true, hasContent: false },
]

/**
 * `mainNav` is the full, canonical route list. Which of its items a
 * visitor actually sees is decided at render time by
 * `useVisibleMainNav()` (`components/site/site-flags.tsx`): items with a
 * `contentFlag` follow real content in the database, everything else
 * follows the static `hasContent` rule. (Pre-Phase-17 this file exported a
 * pre-filtered `visibleMainNav`; it was removed because a static filter
 * can no longer express "Insights appears with the first article".)
 */

/**
 * `/work` shows its platform filters only once there are enough projects to
 * need them (roadmap § 6.1, Phase 30.2 — `lib/work-filters.ts`). Below this the
 * rows are shown unfiltered.
 */
export const WORK_FILTER_THRESHOLD = 6


export const utilityNav: NavItem[] = [
  { href: '/design-system', key: 'designSystem' },
  { href: '/contact', key: 'contact' },
]

/**
 * § 11.2 (per D-07). Rendered in the footer's bottom bar via `Link`
 * (already locale-aware) — see `components/site/site-footer.tsx`'s own
 * doc comment, which flagged exactly this as the place to add them once
 * real pages existed.
 */
export const legalNav: NavItem[] = [
  { href: '/privacy', key: 'privacy' },
  { href: '/terms', key: 'terms' },
]

/**
 * Real profiles and channels only (§ 3.5 / D-05). No X/Twitter profile —
 * it isn't part of the hire-channel strategy. WhatsApp and the phone
 * number behind it (+93 790685832) are the same real contact channel.
 */
export const socialLinks = [
  { href: 'https://github.com/artaveo', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/artaveodevelops', label: 'LinkedIn' },
  { href: 'https://www.fiverr.com/zakir_naseri', label: 'Fiverr' },
  { href: 'https://wa.me/93790685832', label: 'WhatsApp' },
]

/**
 * `labelKey` resolves against `Nav.<key>` or `CommandPalette.<key>`;
 * `group` resolves against `CommandPalette.group<Group>` (§ 5.1). Keywords
 * stay English-only — they are a local, case-insensitive filter over the
 * palette's own English source strings, not user-facing copy.
 */
export type CommandGroup = 'navigate' | 'resources' | 'actions'

export type CommandItem = {
  labelKey: NavKey | 'emailArtaveo'
  labelNamespace: 'Nav' | 'CommandPalette'
  href: string
  group: CommandGroup
  keywords?: string
  /** Same hiding rule as `NavItem.hasContent` (§ 5.2) — kept in sync with `mainNav`. */
  hasContent?: boolean
  /** Same as `NavItem.contentFlag` — kept in sync with `mainNav`. */
  contentFlag?: ContentFlag
}

export const commandItems: CommandItem[] = [
  { labelKey: 'home', labelNamespace: 'CommandPalette', href: '/', group: 'navigate', keywords: 'start landing home' },
  { labelKey: 'products', labelNamespace: 'Nav', href: '/products', group: 'navigate', keywords: 'products software licence buy demo' },
  { labelKey: 'work', labelNamespace: 'Nav', href: '/work', group: 'navigate', keywords: 'projects portfolio case studies work' },
  { labelKey: 'services', labelNamespace: 'Nav', href: '/services', group: 'navigate', keywords: 'offerings help services website app mobile desktop support process steps how it works' },
  { labelKey: 'about', labelNamespace: 'Nav', href: '/about', group: 'navigate', keywords: 'about studio founder' },
  { labelKey: 'insights', labelNamespace: 'Nav', href: '/insights', group: 'navigate', keywords: 'blog writing notes insights', hasContent: false },
  { labelKey: 'designSystem', labelNamespace: 'Nav', href: '/design-system', group: 'resources', keywords: 'tokens components ui design system' },
  { labelKey: 'start', labelNamespace: 'Nav', href: '/start', group: 'actions', keywords: 'start project brief builder inquiry hire' },
  { labelKey: 'contact', labelNamespace: 'Nav', href: '/contact', group: 'actions', keywords: 'contact email whatsapp phone call' },
  { labelKey: 'consultation', labelNamespace: 'Nav', href: '/consultation', group: 'actions', keywords: 'book consultation call intro meeting schedule time' },
  { labelKey: 'privacy', labelNamespace: 'Nav', href: '/privacy', group: 'resources', keywords: 'privacy policy data' },
  { labelKey: 'terms', labelNamespace: 'Nav', href: '/terms', group: 'resources', keywords: 'terms of service legal' },
  { labelKey: 'emailArtaveo', labelNamespace: 'CommandPalette', href: 'mailto:artaveo.dev@gmail.com', group: 'actions', keywords: 'mail email reach contact' },
]
