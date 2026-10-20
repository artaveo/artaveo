import type {
  AvailabilityState,
  BillingPeriod,
  FaqItem,
  LocalizedText,
  MaintenanceMode,
  Money,
  Price,
  ProductSaleOption,
  ProductService,
  Project,
  ProjectBlockType,
  ProjectPlatform,
  RecommendationVerification,
  SaleOptionCta,
  SaleOptionKind,
  ServiceKind,
  Service,
  ServiceAddon,
  ServicePackage,
  ServiceProcessStep,
  WorkingLanguage,
} from '@/types/content'

/**
 * Admin CMS types (roadmap § 15.1 — Services cluster: services, packages,
 * add-ons, FAQs, engagement models).
 *
 * The public `types/content.ts` shapes (`Service`, `ServicePackage`, …)
 * are deliberately thin for rendering: `ServicePackage.id` is the tier
 * ('starter' | 'standard' | 'custom'), and `ServiceProcessStep`/`FaqItem`
 * have no id at all, because a public page never edits or deletes one row
 * independently of the others. The admin editor does, so every admin type
 * below adds the real database row id (and, where the table has one,
 * `sortOrder`) without changing the field names a public component
 * already reads — `AdminService` still satisfies `Service` structurally
 * (see `components/services/service-page.tsx`'s reuse in the preview
 * route) for everything except the three nested collections, which carry
 * admin ids alongside the same content fields.
 */

/** A service row exactly as `services` stores it, plus the DB id every public `Service` already carries. */
export type AdminService = Omit<Service, 'process' | 'packages' | 'addOns' | 'faq'> & {
  /** Public `Service` has no `published` field (public queries already filter `published = true`, so no component needs to check it) — the admin editor does. */
  published: boolean
  /** Phase 27.4 — whether the public page shows the packages (the editor always sees them). */
  showPackages: boolean
  process: AdminProcessStep[]
  packages: AdminServicePackage[]
  addOns: AdminServiceAddon[]
  faq: AdminFaqItem[]
  updatedAt: string
}

export type AdminProcessStep = ServiceProcessStep & { id: string; sortOrder: number }

/** `ServicePackage.id` stays the tier (public convention); `rowId` is the real `service_packages.id` an edit/delete targets. */
export type AdminServicePackage = ServicePackage & { rowId: string; sortOrder: number }

export type AdminServiceAddon = ServiceAddon & { sortOrder: number }

export type AdminFaqItem = FaqItem & { id: string; sortOrder: number }

/** A row-level `engagement_models` record — the public `EngagementModel.id` is the slug; admin edits need the real uuid too. */
export type AdminEngagementModel = {
  id: string
  slug: string
  title: LocalizedText
  whenItFits: LocalizedText
  billing: LocalizedText
  published: boolean
  sortOrder: number
  updatedAt: string
}

/** A minimal row for the services list view — full nested collections aren't needed there. */
export type AdminServiceListItem = {
  id: string
  slug: string
  title: LocalizedText
  type: Service['type']
  kind: Service['kind']
  published: boolean
  sortOrder: number
  updatedAt: string
  completeness: LocaleCompleteness
}

/**
 * Whether a locale's *required* fields on an entity are all non-empty
 * (roadmap § 15: "per-locale completeness indicator; publishing a locale
 * requires its required fields"). See `lib/admin/content.ts` for exactly
 * which fields count as required per entity, and
 * `docs/phases/PHASE-15-README.md` for why this gates the one
 * sitewide `published` flag rather than a genuine independent per-locale
 * publish state (not modeled anywhere in the § 12 schema yet).
 */
export type LocaleCompleteness = { en: boolean; fa: boolean }

export function localeComplete(completeness: LocaleCompleteness): boolean {
  return completeness.en && completeness.fa
}

/** Shared input shape for creating/updating a service's core fields (the nested collections are edited independently). */
export type ServiceCoreInput = {
  slug: string
  icon: string
  title: LocalizedText
  description: LocalizedText
  deliverables: LocalizedText[]
  type: Service['type']
  /** Phase 27.4 */
  kind: ServiceKind | null
  /** Phase 27.4 — optional "from" price; no amount = none shown. */
  fromPrice: Money
  /** Phase 27.4 — packages are optional per service. */
  showPackages: boolean
  tagline: LocalizedText | null
  forWhom: LocalizedText[]
  notForWhom: LocalizedText[]
  problem: LocalizedText | null
  whatIDo: LocalizedText[]
  included: LocalizedText[]
  notIncluded: LocalizedText[]
  timeline: LocalizedText | null
  requirements: LocalizedText[]
  relatedProjectSlugs: string[]
  whatDrivesCost: LocalizedText[]
  paymentScheduleNote: LocalizedText | null
}

