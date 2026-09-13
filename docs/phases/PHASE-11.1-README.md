# Phase 11.1 — Launch Readiness: SEO & Analytics Events

**Status:** ✅ COMPLETE
**Date:** 13 September 2026

## Objective

Give every public page real, crawlable metadata (unique titles/descriptions,
canonical URLs, hreflang, a sitemap, robots rules, dynamic Open Graph
images, and structured data) and wire the roadmap's analytics event list
to genuine user actions — no invented events, no fabricated structured
data, no form contents or personal data in any tracked payload.

## Scope

Roadmap § 11.1:

> unique titles/descriptions per page and locale · canonical · hreflang ·
> sitemap · robots · dynamic Open Graph images · structured data:
> `Person`, `ProfessionalService`, `WebSite`, `BreadcrumbList`,
> `CreativeWork` for case studies, `Service` + `Offer` only where a price
> is published, `FAQPage` for FAQs
>
> analytics events: `page_view · project_view · service_view ·
> package_compare · cta_click · brief_start · brief_step · brief_submit ·
> consultation_request · external_profile_click · language_switch ·
> search_used` — no form contents, no personal data in events

**Starting point.** Every page already had a minimal `generateMetadata`
(title + description only, from a previous phase). No `metadataBase`,
no canonical/hreflang, no sitemap or robots route, no structured data
anywhere, no analytics beyond `<Analytics />`'s own automatic page-view
tracking (`@vercel/analytics/next`, mounted since before this phase).

## Dependencies

- **D-01 (production domain, still open).** Every absolute URL in this
  phase — canonical, hreflang, sitemap entries, OG image URLs —
  resolves against `SITE_URL` (`lib/seo.ts`), which defaults to the
  interim Vercel URL (`https://artaveo-seven.vercel.app`) exactly like
  § 9.3's notification sender already does. Setting
  `NEXT_PUBLIC_SITE_URL` once the real domain is DNS-authenticated is
  the only change needed — no code touches this again.
- **D-04 (pricing transparency, still open).** `buildServiceJsonLd()`
  only emits an `Offer` for a package whose `price.type` is `'from'` or
  `'fixed'` with a real `amount`. Every package in this codebase today
  is `type: 'quote'`, so no `Offer` is emitted anywhere right now — an
  accurate reflection of D-04's status, not a bug.

## Implementation summary

### SEO primitives (`lib/seo.ts`)

- `SITE_URL` / `absoluteUrl()` — the single source of truth for turning
  a relative path into a crawlable absolute URL.
- `buildAlternates(locale, pathname)` — canonical + `en`/`fa`/`x-default`
  hreflang, built from `routing.locales` so a future third locale needs
  no per-page changes.
- `buildPageOpenGraph({ locale, title, description, eyebrow })` —
  returns a **full** `openGraph`/`twitter` object (not just `images`).
  Next.js does not deep-merge `openGraph` across nested
  `generateMetadata` calls — a child page that only overrode `images`
  would silently lose the parent layout's `type`/`title`/`description`
  defaults for every field it didn't repeat. Returning the whole block
  from one helper avoids that trap at every call site.

### `metadataBase` (`app/[locale]/layout.tsx`)

Previously omitted on purpose ("no domain yet"). Now set to
`new URL(SITE_URL)`, so every relative image/URL anywhere in the
metadata tree — this layout's own static `/brand/og-image.png`
included — resolves to an absolute URL for crawlers instead of being
left relative.

### Canonical + hreflang + OG on every page

`/`, `/work`, `/work/[slug]`, `/services`, `/services/[slug]`, `/about`,
`/process`, `/contact`, `/start` all now call `buildAlternates()` and
`buildPageOpenGraph()` in their `generateMetadata`. `/start`'s canonical
deliberately points at the bare `/start` regardless of its
`?service=`/`?package=` prefill query params — those personalize the
form, they don't create a page worth indexing separately.
`/design-system` already had `robots: { index: false, follow: false }`
from an earlier phase; left untouched and excluded from the sitemap.

