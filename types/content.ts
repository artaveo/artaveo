/**
 * Content entities for the public site.
 *
 * These shapes mirror the records that will later come from PostgreSQL
 * (Project, Service, Article …). Optional fields are only rendered when real
 * data exists — never fill them with invented values.
 */

export type ProjectStatus = 'in-development' | 'live' | 'archived'

export type Project = {
  id: string
  slug: string
  title: string
  category: string
  summary: string
  /** Short, verifiable facts about what the project does. */
  highlights: string[]
  technologies: string[]
  status?: ProjectStatus
  /** Path to a real screenshot. When missing, a neutral placeholder is shown. */
  coverImage?: string
  githubUrl?: string
  liveUrl?: string
  year?: string
  featured: boolean
  published: boolean
}

export type Service = {
  id: string
  slug: string
  icon: string
  title: string
  description: string
  deliverables: string[]
}

export type Capability = {
  icon: string
  title: string
  description: string
}

export type Principle = {
  icon: string
  title: string
  description: string
}

export type TechCategory = {
  id: string
  title: string
  icon: string
  items: string[]
}

export type ProcessStep = {
  id: string
  title: string
  description: string
}

export type ArticlePreview = {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  /** ISO date. `null` while the article is still being written. */
  publishedAt: string | null
  /** Minutes. `null` until the article is final. */
  readingMinutes: number | null
}

export type DeveloperProfile = {
  /** Real name, shown only when provided. */
  name?: string
  /** Path to a real portrait. When missing, a neutral placeholder is shown. */
  portrait?: string
  bio: string
  focus: string[]
}
