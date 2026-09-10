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

export type NavItem = {
  href: string
  label: string
  description?: string
}

export const mainNav: NavItem[] = [
  { href: '/work', label: 'Work', description: 'Selected projects and case studies' },
  { href: '/services', label: 'Services', description: 'How I can help you ship' },
  { href: '/process', label: 'Process', description: 'How I build, step by step' },
  { href: '/about', label: 'About', description: 'The developer behind Artaveo' },
  { href: '/insights', label: 'Insights', description: 'Notes on engineering and craft' },
]

export const utilityNav: NavItem[] = [
  { href: '/design-system', label: 'Design System' },
  { href: '/contact', label: 'Contact' },
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

export type CommandItem = {
  label: string
  href: string
  group: string
  keywords?: string
}

export const commandItems: CommandItem[] = [
  { label: 'Home', href: '/', group: 'Navigate', keywords: 'start landing' },
  { label: 'Work', href: '/work', group: 'Navigate', keywords: 'projects portfolio case studies' },
  { label: 'Services', href: '/services', group: 'Navigate', keywords: 'offerings help' },
  { label: 'Process', href: '/process', group: 'Navigate', keywords: 'method steps how' },
  { label: 'About', href: '/about', group: 'Navigate', keywords: 'developer about' },
  { label: 'Insights', href: '/insights', group: 'Navigate', keywords: 'blog writing notes' },
  { label: 'Design System', href: '/design-system', group: 'Resources', keywords: 'tokens components ui' },
  { label: 'Contact', href: '/contact', group: 'Actions', keywords: 'start project hire' },
  { label: 'Email Artaveo', href: 'mailto:artaveo.dev@gmail.com', group: 'Actions', keywords: 'mail email reach contact' },
]
