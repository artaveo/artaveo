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
 * The status vocabulary of revisions 1–44 (roadmap § 6.1). Retired from the
 * public model in Phase 27.1 — a project is draft or published — and kept only
 * for the archived data and the design-system badge.
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

/**
 * Real device/context a screenshot was captured in (`project_media.kind`,
 * migration 0003). 'diagram' is reserved for a future architecture
 * diagram — no project has one yet.
 */
export type ProjectMediaKind = 'desktop' | 'mobile' | 'diagram'

/**
 * One verified screenshot attached to a project (`project_media` joined
 * to `media_assets` — migrations 0003/0007/0013/0014). `placement`
 * decides where it renders on the case study: 'hero' is the single
 * lead image at the top of the page; 'story' images render inline next
 * to the case-study section named by `storyKey`'s anchor (see
 * `CASE_STUDY_STORY_ANCHORS` in `case-study.tsx`) — 0014 turned the
 * former single `'main'` sequence (a "screenshot wall" of every hero
 * image stacked before any prose) into this narrative-driven model;
 * 'gallery' images render in the supporting grid below the write-up,
 * unchanged since 0013. `storyKey` groups the 'story' rows that form
 * one visual "evidence moment" (e.g. three screenshots that are one
 * booking flow) so they render together, not as separate stacked
 * blocks. `kind` is independent of `placement` — a shot can be any
 * combination of the two. `width`/`height` (from `media_assets`, 0007)
 * let the case study preserve each screenshot's real aspect ratio
 * instead of forcing a fixed crop. Never invented: every entry is a
 * real screenshot of the running app, captured and reviewed against
 * its source repo before being attached here.
 */
export type ProjectMediaItem = {
  src: string
  alt: LocalizedText
  /** Short line shown under the image (gallery grid, or a story evidence group). Omitted for the hero image, which already has page-level context. */
  caption?: LocalizedText
  kind: ProjectMediaKind
  placement: 'hero' | 'story' | 'gallery'
  /** Only set when `placement === 'story'` — groups rows into one evidence moment. */
  storyKey?: string
  /** Only set when `placement === 'story'` — the `Project` case-study field this evidence group renders directly after. */
  storyAnchor?: string
  /** Real pixel dimensions from `media_assets`, used to render each screenshot at its true aspect ratio. */
  width?: number
  height?: number
}

/**
 * Groups a technology can be filed under (`technologies.category`, free text in
 * the table since 0003; the admin offers this list since Phase 27).
 */
export const TECHNOLOGY_CATEGORIES = ['frontend', 'backend', 'database', 'mobile', 'desktop', 'infrastructure', 'other'] as const

/** Kinds of software a project runs as (`projects.platforms`, migration 0026). */
export type ProjectPlatform = 'web' | 'android' | 'ios' | 'windows' | 'mac' | 'offline'

export const PROJECT_PLATFORMS: ProjectPlatform[] = ['web', 'android', 'ios', 'windows', 'mac', 'offline']

/**
 * A price per D-21: Afghani for the Dari site, dollars for the English site,
 * each falling back to the other. Neither amount means "price after a short
 * conversation" (D-04 — a price is never invented). `from` marks a starting
 * price.
 */
export type Money = {
  afn?: number
  usd?: number
  from?: boolean
}

/** How often a price is paid. `once` = a single payment. */
export type BillingPeriod = 'once' | 'month' | 'year'

/** Phase 27.2 — the block types a project page is built from (`project_blocks.type`). */
export type ProjectBlockType =
  | 'intro'
  | 'challenge'
  | 'features'
  | 'gallery'
  | 'features-by-role'
  | 'audience'
  | 'result'
  | 'faq'
  | 'video'

export const PROJECT_BLOCK_TYPES: ProjectBlockType[] = [
  'intro',
  'challenge',
  'features',
  'gallery',
  'features-by-role',
  'audience',
  'result',
  'faq',
  'video',
]

/** One screenshot inside a gallery block, resolved from the media library. */
export type BlockImage = {
  mediaId: string
  src: string
  alt: LocalizedText
  caption?: LocalizedText
  width?: number
  height?: number
}

/**
 * The content of one block. The shape follows the type; the admin write
 * boundary validates it (`lib/products/blocks.ts`).
 * - `intro` / `challenge` / `result`: one text.
 * - `features`: an optional lead text; the list itself is the project's `features`.
 * - `gallery`: screenshots from the media library, each with an optional caption.
 * - `features-by-role`: per role (passenger, operator…), a list.
 * - `audience` ("who it's for"): an optional text and a list.
 * - `faq`: questions and answers.
 * - `video`: a YouTube or Vimeo video (its id only — never an arbitrary URL).
 */
export type ProjectBlockBody =
  | { type: 'intro' | 'challenge' | 'result'; text: LocalizedText }
  | { type: 'features'; text?: LocalizedText }
  | { type: 'gallery'; images: BlockImage[] }
  | { type: 'features-by-role'; groups: { role: LocalizedText; items: LocalizedText[] }[] }
  | { type: 'audience'; text?: LocalizedText; items: LocalizedText[] }
  | { type: 'faq'; items: FaqItem[] }
  | { type: 'video'; provider: 'youtube' | 'vimeo'; videoId: string; caption?: LocalizedText }