### Dynamic Open Graph images (`lib/og.ts`, `app/api/og/route.tsx`)

`next/og`'s `ImageResponse` renders a branded card (ARTAVEO wordmark,
eyebrow, real page title) for **`en` pages only**. Satori (the engine
behind `ImageResponse`) needs a font file that actually contains
Perso-Arabic glyphs to render Persian text, and none is bundled in this
repo — only Geist/Vazirmatn loaded via `next/font/google` for normal
page rendering, which isn't available inside an `ImageResponse`.
Fetching Vazirmatn from Google Fonts at request time is a plausible fix
but isn't verifiable from this sandbox (network egress is restricted to
an allow-list that doesn't include `fonts.gstatic.com`), and shipping an
`fa` image that silently renders titles as tofu boxes would be worse
than the existing static fallback. So `fa` pages keep
`/brand/og-image.png` via `buildPageOpenGraph()`'s own locale branch —
documented as follow-up debt (bundle a Vazirmatn subset, or verify the
runtime fetch against the live deployment), not silently worked around.

### Structured data (`lib/structured-data.ts`, `components/site/json-ld.tsx`)

- `buildSiteJsonLd()` — one `@graph` of `WebSite` + `ProfessionalService`
  + `Person`, mounted once in the root layout body. Reads from
  `getDeveloperProfile()` (`lib/home-content.ts`) and `socialLinks`
  (`lib/site.ts`) — the same real data the About page and footer already
  render, nothing new invented for the schema.
- `buildBreadcrumbJsonLd()` — on every page below Home.
- `buildCreativeWorkJsonLd()` — on `/work/[slug]`, from the same
  `Project` object the page already renders.
- `buildServiceJsonLd()` / `buildFaqPageJsonLd()` — on `/services/[slug]`;
  `FAQPage` only when `service.faq` has real entries.
- `<JsonLd data={…} />` — a tiny shared component that escapes `<` in
  the serialized JSON (defense in depth against script-tag breakout;
  none of this data is user-supplied, but it costs nothing).

### `app/robots.ts` / `app/sitemap.ts`

`robots.ts` allows everything except `/design-system` (already
`noindex`) and `/api/`, and points at `/sitemap.xml`. `sitemap.ts`
enumerates every static route and every published project/service slug,
across both locales, each with `alternates.languages` so search engines
read the `en`/`fa` pair as translations rather than duplicate content —
32 URLs today (7 static routes + 2 projects + 7 services, ×2 locales).

### Analytics (`lib/analytics.ts`, `components/site/view-tracker.tsx`)

`trackEvent()` wraps `@vercel/analytics`'s `track()`. Nine of the twelve
events are wired to real triggers:

| Event | Trigger |
|---|---|
| `language_switch` | `language-switcher.tsx`, on an actual locale change |
| `brief_start` | `brief-builder.tsx`, once per mount |
| `brief_step` | `brief-builder.tsx`, on `goNext`/`goBack` |
| `brief_submit` | `brief-builder.tsx`, only after `submitInquiry` returns `{ ok: true }` — the same gate that sets `success` |
| `package_compare` | `package-comparison.tsx`, mobile tier switcher |
| `cta_click` | `identity.tsx`'s `IdentityCta`, `hero.tsx`'s two CTAs, `components/ui/cta-buttons.tsx` (used by `CTASection`), `hire-channel-selector.tsx`, and the package "choose" buttons |
| `external_profile_click` | `identity.tsx`'s `ExternalProfileLinks` (footer/design-system social links), the platform link in `hire-channel-selector.tsx` |
| `project_view` | `ViewTracker` mounted from `/work/[slug]`'s page component |
| `service_view` | `ViewTracker` mounted from `/services/[slug]`'s page component |

`page_view` is deliberately **not** re-emitted by hand — `<Analytics />`
already records one automatically on every route change; doing it again
would double-count. `consultation_request` and `search_used` are typed
in `lib/analytics.ts`'s `AnalyticsEvent` union so future call sites have
a stable name to import, but neither is wired to a trigger: Phase 20
(Consultation) and Phase 18 (Search) don't exist yet, and firing an
event against a placeholder interaction would be inventing data for a
feature that isn't built.

