/**
 * `email` is a real, owner-confirmed inbox (not the unverified
 * `hello@artaveo.studio` placeholder removed in § 3.5). It is an interim
 * contact channel until a production domain is registered and D-01 is
 * fully resolved with a domain-backed address (SPF/DKIM/DMARC) for
 * Phase 9.4's automated notifications.
 */
export const siteConfig = {
  name: 'Artaveo',
  tagline: 'Independent full-stack developer',
  description:
    'Artaveo is the work of one independent full-stack developer — building fast, reliable web products end to end, from architecture and design systems to shipped software.',
  email: 'artaveo.dev@gmail.com',
  location: 'Remote · Worldwide',
}

/**
 * `key` maps to `Nav.<key>` / `Nav.<key>Description` in `messages/*.json`
 * (§ 5.1) — the href is locale-independent structure, the copy is not.
 */
export type NavKey =
  | 'home'
  | 'work'
  | 'services'
  | 'process'
  | 'about'
  | 'insights'
  | 'designSystem'
  | 'contact'

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
   */
  hasContent?: boolean
}

export const mainNav: NavItem[] = [
  { href: '/', key: 'home' },
  { href: '/work', key: 'work', hasDescription: true },
  { href: '/services', key: 'services', hasDescription: true },
  { href: '/process', key: 'process', hasDescription: true },
  { href: '/about', key: 'about', hasDescription: true },
  { href: '/insights', key: 'insights', hasDescription: true, hasContent: false },
]

/**
 * The only list nav surfaces (header, mobile nav, footer) should render —
 * filters out items whose `hasContent` is explicitly `false`. `mainNav`
 * itself stays the full, canonical route list for anything that needs it
 * (active-state checks, sitemap generation, etc.).
 */
export const visibleMainNav: NavItem[] = mainNav.filter((item) => item.hasContent !== false)

/**
 * `/work` shows category/technology filters only once there are enough
 * projects to need them (roadmap § 6.1). With today's two projects the
 * grid renders unfiltered; raise this only alongside real published work.
 */
export const WORK_FILTER_THRESHOLD = 6

export const utilityNav: NavItem[] = [
  { href: '/design-system', key: 'designSystem' },
  { href: '/contact', key: 'contact' },
]

/**
 * Real profiles and channels only (§ 3.5 / D-05). No X/Twitter profile —
 * it isn't part of the hire-channel strategy. WhatsApp and the phone
 * number behind it (+93 790685832) are the same real contact channel.
 */
export const socialLinks = [
  { href: 'https://github.com/artaveo', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/artaveodevelops', label: 'LinkedIn' },
  { href: 'https://www.fiverr.com/sellers/zakir_naseri', label: 'Fiverr' },
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
}

export const commandItems: CommandItem[] = [
  { labelKey: 'home', labelNamespace: 'CommandPalette', href: '/', group: 'navigate', keywords: 'start landing home' },
  { labelKey: 'work', labelNamespace: 'Nav', href: '/work', group: 'navigate', keywords: 'projects portfolio case studies work' },
  { labelKey: 'services', labelNamespace: 'Nav', href: '/services', group: 'navigate', keywords: 'offerings help services' },
  { labelKey: 'process', labelNamespace: 'Nav', href: '/process', group: 'navigate', keywords: 'method steps how process' },
  { labelKey: 'about', labelNamespace: 'Nav', href: '/about', group: 'navigate', keywords: 'developer about' },
  { labelKey: 'insights', labelNamespace: 'Nav', href: '/insights', group: 'navigate', keywords: 'blog writing notes insights', hasContent: false },
  { labelKey: 'designSystem', labelNamespace: 'Nav', href: '/design-system', group: 'resources', keywords: 'tokens components ui design system' },
  { labelKey: 'contact', labelNamespace: 'Nav', href: '/contact', group: 'actions', keywords: 'start project hire contact' },
  { labelKey: 'emailArtaveo', labelNamespace: 'CommandPalette', href: 'mailto:artaveo.dev@gmail.com', group: 'actions', keywords: 'mail email reach contact' },
]

/** Command palette's visible set — same `hasContent` filter as `visibleMainNav`. */
export const visibleCommandItems: CommandItem[] = commandItems.filter(
  (item) => item.hasContent !== false,
)