export type ProjectBlock = ProjectBlockBody & {
  id: string
  /** Optional heading; a block without one uses its type's default heading. */
  title?: LocalizedText
}

/** Phase 27.3 — the ways to get a product (`product_sale_options.kind`). */
export type SaleOptionKind =
  | 'licence-monthly'
  | 'licence-yearly'
  | 'licence-lifetime'
  | 'source-code'
  | 'custom-edition'
  | 'other'

export const SALE_OPTION_KINDS: SaleOptionKind[] = [
  'licence-monthly',
  'licence-yearly',
  'licence-lifetime',
  'source-code',
  'custom-edition',
  'other',
]

export type MaintenanceMode = 'included' | 'optional' | 'not-offered'

export type SaleOptionCta = 'purchase-request' | 'demo-request' | 'contact'

/** One published way to get a product, as its product page shows it. */
export type ProductSaleOption = {
  id: string
  kind: SaleOptionKind
  title: LocalizedText
  summary?: LocalizedText
  price: Money
  billingPeriod: BillingPeriod
  maintenance: MaintenanceMode
  /** Only for `maintenance: 'optional'`; no amount = price after a short conversation. */
  maintenancePrice?: Money
  maintenancePeriod?: 'month' | 'year'
  included: LocalizedText[]
  highlighted: boolean
  cta: SaleOptionCta
}

/** One published after-sales service of a product (training, data transfer, hosting, support…). */
export type ProductService = {
  id: string
  title: LocalizedText
  description?: LocalizedText
  price: Money
  period: BillingPeriod
}

export type Project = {
  id: string
  slug: string
  title: LocalizedText
  category: LocalizedText
  summary: LocalizedText
  /** Short facts shown on cards (Phase 30 replaces them with `features`). */
  highlights: LocalizedText[]
  /** Proper nouns — not translated. */
  technologies: string[]
  /** Path or URL of the cover: the library image when one is chosen, else the legacy path. When missing, a neutral placeholder is shown. */
  coverImage?: string
  /** Real, verified screenshots (roadmap § 23.1, out-of-sequence work). Absent means none have been captured yet — never filled with a placeholder. */
  media?: ProjectMediaItem[]
  /** Kept in the data, never rendered publicly (Phase 26.5, D-19). */
  githubUrl?: string
  liveUrl?: string
  year?: string
  featured: boolean
  published: boolean
  /** A related service page to link to from the case study's Links section. */
  relatedServiceSlug?: string

  // Phase 27.1 — independent switches and the project's own look.
  /** Shown on /work and in the Home portfolio. */
  showInPortfolio: boolean
  /** Sold as a product: it gets a product page with its ways to get it (Phase 30). */
  isProduct: boolean
  /** `#RRGGBB` */
  brandColor?: string
  /** `#RRGGBB` */
  accentColor?: string
  industry?: LocalizedText
  platforms: ProjectPlatform[]
  /** One customer-facing line about what the project changed. */
  outcomeLine?: LocalizedText
  /** Customer-facing features — what someone can do with it. */
  features: LocalizedText[]

  // Phase 27.2 / 27.3
  /** Published blocks, in order. */
  blocks: ProjectBlock[]
  /** Published ways to get it — only when `isProduct`. */
  saleOptions: ProductSaleOption[]
  /** Published after-sales services — only when `isProduct`. */
  productServices: ProductService[]
}

/**
 * The project shape of the file-based seed (`lib/home-content.ts`): the public
 * `Project` plus the fields revision 45 retired from the public model. They are
 * still imported into the database (history — `project_sections` is archived
 * since migration 0026) and never rendered.
 */
export type ProjectSeed = Omit<
  Project,
  'blocks' | 'saleOptions' | 'productServices' | 'showInPortfolio' | 'isProduct' | 'platforms' | 'features'
> & {
  showInPortfolio?: boolean
  isProduct?: boolean
  platforms?: ProjectPlatform[]
  features?: LocalizedText[]
  /** Seed blocks, in the shape `project_blocks` stores them. */
  blocks?: { type: ProjectBlockType; title?: LocalizedText; body: Record<string, unknown> }[]
  status?: ProjectStatus
  role?: LocalizedText
  context?: LocalizedText
  problemAndGoals?: LocalizedText
  constraints?: LocalizedText[]
  architecture?: LocalizedText
  keyDecisions?: DecisionRecord[]
  engineeringHighlight?: LocalizedText
  dataIntegrityAndSecurity?: LocalizedText
  responsiveAndRtl?: LocalizedText
  quality?: LocalizedText
  currentStatusAndNext?: LocalizedText
  lessonsLearned?: LocalizedText
}

/**
 * Engagement shape a service is sold under (roadmap § 7.1). Determines the
 * badge shown on the catalogue and detail page — never invented per service,
 * only what the Phase 7 table actually assigns.
 */
export type ServiceType = 'productized' | 'custom' | 'productized-custom' | 'monthly'

