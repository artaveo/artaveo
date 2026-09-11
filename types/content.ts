/**
 * Content entities for the public site.
 *
 * These shapes mirror the records that will later come from PostgreSQL
 * (Project, Service, Article …). Optional fields are only rendered when real
 * data exists — never fill them with invented values.
 *
 * Bilingual shape (roadmap § 3.2): every field a reader would see as prose
 * is `LocalizedText`, so Phase 5 can start filling in `fa` without changing
 * the data shape or the components that read it. `fa` currently mirrors
 * `en` — Persian copy itself is written in Phase 5.
 */

export type Locale = 'en' | 'fa'

export type LocalizedText = {
  en: string
  fa: string
}

/** Resolve a localized field for the given locale. Defaults to `en` until Phase 5 adds locale routing. */
export function t(field: LocalizedText, locale: Locale = 'en'): string {
  return field[locale] ?? field.en
}

export type ProjectStatus = 'in-development' | 'live' | 'archived'

export type Project = {
  id: string
  slug: string
  title: LocalizedText
  category: LocalizedText
  summary: LocalizedText
  /** Short, verifiable facts about what the project does. */
  highlights: LocalizedText[]
  /** Proper nouns — not translated. */
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
  title: LocalizedText
  description: LocalizedText
  deliverables: LocalizedText[]
}

export type Capability = {
  icon: string
  title: LocalizedText
  description: LocalizedText
}

export type Principle = {
  icon: string
  title: LocalizedText
  description: LocalizedText
}

export type TechCategory = {
  id: string
  title: LocalizedText
  icon: string
  /** Proper nouns — not translated. */
  items: string[]
}

export type ProcessStep = {
  id: string
  title: LocalizedText
  description: LocalizedText
}

export type ArticlePreview = {
  id: string
  slug: string
  title: LocalizedText
  excerpt: LocalizedText
  category: LocalizedText
  /** ISO date. `null` while the article is still being written. */
  publishedAt: string | null
  /** Minutes. `null` until the article is final. */
  readingMinutes: number | null
}

export type AvailabilityState = 'available' | 'limited' | 'unavailable'

/**
 * Owner-maintained availability (roadmap § 4.5, D-08). `state` and
 * `updatedAt` are hand-edited today; TODO(Phase 9) move onto the
 * `site_settings` table once Supabase is wired up — keep this shape so
 * components go on reading a single `availability` object either way.
 */
export type Availability = {
  state: AvailabilityState
  /** ISO date the owner last confirmed this state, e.g. '2026-09-11'. */
  updatedAt: string
  responseCommitment: LocalizedText
}

export type DeveloperProfile = {
  /** Real name, shown only when provided. */
  name?: string
  /** Path to a real portrait. When missing, a neutral placeholder is shown. */
  portrait?: string
  /** UTC offset or IANA zone. City intentionally omitted (D-02). */
  timezone?: string
  bio: LocalizedText
  focus: LocalizedText[]
  availability?: Availability
}
