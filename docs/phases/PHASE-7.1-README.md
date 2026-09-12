# Phase 7.1 — Curated service catalogue & detail blueprint

**Status:** ✅ complete
**Date:** 12 September 2026

## What this phase delivered

Builds the `/services` catalogue and the `/services/[slug]` detail-blueprint
template described in roadmap § 7.1, and replaces the seven curated
services from the roadmap's Phase 7.1 table (Business Website · Web
Application / MVP · Admin Dashboards & Internal Tools · Backend, API &
Database · Performance, Accessibility & SEO Fix · Bug Fix & Rescue · Care
Plan) as real, bilingual, published content.

Per § 7.1's own merge note, the catalogue and the detail blueprint are one
page-building task and were built together in this sub-phase. § 7.2
(package tiers, add-ons, pricing signals, engagement models — gated by
D-04, still open) is explicitly **not** started; the blueprint's Packages
and Add-ons sections have no field to render from yet and correctly stay
hidden until then, the same way `CaseStudy`'s optional sections stayed
hidden until § 6.2 / § 6.3 filled them in.

### Content-drift found and resolved (not part of the original scope, but a real conflict this phase would otherwise have created)

`lib/home-content.ts` already had its own ad hoc `servicesData` (six items:
web-development, full-stack-development, web-applications,
frontend-development, backend-apis, maintenance) used only by the Home
"Services" preview section. Building the real seven-service catalogue
alongside that would have put two different, drifting service lists on the
same site — a direct conflict with roadmap principle 9 ("typed content
mirrors the future database," i.e. one shape, one source of truth).

Resolved by consolidation, not by leaving both:
- Removed `servicesData` and `getServices()` from `lib/home-content.ts`.
- `components/home/services.tsx` now reads `getAllServices()` from the new
  `lib/services-content.ts` instead.
- The `Services` message namespace (home preview copy — eyebrow/title/
  description/`allServices`/`deliverables`) is untouched and still used
  only by that Home section, exactly like `FeaturedWork` vs `Work`.

This means the Home preview now shows all seven real services instead of
the old six-item list. No copy from the old list was reused — every string
in the new catalogue was written fresh against the actual Phase 7.1 table.

### Content layer

- **`types/content.ts`**: `Service` extended with the full blueprint shape:
  `type` (`ServiceType`: `productized | custom | productized-custom |
  monthly`), `tagline`, `forWhom[]`, `notForWhom[]`, `problem`, `whatIDo[]`,
  `included[]`, `notIncluded[]`, `process[]` (`ServiceProcessStep`:
  `title` + `description`), `timeline`, `requirements[]`,
  `relatedProjectSlugs[]`, `faq[]` (`FaqItem`: `question` + `answer`). All
  new fields are optional, following the same "field present → section
  renders" contract `Project`'s case-study fields already use.
- **`lib/services-content.ts`** (new): the seven services, each with real
  for-whom/not-for-whom, problem statement, included/not-included lists,
  a service-specific process, a timeline description, client requirements,
  and 1–2 FAQ entries. `relatedProjectSlugs` links to `transportation-system`
  and/or `pazhuhesh-portal` only where the project is a genuine, verifiable
  fit for that service (e.g. omitted on Business Website and Performance/
  Accessibility/SEO Fix — neither real project demonstrates those as a
  discrete engagement). `getAllServices()` / `getServiceBySlug(slug)` are
  the only read path, mirroring `lib/home-content.ts`'s selector convention.
- **`scripts/check-content-placeholders.mjs`**: `lib/services-content.ts`
  added to `CONTENT_FILES` so the new catalogue is covered by the same
  build-time placeholder guard as `lib/home-content.ts` and `lib/site.ts`.

### Components

- **`components/services/service-card.tsx`**: catalogue tile — icon, type
  badge, title, description, deliverables list, "View service" link.
  Mirrors `ProjectCard`'s structure so `/work` and `/services` read as the
  same design language.
- **`components/services/service-grid.tsx`**: plain responsive grid, no
  filters. Seven services don't need `/work`'s category/technology filter
  pattern (`WORK_FILTER_THRESHOLD`) — a filter UI for seven items would be
  decoration, not function.
- **`components/services/service-detail.tsx`**: the shared blueprint
  template. Section order follows § 7.1 exactly: title + tagline → for/not
  for → problem → what I do → included/not included → deliverables (aside)
  → process → timeline (aside) → requirements → related work → FAQ → Start
  this service CTA. Every section is conditionally rendered on its optional
  field, so a future service with a thinner write-up degrades gracefully
  instead of showing empty headings.
- **`components/home/services.tsx`**: switched its data source (see
  "Content-drift" above); markup unchanged.

### Routes

- **`app/[locale]/services/page.tsx`**: `/services` index — `PageHeader` +
  `ServiceGrid`, static per locale, mirrors `app/[locale]/work/page.tsx`.
- **`app/[locale]/services/[slug]/page.tsx`**: `/services/[slug]` detail —
  `generateStaticParams` over all seven services × two locales (14 static
  pages), `generateMetadata` from the service's own title/description,
  `notFound()` on an unknown slug. Resolves `relatedProjectSlugs` to real
  `Project` records via `getProjectBySlug` from `lib/home-content.ts` and
  passes them to `ServiceDetail`. Mirrors
  `app/[locale]/work/[slug]/page.tsx`.

### i18n

Added three message namespaces to both `messages/en.json` and
`messages/fa.json`, inserted immediately after the existing `Services`
namespace: `ServicesIndex` (the real `/services` page header copy — eyebrow/
title/description are distinct from the Home preview's, same pattern as
`FeaturedWork` vs `Work`), `ServiceType` (badge labels for the four
engagement shapes), `ServiceDetail` (all blueprint section labels + "Start
this service").

### "Start this service" CTA

Per the blueprint ("Start this service → Brief Builder pre-filled with the
service"), the button links to `/contact?service={slug}`. `/contact` (the
Brief Builder) doesn't exist yet — it's Phase 9 — so this follows the exact
same not-yet-built-but-consistent pattern every other CTA on the site
already uses (`hero.tsx`, `final-cta.tsx`, `site-header.tsx`, `mobile-nav.tsx`
all already link to `/contact`). The `service` query param is there so
Phase 9's Brief Builder can read it and pre-fill the service selection
without this page needing to change.

## Verified

- `tsc --noEmit`: 0 errors.
- `next build` (Turbopack): compiled successfully. All 14
  `/services/[slug]` pages statically generated (7 services × `en`/`fa`),
  alongside the existing `/services` index, `/work`, `/work/[slug]` and
  Home routes. `next/font/google` was stubbed for the build per the
  established sandbox pattern (Google Fonts unreachable here) and
  `app/[locale]/layout.tsx` was restored immediately after and diffed
  identical to the pre-build version.
- `node scripts/check-content-placeholders.mjs`: passed, now covering
  `lib/services-content.ts`.
- English and Persian content written for every field, including all 7
  services' full blueprint bodies (not just titles) — verified by
  inspection, not machine-translated.
- RTL: all new markup uses the same logical-property primitives
  (`Prose`, `Badge`, `Breadcrumb`, `Button`, `Accordion`) already verified
  RTL-correct in § 6.1/§ 4 — no new bespoke `pl-`/`pr-`/`text-left` usage
  introduced (confirmed by inspection of `service-card.tsx` and
  `service-detail.tsx`).
- Light/dark: no new color values introduced — all new markup uses
  existing tokens (`bg-card`, `text-muted-foreground`, `text-success-text`,
  `border-border`, etc.), the same tokens already verified across both
  themes in Phase 4.
- Content truth check: no invented clients, metrics, ratings or years.
  Every "what I do" / "included" claim describes a real capability
  demonstrated by the two published case studies or a straightforward,
  verifiable engineering practice (server-side validation, RLS, etc.) — not
  a fabricated outcome. `relatedProjectSlugs` only links where the project
  genuinely evidences the service.
- Not yet done (tracked as debt below, not silently skipped): manual
  keyboard/focus-order pass on the new Accordion/FAQ and card grids in a
  real browser (only static-markup + build-level verification was possible
  in this session).

## Known issues / new debt

- **Manual accessibility pass pending**: keyboard navigation and
  focus-visible behavior on the new `/services` and `/services/[slug]`
  pages should get a real-browser pass (keyboard-only tab order through
  the FAQ accordion and card grid, screen-reader landmark check) before
  public launch — the components reuse already-audited primitives
  (`Accordion`, `Badge`, `Button`, `Breadcrumb`) but the new page-level
  composition hasn't been manually walked.
- **`docs/content/claims-ledger.md`**: not updated in this session. The
  claims in the new catalogue are capability descriptions and process
  commitments rather than the kind of verifiable-against-a-specific-fact
  claims the ledger is built for (client names, metrics, dates) — but this
  should be confirmed against § 16.4's actual intent in a future pass
  rather than assumed here.
- Home page now shows all 7 services instead of the previous 6 — this is a
  visual change to an already-shipped page, done deliberately to fix the
  content-drift described above, not an unrelated redesign.

## Rollback

Revert this delivery's file set; `lib/home-content.ts`'s `servicesData` /
`getServices()` would need restoring alongside `components/home/services.tsx`
if a partial rollback of only the new `/services` routes is wanted while
keeping the Home section on the old list — not recommended, since it
reintroduces the drift this phase fixed.

## Final status

PHASE: 7.1
STATUS: COMPLETE

NEXT PHASE: 7.2 — Package model, add-ons, pricing signals & engagement
models. Blocked on nothing new; D-04 (pricing transparency) still needs an
owner decision before package pricing fields can be filled in honestly —
if D-04 isn't resolved when 7.2 starts, that sub-phase marks itself BLOCKED
per § 18.6 rather than inventing a pricing model.
