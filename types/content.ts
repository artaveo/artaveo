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

/**
 * Honest status vocabulary (roadmap § 6.1): the only states a project may
 * be labelled with. Never invent a state outside this set.
 */
export type ProjectStatus = 'live' | 'in-development' | 'private' | 'archived' | 'concept'

/**
 * One "context → decision → trade-off" card for a case study's Key
 * Decisions section (roadmap § 6.1 template).
 */
export type DecisionRecord = {
  context: LocalizedText
  decision: LocalizedText
  tradeoff: LocalizedText
}

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
  /** What was done personally on this project. Omitted when not yet written up. */
  role?: LocalizedText
  featured: boolean
  published: boolean

  /**
   * Case study body (roadmap § 6.1 template). Every field below is
   * optional and independently gated: a section renders only when its
   * field is present, so the `/work/[slug]` template can be built once
   * (this phase) and filled in per project later (§ 6.2 / § 6.3), once
   * publication rights are resolved (D-06). Never invent a value here —
   * an absent field means "not yet verified against the code", not "empty
   * on purpose".
   */
  context?: LocalizedText
  problemAndGoals?: LocalizedText
  /** Real constraints only — time, budget, infrastructure, language, connectivity… */
  constraints?: LocalizedText[]
  architecture?: LocalizedText
  keyDecisions?: DecisionRecord[]
  engineeringHighlight?: LocalizedText
  dataIntegrityAndSecurity?: LocalizedText
  responsiveAndRtl?: LocalizedText
  quality?: LocalizedText
  currentStatusAndNext?: LocalizedText
  lessonsLearned?: LocalizedText
  /** A related service page to link to from the case study's Links section. */
  relatedServiceSlug?: string
}

/**
 * Engagement shape a service is sold under (roadmap § 7.1). Determines the
 * badge shown on the catalogue and detail page — never invented per service,
 * only what the Phase 7 table actually assigns.
 */
export type ServiceType = 'productized' | 'custom' | 'productized-custom' | 'monthly'

/** One entry in a service's FAQ accordion (roadmap § 7.1 blueprint). */
export type FaqItem = {
  question: LocalizedText
  answer: LocalizedText
}

/** One step in a service's own process (roadmap § 7.1 blueprint "Process — steps specific to this service"). */
export type ServiceProcessStep = {
  title: LocalizedText
  description: LocalizedText
}

export type Service = {
  id: string
  slug: string
  icon: string
  title: LocalizedText
  /** Short line used on the home preview tile and the catalogue card. */
  description: LocalizedText
  deliverables: LocalizedText[]

  /**
   * Full service-detail blueprint (roadmap § 7.1). Every field below is
   * optional so the `/services` catalogue card (title, description,
   * deliverables above) and the `/services/[slug]` template can share one
   * shape; a blueprint section renders only when its field is present —
   * same "empty means hidden" rule the case-study template uses.
   */
  type?: ServiceType
  /** One-line promise shown under the title on the detail page. */
  tagline?: LocalizedText
  forWhom?: LocalizedText[]
  notForWhom?: LocalizedText[]
  problem?: LocalizedText
  whatIDo?: LocalizedText[]
  included?: LocalizedText[]
  /** Always present once the blueprint is filled in — an explicit boundary, never omitted to look bigger. */
  notIncluded?: LocalizedText[]
  process?: ServiceProcessStep[]
  /** Range and what changes it, e.g. "2–4 weeks, depending on page count and content readiness." */
  timeline?: LocalizedText
  /** "What I need from you" — inputs the client must provide for the timeline to hold. */
  requirements?: LocalizedText[]
  /** Slugs of real, published projects that demonstrate this service — omitted when no project is a genuine fit. */
  relatedProjectSlugs?: string[]
  faq?: FaqItem[]

  /**
   * Package tiers (roadmap § 7.2, gated by D-04). Present only on
   * productized / productized-custom services where tiering the scope
   * genuinely makes sense — pure `custom` services (Web Application / MVP,
   * Backend/API/Database) have none: their engagement is the Discovery
   * Sprint `EngagementModel` instead, not a tier table.
   */
  packages?: ServicePackage[]
  /** Configurable add-ons offered alongside this service's packages. */
  addOns?: ServiceAddon[]
  /** "What drives cost" factors shown next to the package table. */
  whatDrivesCost?: LocalizedText[]
  /** Payment-schedule summary shown near the package table. */
  paymentScheduleNote?: LocalizedText
}