export type PackageInput = {
  tier: 'starter' | 'standard' | 'custom'
  name: LocalizedText
  summary: LocalizedText
  forWhom: LocalizedText
  included: LocalizedText[]
  notIncluded: LocalizedText[]
  deliverables: LocalizedText[]
  deliveryDays: { min: number; max: number } | null
  revisions: number | null
  supportDays: number | null
  requirements: LocalizedText[]
  price: Price
}

export type AddonInput = {
  title: LocalizedText
  description: LocalizedText
  price: Price
  deliveryImpactDays: number | null
}

export type FaqInput = {
  question: LocalizedText
  answer: LocalizedText
}

export type ProcessStepInput = {
  title: LocalizedText
  description: LocalizedText
}

export type EngagementModelInput = {
  slug: string
  title: LocalizedText
  whenItFits: LocalizedText
  billing: LocalizedText
}

/**
 * Admin project type (roadmap § 15.2, reworked in Phase 27). The public
 * `Project` minus the published-only collections, plus what the editor needs:
 * the library cover id and every block, sale option and after-sales service —
 * published or not — with its own id and order.
 *
 * `status` and `role` left the model in Phase 27.1 (a project is draft or
 * published); the case-study sections are archived (`project_sections`,
 * migration 0026) and no longer edited.
 */
export type AdminProject = Omit<Project, 'blocks' | 'saleOptions' | 'productServices'> & {
  updatedAt: string
  coverMediaId: string | null
  /** The legacy cover path, kept as the fallback when no library image is chosen. */
  legacyCoverImage: string | null
}

export type ProjectCoreInput = {
  slug: string
  title: LocalizedText
  category: LocalizedText
  summary: LocalizedText
  highlights: LocalizedText[]
  coverMediaId: string | null
  liveUrl: string | null
  year: string | null
  relatedServiceSlug: string | null
  featured: boolean
  technologyIds: string[]
  // Phase 27.1
  showInPortfolio: boolean
  isProduct: boolean
  brandColor: string | null
  accentColor: string | null
  industry: LocalizedText | null
  platforms: ProjectPlatform[]
  outcomeLine: LocalizedText | null
  features: LocalizedText[]
}

/** Phase 27.2 — one block as the editor sees it: the stored body, unresolved. */
export type AdminProjectBlock = {
  id: string
  type: ProjectBlockType
  title: LocalizedText | null
  body: Record<string, unknown>
  published: boolean
  sortOrder: number
  completeness: LocaleCompleteness
}

/** What the editor sends for a block. A video is sent as `{ url, caption }`. */
export type BlockInput = {
  type: ProjectBlockType
  title: LocalizedText | null
  body: Record<string, unknown>
}

/** Phase 27.3 — a sale option as the editor sees it. */
export type AdminSaleOption = ProductSaleOption & { published: boolean; sortOrder: number; completeness: LocaleCompleteness }

export type SaleOptionInput = {
  kind: SaleOptionKind
  title: LocalizedText
  summary: LocalizedText | null
  price: Money
  billingPeriod: BillingPeriod
  maintenance: MaintenanceMode
  maintenancePrice: Money | null
  maintenancePeriod: 'month' | 'year' | null
  included: LocalizedText[]
  highlighted: boolean
  cta: SaleOptionCta
}

export type AdminProductService = ProductService & { published: boolean; sortOrder: number; completeness: LocaleCompleteness }

export type ProductServiceInput = {
  title: LocalizedText
  description: LocalizedText | null
  price: Money
  period: BillingPeriod
}

export type AdminTechnology = { id: string; slug: string; name: string; category: string }

/**
 * `articles` (0005) plus the Phase 17 relations (0016). `publishedAt` is the
 * go-live date for a `scheduled` article and the real first-published time for
 * a `published` one — same column, the meaning follows `status`.
 */
export type AdminArticle = {
  id: string
  slug: string
  title: LocalizedText
  excerpt: LocalizedText
  body: LocalizedText
  category: LocalizedText | null
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived'
  publishedAt: string | null
  updatedAt: string
  projectIds: string[]
  serviceIds: string[]
  relatedArticleIds: string[]
}

