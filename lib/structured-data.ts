import { absoluteUrl } from '@/lib/seo'
import { siteConfig, socialLinks } from '@/lib/site'
import { t, type FaqItem, type Locale, type Project, type Service } from '@/types/content'
import { getDeveloperProfile } from '@/lib/home-content'

/**
 * Roadmap § 11.1 — structured data: `Person`, `ProfessionalService`,
 * `WebSite`, `BreadcrumbList`, `CreativeWork` (case studies), `Service` +
 * `Offer` (only where a price is published — D-04 is still open, so no
 * `Offer` is ever emitted today; every `ServicePackage.price` in this
 * codebase is `type: 'quote'`), `FAQPage` (for services that have real
 * FAQ content).
 *
 * Every builder here reads from the same content selectors the pages
 * already render from (`lib/home-content.ts`, `lib/services-content.ts`,
 * `lib/site.ts`) — nothing is invented for the schema that isn't already
 * true and visible on the page.
 */

type JsonLdValue = Record<string, unknown>

/** Real, verified external profiles only (`lib/site.ts#socialLinks`, D-05) — `sameAs` never lists an invented or placeholder profile. */
function sameAsLinks(): string[] {
  return socialLinks.map((link) => link.href)
}

/**
 * `Person` — the individual behind Artaveo (D-02: real name, no city
 * published). Emitted once, sitewide, in the root layout.
 */
export function buildPersonJsonLd(locale: Locale): JsonLdValue | null {
  const profile = getDeveloperProfile()
  if (!profile.name) return null

  return {
    '@type': 'Person',
    '@id': absoluteUrl('/#person'),
    name: profile.name,
    url: absoluteUrl(`/${locale}/about`),
    ...(profile.portrait ? { image: absoluteUrl(profile.portrait) } : {}),
    description: t(profile.bio, locale),
    jobTitle: siteConfig.tagline,
    sameAs: sameAsLinks(),
  }
}

/**
 * `ProfessionalService` — Artaveo as a business entity. No `address`
 * (D-02: no city published) and no `priceRange` (D-04 still open) — an
 * honest, partial listing rather than an invented one.
 */
export function buildProfessionalServiceJsonLd(locale: Locale): JsonLdValue {
  return {
    '@type': 'ProfessionalService',
    '@id': absoluteUrl('/#business'),
    name: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrl(`/${locale}`),
    email: siteConfig.email,
    founder: { '@id': absoluteUrl('/#person') },
    areaServed: 'Worldwide',
    sameAs: sameAsLinks(),
  }
}

/** `WebSite` — the site itself, linked to the `Person`/`ProfessionalService` records above via `@id`. */
export function buildWebSiteJsonLd(locale: Locale): JsonLdValue {
  return {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: siteConfig.name,
    url: absoluteUrl(`/${locale}`),
    description: siteConfig.description,
    inLanguage: locale,
    publisher: { '@id': absoluteUrl('/#business') },
  }
}

/** The sitewide `@graph` (`WebSite` + `ProfessionalService` + `Person`) mounted once in the root layout. */
export function buildSiteJsonLd(locale: Locale): JsonLdValue {
  const person = buildPersonJsonLd(locale)
  return {
    '@context': 'https://schema.org',
    '@graph': [buildWebSiteJsonLd(locale), buildProfessionalServiceJsonLd(locale), ...(person ? [person] : [])],
  }
}

export type BreadcrumbEntry = { name: string; path: string }

/** `BreadcrumbList` — `path` values are locale-less (e.g. `/work`); resolved to absolute, locale-prefixed URLs here. */
export function buildBreadcrumbJsonLd(locale: Locale, items: BreadcrumbEntry[]): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(`/${locale}${item.path === '/' ? '' : item.path}`),
    })),
  }
}

/**
 * `CreativeWork` for a case study (§ 6.1). `dateCreated` only when a real
 * `year` exists; `about`/`keywords` from the project's own real technology
 * list — never an invented category.
 */
export function buildCreativeWorkJsonLd(locale: Locale, project: Project): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: t(project.title, locale),
    description: t(project.summary, locale),
    url: absoluteUrl(`/${locale}/work/${project.slug}`),
    ...(project.coverImage ? { image: absoluteUrl(project.coverImage) } : {}),
    ...(project.year ? { dateCreated: project.year } : {}),
    creator: { '@id': absoluteUrl('/#person') },
    keywords: project.technologies.join(', '),
    ...(project.liveUrl ? { sameAs: [project.liveUrl] } : {}),
  }
}

/**
 * `Service`. `Offer` is only added when a real, owner-approved price
 * exists — today every package is `type: 'quote'` (D-04 open), so no
 * package ever produces an `Offer` here. Once D-04 resolves with real
 * `'from'`/`'fixed'` prices, the filter below starts emitting them with
 * no further code change.
 */
export function buildServiceJsonLd(locale: Locale, service: Service): JsonLdValue {
  const offers = (service.packages ?? [])
    .filter((pkg) => pkg.price.type !== 'quote' && pkg.price.amount != null)
    .map((pkg) => ({
      '@type': 'Offer',
      name: t(pkg.name, locale),
      price: pkg.price.amount,
      priceCurrency: pkg.price.currency ?? 'USD',
      url: absoluteUrl(`/${locale}/start?service=${service.slug}&package=${pkg.id}`),
    }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t(service.title, locale),
    description: t(service.description, locale),
    url: absoluteUrl(`/${locale}/services/${service.slug}`),
    provider: { '@id': absoluteUrl('/#business') },
    areaServed: 'Worldwide',
    ...(offers.length > 0 ? { offers } : {}),
  }
}

/** `FAQPage` — only emitted when a service has real FAQ content (`service.faq`). */
export function buildFaqPageJsonLd(locale: Locale, faq: FaqItem[]): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: t(item.question, locale),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(item.answer, locale),
      },
    })),
  }
}
