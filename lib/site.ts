export const siteConfig = {
  name: 'Artaveo',
  tagline: 'Independent full-stack studio',
  description:
    'Artaveo is an independent full-stack development studio building fast, reliable web products — from architecture and design systems to shipped software.',
  email: 'hello@artaveo.studio',
  location: 'Remote · Worldwide',
}

export type NavItem = {
  href: string
  label: string
  description?: string
}

export const mainNav: NavItem[] = [
  { href: '/work', label: 'Work', description: 'Selected projects and case studies' },
  { href: '/services', label: 'Services', description: 'How we can help you ship' },
  { href: '/process', label: 'Process', description: 'The way we build, step by step' },
  { href: '/about', label: 'About', description: 'The studio and how it operates' },
  { href: '/insights', label: 'Insights', description: 'Notes on engineering and craft' },
]

export const utilityNav: NavItem[] = [
  { href: '/design-system', label: 'Design System' },
  { href: '/contact', label: 'Contact' },
]

export const socialLinks = [
  { href: 'https://github.com', label: 'GitHub' },
  { href: 'https://x.com', label: 'X' },
  { href: 'https://linkedin.com', label: 'LinkedIn' },
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
  { label: 'About', href: '/about', group: 'Navigate', keywords: 'studio team' },
  { label: 'Insights', href: '/insights', group: 'Navigate', keywords: 'blog writing notes' },
  { label: 'Design System', href: '/design-system', group: 'Resources', keywords: 'tokens components ui' },
  { label: 'Contact', href: '/contact', group: 'Actions', keywords: 'email start project hire' },
  { label: 'Email the studio', href: 'mailto:hello@artaveo.studio', group: 'Actions', keywords: 'mail reach' },
]