export type ArticleInput = {
  slug: string
  title: LocalizedText
  excerpt: LocalizedText
  body: LocalizedText
  category: LocalizedText | null
  /** `published` is never set through the form — only `publishArticle` publishes; saving a published article leaves it published. */
  status: 'draft' | 'review' | 'scheduled' | 'archived'
  /** `YYYY-MM-DD` (UTC). Required, today or later, when `status` is `scheduled`; ignored otherwise. */
  scheduledFor: string | null
  projectIds: string[]
  serviceIds: string[]
  relatedArticleIds: string[]
}

/** What the article form offers to link to / insert — every project and service (published or not: an editor may prepare links ahead of publishing), the other articles, and the media library. */
export type ArticleFormOptions = {
  projects: { id: string; slug: string; title: LocalizedText; published: boolean }[]
  services: { id: string; slug: string; title: LocalizedText; published: boolean }[]
  articles: { id: string; slug: string; title: LocalizedText }[]
  media: AdminMediaAsset[]
}

/**
 * `media_assets` (0003/0007) — one row per uploaded file. `alt` is
 * nullable in the schema, but § 15's "required alt text" is enforced at
 * the admin write boundary (`app/actions/media.ts#uploadMedia`), not
 * relaxed here just because the column allows null.
 */
export type AdminMediaAsset = {
  id: string
  url: string
  alt: LocalizedText | null
  width: number | null
  height: number | null
  type: string | null
  sizeBytes: number | null
  /** 0–1 range, image-relative — see `components/admin/content/focal-point-picker.tsx` for how these drive `object-position`. */
  focalX: number | null
  focalY: number | null
  createdAt: string
  /** Phase 27 (0027) — the project this image belongs to; `null` = not tied to a project. */
  projectId: string | null
  /** Phase 27 — every place the image appears (computed, not stored); empty = not used yet. */
  usages: MediaUsage[]
}

/**
 * Where an image appears: a project's cover, one of its case-study screenshots
 * (`project_media` — top image, inside the text, or the gallery), or a gallery
 * block of its page.
 */
export type MediaUsage = { kind: 'cover' | 'hero' | 'story' | 'gallery' | 'block'; projectId: string }

/** `projectId`: `undefined` leaves it as it is, `null` unassigns the image. */
export type MediaAltInput = { alt: LocalizedText; focalX: number; focalY: number; projectId?: string | null }

/** A project as the media pickers name it — for grouping and filtering images. */
export type MediaProjectOption = { id: string; title: LocalizedText }

/** `project_media` (0003) — one project's screenshot/diagram gallery, each row pointing at a `media_assets` row. */
export type AdminProjectMediaItem = {
  id: string
  mediaId: string
  kind: 'desktop' | 'mobile' | 'diagram'
  caption: LocalizedText | null
  sortOrder: number
  asset: AdminMediaAsset | null
}

export type ProjectMediaInput = { mediaId: string; kind: 'desktop' | 'mobile' | 'diagram'; caption: LocalizedText | null }

// ---------------------------------------------------------------------------
// recommendations & recommendation requests (roadmap § 16, 0005/0015)
// ---------------------------------------------------------------------------

/** Every value `recommendations.status` can hold — 0015 adds `'changes-requested'` to 0005's original three. */
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'changes-requested'

/**
 * The moderation-queue shape — every row regardless of status, unlike
 * `types/content.ts#Recommendation` (public, `status = 'approved'`
 * only). Carries the real row id, `status`, `consentToPublish` and
 * `moderationNote` the admin UI needs and the public shape has no
 * reason to expose. `relatedProjectTitle`/`relatedServiceTitle` are
 * joined in for the admin list to display without a second round trip
 * — `types/content.ts#Recommendation` only ever needs the slug.
 */
export type AdminRecommendation = {
  id: string
  personName: string
  personTitle: string | null
  company: string | null
  relationship: string
  statement: LocalizedText
  recommendationDate: string | null
  sourceUrl: string | null
  verification: RecommendationVerification | null
  status: RecommendationStatus
  consentToPublish: boolean
  moderationNote: string | null
  relatedProjectId: string | null
  relatedProjectTitle: LocalizedText | null
  relatedServiceId: string | null
  relatedServiceTitle: LocalizedText | null
  requestId: string | null
  sortOrder: number
  createdAt: string
}