## A bug the build caught (and how it was fixed)

The first `next build` attempt failed on `/en/about`:

```
Error: Functions cannot be passed directly to Client Components unless
you explicitly expose it by marking it with "use server".
  {id: ..., icon: function icon, title: ..., description: ...}
```

Converting `components/ui/patterns.tsx` to a Client Component (to attach
a `cta_click` handler inside `CTASection`) turned every other export in
that file into a Client Component too — including ones that Server
Components like `about-content.tsx` call with a rendered icon
**function** as a prop (`icon: (props) => <Icon name={item.icon} … />`).
A Server Component cannot pass a function to a Client Component; `next
build` correctly rejected it instead of silently miscompiling.

**Fix:** `patterns.tsx` was reverted to a plain Server Component file.
Only the two buttons that actually need the click handler were pulled
into a new, minimal Client Component, `components/ui/cta-buttons.tsx`
(`CtaButtons`), which receives plain strings (`href`/`label`) — never a
function — from `CTASection`. Same pattern was checked (and found not to
apply) for `identity.tsx` and `hire-channel-selector.tsx`: their props
are plain data (`DeveloperProfile`, `HireChannel[]`, both string/array
fields only), so converting those two files directly to Client
Components was safe.

## Decisions

None needed — D-01 and D-04's existing defaults (interim domain,
`quote`-type pricing) were sufficient to implement this phase without a
new owner decision.

## Changed files

```
lib/seo.ts                              new — SITE_URL, absoluteUrl, buildAlternates, buildPageOpenGraph
lib/og.ts                               new — dynamic OG image URL builder (en only)
lib/analytics.ts                        new — trackEvent() wrapper, AnalyticsEvent union
lib/structured-data.ts                  new — JSON-LD builders
components/site/json-ld.tsx             new — <JsonLd> render helper
components/site/view-tracker.tsx        new — client leaf for project_view/service_view
components/ui/cta-buttons.tsx           new — tracked CTASection buttons (Client Component)
app/api/og/route.tsx                    new — next/og ImageResponse route
app/robots.ts                           new
app/sitemap.ts                          new
app/[locale]/layout.tsx                 metadataBase, alternates, sitewide JSON-LD
app/[locale]/page.tsx                   alternates, buildPageOpenGraph
app/[locale]/work/page.tsx              alternates, buildPageOpenGraph, BreadcrumbList
app/[locale]/work/[slug]/page.tsx       alternates, buildPageOpenGraph, CreativeWork + BreadcrumbList, ViewTracker
app/[locale]/services/page.tsx          alternates, buildPageOpenGraph, BreadcrumbList
app/[locale]/services/[slug]/page.tsx   alternates, buildPageOpenGraph, Service + FAQPage + BreadcrumbList, ViewTracker
app/[locale]/about/page.tsx             alternates, buildPageOpenGraph, BreadcrumbList
app/[locale]/process/page.tsx           alternates, buildPageOpenGraph, BreadcrumbList
app/[locale]/contact/page.tsx           alternates, buildPageOpenGraph, BreadcrumbList
app/[locale]/start/page.tsx             alternates (canonical ignores query params), buildPageOpenGraph, BreadcrumbList
components/site/language-switcher.tsx   language_switch
components/start/brief-builder.tsx      brief_start / brief_step / brief_submit
components/services/package-comparison.tsx  package_compare, cta_click
components/ui/identity.tsx              'use client'; cta_click (IdentityCta), external_profile_click (ExternalProfileLinks)
components/ui/patterns.tsx              CTASection now renders <CtaButtons> instead of raw Button+onClick
components/home/hero.tsx                'use client'; cta_click on both CTAs
components/contact/hire-channel-selector.tsx  'use client'; cta_click, external_profile_click
.env.example                            + NEXT_PUBLIC_SITE_URL
```

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21).