/** Phase 27.4 — services by kind of software, not by technology (§ 2.5). `services.kind`, migration 0026. */
export type ServiceKind = 'website' | 'web-system' | 'mobile-app' | 'desktop-software' | 'offline-system' | 'support' | 'other'

export const SERVICE_KINDS: ServiceKind[] = ['website', 'web-system', 'mobile-app', 'desktop-software', 'offline-system', 'support', 'other']

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
  /** Phase 27.4 — the kind of software this service builds; services are organised by it. */
  kind?: ServiceKind
  /** Phase 27.4 — optional "from" price set by the owner (D-21). Absent: no price is shown. */
  fromPrice?: Money
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

/**
 * Phase 17 — a published article as the public journal reads it
 * (`lib/insights.ts`). Everything the public site can see has, by
 * construction, a real `publishedAt` — the two `null`-able fields the
 * pre-Phase-17 `ArticlePreview` carried existed only to describe unwritten
 * drafts, which the public site never shows (§ 3.5, § 16.5).
 */
export type ArticleSummary = {
  id: string
  slug: string
  title: LocalizedText
  excerpt: LocalizedText
  category: LocalizedText | null
  /** ISO timestamp the article went live. */
  publishedAt: string
  /** ISO timestamp of the last edit (`articles.updated_at`, kept honest by the 0016 trigger). */
  updatedAt: string
  /** Whole minutes per locale, computed from each body — see `lib/articles/reading-time.ts`. */
  readingMinutes: { en: number; fa: number }
}

export type Article = ArticleSummary & {
  /** Markdown subset per locale — see `lib/articles/markdown.ts`. */
  body: LocalizedText
}

/** A media-library image an article body embeds with `![caption](media:<id>)`. */
export type ArticleImage = {
  id: string
  url: string
  /** Required at upload (§ 15) — always present. */
  alt: LocalizedText
  width: number | null
  height: number | null
}

export type ArticleDetail = Article & {
  /** Keyed by lower-case media id. A body reference with no entry here (asset deleted since) is skipped, never rendered broken. */
  images: Record<string, ArticleImage>
  relatedProjects: { slug: string; title: LocalizedText; summary: LocalizedText }[]
  relatedServices: { slug: string; title: LocalizedText; description: LocalizedText }[]
  relatedArticles: ArticleSummary[]
}

/**
 * Verification labels shown publicly (roadmap § 16): the only three
 * values that ever appear on the public site, each meaning exactly one
 * thing —
 * - `verified-request` — submitted through the owner's single-use
 *   request link (`recommendation_requests`); the request itself is the
 *   verification.
 * - `platform-review` — a real review the owner copied from an existing
 *   platform profile (Fiverr, Contra…), with `sourceUrl` pointing at it.
 * - `public-profile` — a recommendation the owner found on the person's
 *   own public profile (e.g. a LinkedIn recommendation), `sourceUrl`
 *   pointing at it.
 * Never invented per row — always one of these three, and always
 * traceable to the real evidence it names.
 */
export type RecommendationVerification = 'verified-request' | 'platform-review' | 'public-profile'

/**
 * § 16's own distinction: "recommendation = about working with the
 * developer; testimonial = tied to a delivered project/service." Fully
 * derived from whether `relatedProjectSlug`/`relatedServiceSlug` is
 * present — never a separately stored value that could drift from it.
 */
export type RecommendationKind = 'recommendation' | 'testimonial'

/**
 * A published, approved recommendation or testimonial (`recommendations`,
 * 0005/0015). Only ever the public, `status = 'approved'` shape — the
 * admin moderation queue reads the richer `AdminRecommendation`
 * (`types/cms.ts`) instead, which also carries the still-pending and
 * rejected rows. No rating/score field — § 14's own component inventory
 * is explicit: "no ratings."
 */
export type Recommendation = {
  id: string
  personName: string
  personTitle?: string
  company?: string
  relationship: string
  statement: LocalizedText
  recommendationDate?: string
  sourceUrl?: string
  verification: RecommendationVerification
  relatedProjectSlug?: string
  relatedServiceSlug?: string
  kind: RecommendationKind
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

/** A language listed in the admin's settings (`site_settings.languages`). Not shown on the public site since Phase 31.3. */
export type WorkingLanguage = {
  name: LocalizedText
  note: LocalizedText
}

/**
 * One section of a legal document (Privacy Policy / Terms — roadmap
 * § 11.2, per D-07). `paragraphs` are rendered as separate `<p>`s inside
 * `<Prose>`; `list`, when present, as a bulleted list under them —
 * mirrors the optional-field, "render only what's present" pattern the
 * rest of the content layer already uses (`Project`, `Service`).
 */
export type LegalSection = {
  id: string
  title: LocalizedText
  paragraphs: LocalizedText[]
  list?: LocalizedText[]
}

/** A full legal document (`getPrivacyPolicy()` / `getTermsOfService()`, `lib/legal-content.ts`). */
export type LegalDocument = {
  /** ISO date this document was last substantively edited — shown to the reader, not auto-generated. */
  lastUpdated: string
  sections: LegalSection[]
}