/** Shared input for both the admin's own manual entries (platform-review / public-profile) and an admin edit of a request-flow submission (typo/translation fix — see § 16: "meaning is never edited, typos only with consent"). */
export type RecommendationInput = {
  personName: string
  personTitle: string | null
  company: string | null
  relationship: string
  statement: LocalizedText
  recommendationDate: string | null
  sourceUrl: string | null
  verification: RecommendationVerification
  relatedProjectId: string | null
  relatedServiceId: string | null
  consentToPublish: boolean
}

/**
 * One single-use request link (`recommendation_requests`, 0015).
 * `status` here is a derived display value, not a stored column —
 * computed the same way every time from `usedAt`/`revokedAt`/
 * `expiresAt`/`recommendationId`, see `lib/admin/content.ts#requestLinkStatus`.
 */
export type RecommendationRequestStatus = 'awaiting' | 'submitted' | 'revoked' | 'expired'

export type AdminRecommendationRequest = {
  id: string
  token: string
  note: string | null
  suggestedRelatedProjectId: string | null
  suggestedRelatedProjectTitle: LocalizedText | null
  suggestedRelatedServiceId: string | null
  suggestedRelatedServiceTitle: LocalizedText | null
  createdAt: string
  expiresAt: string | null
  usedAt: string | null
  revokedAt: string | null
  recommendationId: string | null
  recommendationStatus: RecommendationStatus | null
  status: RecommendationRequestStatus
  /** D-14 — present only while the request is unfinished. */
  recipientEmail: string | null
  recipientLocale: 'en' | 'fa' | null
  /** The newest e-mail the site queued for this request, so the owner can see whether the link actually went out. */
  lastEmail: { kind: 'recommendation-request' | 'recommendation-changes'; status: import('@/types/notifications').NotificationStatus; provider: string | null } | null
}

export type RecommendationRequestInput = {
  note: string
  suggestedRelatedProjectId: string | null
  suggestedRelatedServiceId: string | null
  /** Days from creation until the link stops accepting a submission — `null` means no expiry. */
  expiresInDays: number | null
  /**
   * D-14 — optional. When given, the site e-mails the recommender their link
   * (and, later, a change request) in `recipientLocale`. Stored only until the
   * request is finished — see `lib/recommendation-privacy.ts`.
   */
  recipientEmail: string | null
  recipientLocale: 'en' | 'fa' | null
}

/**
 * What the public `/recommend/[token]` page collects (§ 16: "the
 * recommender submits statement, role, relationship, optional profile
 * URL and explicit consent to publish"). `statement` is plain text, not
 * `LocalizedText` — the recommender writes in one language only (the
 * page's current locale); the admin fills in the other locale during
 * moderation, same as every other bilingual entity's completeness gate.
 */
export type RecommendationSubmissionInput = {
  personName: string
  personTitle: string
  company: string
  relationship: string
  statement: string
  profileUrl: string
  consentToPublish: boolean
}

/** `site_settings` (0007) — the one singleton row. */
export type AdminSiteSettings = {
  availabilityState: AvailabilityState
  nextOpening: string | null
  responseCommitment: LocalizedText
  timezone: string
  languages: WorkingLanguage[]
  externalProfiles: { href: string; label: string }[]
  /** Phase 27.6 — the shell's contact channels (`site_settings`, migration 0026). */
  contactEmail: string | null
  whatsappNumber: string | null
  phoneNumber: string | null
  updatedAt: string
}

export type SiteSettingsInput = {
  availabilityState: AvailabilityState
  nextOpening: string | null
  responseCommitment: LocalizedText
  timezone: string
  languages: WorkingLanguage[]
  externalProfiles: { href: string; label: string }[]
  contactEmail: string | null
  /** International form, e.g. `+93790685832`. */
  whatsappNumber: string | null
  phoneNumber: string | null
}

/** `navigation_items` (0007) — `key` is a fixed, closed set (the DB `check` constraint); only the structural fields below are editable, never the key set itself or its translated label (still `Nav.<key>` in messages/*.json). */
export type AdminNavigationItem = {
  id: string
  key: string
  href: string
  surfaces: string[]
  hasDescription: boolean
  hasContent: boolean
  sortOrder: number
}

export type NavigationItemInput = {
  href: string
  surfaces: string[]
  hasDescription: boolean
  hasContent: boolean
  sortOrder: number
}