/**
 * A price signal (roadmap § 7.2). `type` is the only field guaranteed to be
 * meaningful:
 * - `'quote'` — no `amount`/`currency` at all. This is the only type in use
 *   anywhere in this codebase right now: D-04 (pricing transparency) is
 *   still an open owner decision, so no starting-from or fixed figure has
 *   been approved to publish. Rendering `'quote'` as "Ask for a quote" /
 *   "Scoped after a short call" is not a placeholder — it is the accurate,
 *   current pricing signal until D-04 resolves.
 * - `'from'` / `'fixed'` — reserved for once D-04 is resolved with real,
 *   owner-approved figures; `amount`/`currency` are required for these.
 */
export type PriceType = 'fixed' | 'from' | 'quote'

export type Price = {
  type: PriceType
  amount?: number
  currency?: string
}

/**
 * One tier of a service's package table (roadmap § 7.2). Convention:
 * `id: 'custom'` always means "scoped after discovery" — `price.type` is
 * always `'quote'` for that tier and `deliveryDays`/`revisions`/
 * `supportDays` are omitted rather than guessed.
 */
export type ServicePackage = {
  id: 'starter' | 'standard' | 'custom'
  name: LocalizedText
  summary: LocalizedText
  forWhom: LocalizedText
  included: LocalizedText[]
  notIncluded: LocalizedText[]
  deliverables: LocalizedText[]
  deliveryDays?: { min: number; max: number }
  revisions?: number
  supportDays?: number
  requirements?: LocalizedText[]
  price: Price
}

/** A configurable add-on record (roadmap § 7.2) — never hard-coded in a component. */
export type ServiceAddon = {
  id: string
  title: LocalizedText
  description: LocalizedText
  price: Price
  deliveryImpactDays?: number
}

/** One row of the site-wide engagement-models table (roadmap § 7.2). */
export type EngagementModel = {
  id: string
  name: LocalizedText
  whenItFits: LocalizedText
  billing: LocalizedText
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

/**
 * A language the developer works in (roadmap § 8.1 About page). Not a
 * self-rated fluency scale (would be an invented, unverifiable metric per
 * § 16.5) — `note` instead states the concrete, checkable evidence: the
 * language is one of the two the site itself is written and maintained in.
 */
export type WorkingLanguage = {
  name: LocalizedText
  note: LocalizedText
}

/**
 * One phase of the canonical, site-wide build process (roadmap § 8.1 —
 * "01 Discover · 02 Define · 03 Design · 04 Architect · 05 Build · 06 Test
 * · 07 Launch · 08 Support", each with purpose, activities, output, client
 * involvement, decisions and risks). Distinct from the shorter `ProcessStep`
 * preview shown on Home (§ 3.3) — that strip intentionally compresses the
 * same overall path into fewer stages for a scannable preview; this is the
 * full, detailed version rendered on `/process` (§ 8.1's own content, not a
 * per-service `ServiceProcessStep`, which describes one service's specific
 * steps instead of the whole engagement).
 */
export type ProcessPhase = {
  id: string
  icon: string
  title: LocalizedText
  purpose: LocalizedText
  activities: LocalizedText[]
  output: LocalizedText
  clientInvolvement: LocalizedText
  decisionsAndRisks: LocalizedText
}

/**
 * One commitment on the Quality baseline (roadmap § 8.1 — "a short, honest
 * page of what every project receives — only commitments the owner
 * actually keeps"). Every entry here must trace to this roadmap's own
 * standards (§ 2, § 3, § 17) or to practice already demonstrated in a
 * published case study — never a new, unverified promise.
 */
export type QualityCommitment = {
  icon: string
  title: LocalizedText
  description: LocalizedText
}

/**
 * One topic of the Working Agreement (roadmap § 8.2 — "How we'll work"):
 * communication, response commitment, payment, ownership, handover,
 * warranty & change requests, confidentiality. `points` is optional —
 * some topics (confidentiality) are a single sentence, others need a
 * short bulleted breakdown. Per D-13, no sitewide deposit percentage or
 * warranty day-count is invented here; those are decided per engagement
 * during Define and stated in the mechanism, not as one fixed figure.
 */
export type WorkingAgreementItem = {
  id: string
  icon: string
  title: LocalizedText
  summary: LocalizedText
  points?: LocalizedText[]
}

/**
 * One option in the Hire Channel Selector (roadmap § 8.3, component
 * inventory § 14 — "Direct vs via platform, with trade-offs" — gated by
 * D-05). `href` must always resolve to a real, verified channel (a mailto
 * link, `wa.me` link, or an existing platform profile from
 * `lib/site.ts#socialLinks`) — never an invented or placeholder link, per
 * the same honesty rule `ExternalProfileLinks` already enforces.
 */
export type HireChannelKind = 'direct' | 'platform'

export type HireChannel = {
  id: string
  kind: HireChannelKind
  icon: string
  title: LocalizedText
  summary: LocalizedText
  points: LocalizedText[]
  href: string
  ctaLabel: LocalizedText
}