## Manual verification

- `tsc --noEmit`: clean.
- `next build` (Turbopack, fonts stubbed and restored per the
  established sandbox pattern — `diff` confirmed byte-identical
  restoration both times it was run): clean, all 43 routes generated,
  including the new `/robots.txt`, `/sitemap.xml` and `/api/og`.
- `node scripts/check-content-placeholders.mjs`: passes (no new
  translatable content files introduced by this phase).
- i18n key parity (`en.json` vs `fa.json` flattened key sets): still an
  exact match — this phase referenced only pre-existing keys
  (`eyebrow`, `title`, `metaTitle`, etc.), added none.
- **Rendered HTML spot-checked directly**, not just a clean build:
  - `/en/work/pazhuhesh-portal`: canonical, all three hreflang links,
    3 `application/ld+json` blocks (sitewide graph + `CreativeWork` +
    `BreadcrumbList`), and an `og:image` pointing at `/api/og?title=…`
    all present and correct.
  - `/fa/work/pazhuhesh-portal`: `og:image` correctly falls back to
    `/brand/og-image.png` instead of the dynamic route.
  - `/en/services/business-website`: 2 `application/ld+json` blocks
    (`Service` + `FAQPage`, confirming a service with real FAQ content
    emits both) and a dynamic `og:image`.
  - `/sitemap.xml`: 32 `<url>` entries, each with three
    `<xhtml:link rel="alternate">` entries.
  - `/robots.txt`: correct `Disallow` list and `Sitemap:` line.
- Reverted `tsconfig.tsbuildinfo` and `package-lock.json` (this session
  used `npm install` since `pnpm` wasn't available in the sandbox; the
  project's canonical lockfile is `pnpm-lock.yaml`, left untouched) via
  `git checkout --` before packaging.
- **Not verifiable in a code sandbox:** real social-platform previews of
  the dynamic OG images (Twitter/Facebook/LinkedIn card debuggers all
  need a publicly fetchable URL), and actual Search Console/crawler
  behaviour. Both need the live deployment.

## Known issues

- **`fa` OG images stay static.** See the "Dynamic Open Graph images"
  section above. Fix: bundle a Vazirmatn (or other Perso-Arabic-capable)
  font subset as a local file `ImageResponse` can load without a
  network fetch, or verify a runtime Google Fonts fetch against the
  live deployment and add a `try`/`catch` fallback to the static image
  if that fetch fails.
- **`public/brand/og-image.png` itself is still the old placeholder-mark
  trace** (pre-existing debt from § 4.1/10.1, noted again here per the
  roadmap's own § 4.1 "Known Issues" cross-reference) — the static
  fallback this phase relies on for `fa` pages (and as the ultimate
  fallback for any page that doesn't set its own `openGraph`) inherits
  that debt. Not fixed in this phase; tracked where it already was.
- Real social-preview rendering and crawler indexing are unverified —
  see Manual Verification above.

## New debt

- Bundling a Perso-Arabic font subset for dynamic `fa` OG images
  (tracked above).

## Rollback

Revert every file listed under Changed Files, then delete the new files
listed there (`lib/seo.ts`, `lib/og.ts`, `lib/analytics.ts`,
`lib/structured-data.ts`, `components/site/json-ld.tsx`,
`components/site/view-tracker.tsx`, `components/ui/cta-buttons.tsx`,
`app/api/og/`, `app/robots.ts`, `app/sitemap.ts`). No database or env
state to unwind — `NEXT_PUBLIC_SITE_URL` being unset simply falls back
to the interim Vercel URL, which is also its current set value.

## Final status

**COMPLETE.** Every item in § 11.1's own scope is shipped and verified
by inspection of the actual rendered output, not just a passing build.
The two open items (Persian OG images, the placeholder OG mark image)
are pre-existing or narrowly-scoped debt, documented rather than hidden,
and don't block moving on to § 11.2 (blocked on D-07) or § 11.3
(performance & accessibility pass, the next unblocked Phase 11 work).
