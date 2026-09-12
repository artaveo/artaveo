# Phase 7.2 — Package model, add-ons, pricing signals & engagement models

**Status:** ✅ complete
**Date:** 12 September 2026

## The D-04 question, answered up front

D-04 (pricing transparency — whether to publish starting-from prices and
typical ranges) is **still an open owner decision**. This phase does not
resolve it, and does not invent numbers to fill the gap.

What it does instead: § 7.2's own exit criterion is *"no price shown that
the owner has not approved"* — not *"no package table until pricing is
approved."* Read literally, that criterion is satisfiable right now: every
`Price` record in this codebase is `{ type: 'quote' }`, rendered as "Ask for
a quote" (en) / "استعلام قیمت بگیرید" (fa). No amount, no currency, no
invented range, anywhere. That is not a placeholder standing in for a
number — `'quote'` is one of the three price types the roadmap itself
defines (`fixed | from | quote`), and it is the accurate, current pricing
signal for a site whose owner hasn't approved a figure yet.

This means 7.2 ships **complete and honest** rather than **blocked**: the
full package/add-on/engagement-model data model, every applicable service's
real tier content, and both UI patterns the roadmap calls for (real table on
desktop, sticky-switcher cards on mobile) are all live. The day D-04
resolves with real figures, the only file that needs to change is
`lib/services-content.ts` — every `Price` object gets `amount`/`currency`
and the right `type`; no component, type or page changes.

## What this phase delivered

### Types (`types/content.ts`)

Added the three canonical shapes roadmap § 3.2 already named in advance —
`ServicePackage`, `ServiceAddon`, `EngagementModel` — plus `Price` /
`PriceType`. `Service` gained `packages?`, `addOns?`, `whatDrivesCost?`,
`paymentScheduleNote?`, all optional, following the same "field present →
section renders" rule the rest of the blueprint uses.

`Price.type` documentation states directly why `'quote'` is the only value
in use right now and what changes (only `amount`/`currency`/`type`) once
D-04 resolves — the same "state the trade-off, don't bury it" approach used
throughout this codebase's comments.

### Content (`lib/services-content.ts`)

Five of the seven services — the ones whose `type` is `productized` or
`productized-custom` — got full three-tier package tables (**Starter ·
Standard · Custom**), each tier with `summary`, `forWhom`, `included[]`,
`notIncluded[]`, `deliverables[]`, and (where it makes sense) `deliveryDays`,
`revisions`, `supportDays`:

- Business Website
- Admin Dashboards & Internal Tools
- Performance, Accessibility & SEO Fix
- Bug Fix & Rescue
- Care Plan (Maintenance) — tiers here are monthly plan levels rather than
  one-off scopes; `deliveryDays` is correctly omitted since the engagement
  is ongoing, not a delivery date

**Web Application / MVP** and **Backend, API & Database** — both
`type: 'custom'` — deliberately got **no packages**. Tiering a bespoke,
scoped-after-Discovery engagement into "Starter/Standard" would misrepresent
how those two services actually work; their Discovery Sprint engagement
model (already written in § 7.1) is the correct and only pricing signal for
them. This is the same "empty means hidden" principle applied to a whole
sub-section, not just a missing field.

Each of the five packaged services also got 1–3 `addOns`, a `whatDrivesCost`
list (concrete, non-numeric factors — page count, role count, integration
count, deadline pressure), and a `paymentScheduleNote` (a payment-timing
summary; no link to a Working Agreement page since that page doesn't exist
yet — Phase 8 — so no dead link was introduced).

A new `engagementModelsData` (5 rows, exactly the roadmap § 7.2 table:
Discovery Sprint · Fixed-scope Project · Productized Service · Care Plan ·
Long-term Part-time) and `getEngagementModels()` selector were added to the
same file — this is site-wide content, not per-service, but it lives here
since it's part of the same pricing/commerce domain.

D-11 (optional early-client offer) stays at its recommended default —
**none** — so nothing was built for it. That's the correct outcome of an
unresolved-but-defaulted decision, not a gap.

### Components

- **`components/services/package-comparison.tsx`** (client component): the
  § 7.2 package table. Renders both patterns the roadmap asks for from the
  same `packages` array — a real `<table>` with column-per-tier semantics on
  desktop (`md:` and up), and a `SegmentedControl`-driven sticky tier
  switcher (`sticky top-16`, matching the site header's `h-16`) showing one
  tier's full card at a time on mobile. `formatPrice()` already handles
  `'from'`/`'fixed'` with `Intl.NumberFormat`, so no rework is needed when
  D-04 resolves — only the data changes.
- **`components/services/service-addons.tsx`**: the add-ons list next to a
  service's packages.
- **`components/services/what-drives-cost.tsx`**: the cost-factors list.
- **`components/services/engagement-models-table.tsx`**: the site-wide
  table, built on the existing `Table` primitive (which already restacks
  rows into labelled cards on mobile — the right pattern here since these
  five rows are independent, not three tiers of one thing to compare).
- **`components/services/service-detail.tsx`**: wired in. Section order now
  matches the full § 7.1 + § 7.2 blueprint: … Process → Timeline (aside) →
  **Packages** → **What drives cost / Payment schedule** → **Add-ons** →
  What I need from you → Related work → FAQ. Its doc comment updated to
  remove the "§ 7.2 not started" note.
- **`app/[locale]/services/page.tsx`**: `EngagementModelsTable` added below
  the service grid, separated by a rule, reading from the new
  `getEngagementModels()` selector.

### i18n

Added a `Price` namespace (`quote`, `from`) and extended `ServiceDetail`
(`packages`, `addOns`, `whatDrivesCost`, `paymentSchedule`,
`choosePackage`, `deliveryDaysValue` — an ICU message with `{min}`/`{max}`
placeholders) and `ServicesIndex` (`engagementModelsTitle`,
`engagementModelsDescription`, `engagementModel`, `engagementWhenItFits`,
`engagementBilling`) in both `messages/en.json` and `messages/fa.json`.

## Verified

- `tsc --noEmit`: 0 errors.
- `next build` (Turbopack, font-stubbed per the established sandbox
  pattern, `app/[locale]/layout.tsx` restored and diffed identical
  immediately after each of three build runs in this session): compiled
  successfully, all 14 `/services/[slug]` pages plus `/services` (×2
  locales) generated.
- Static-HTML inspection of the actual build output (not just "it
  compiled"): confirmed "Ask for a quote" renders on English package
  cards, "استعلام قیمت بگیرید" renders on the Persian Care Plan page, and
  both "Packages" and "Add-ons" section headings render on the Business
  Website detail page. The Engagement Models table's English heading
  ("How we could work together") was confirmed present on the built
  `/services` page.
- `node scripts/check-content-placeholders.mjs`: passed.
- RTL: no bespoke `text-left`/`text-right`/`pl-`/`pr-`/`ml-`/`mr-` in any
  new component file (checked by grep against the four new
  `components/services/*.tsx` files) — everything routes through existing
  logical-property primitives (`Table`, `Button`, `SegmentedControl`) or
  Tailwind's logical utilities directly.
- Content truth: every package/add-on field describes a real, deliverable
  scope difference between tiers (not padding) and no dollar figure, range,
  or "starting at $X" claim appears anywhere in the new content — verified
  by inspection of `lib/services-content.ts`'s new `packages`/`addOns`
  blocks.
- Not yet done, tracked as debt below rather than silently skipped: a
  real-browser pass on `PackageComparison`'s mobile sticky switcher
  (keyboard/touch behavior, and whether `top-16` clears the header
  correctly at every viewport width) and on the desktop table's screen
  reader announcement of the `sr-only` "Not included" row label.

## Known issues / new debt

- **Manual accessibility pass still pending** (carried over from § 7.1,
  now also covering `PackageComparison`'s interactive switcher and the new
  `EngagementModelsTable`): needs a real-browser keyboard/screen-reader
  walk before public launch.
- **`paymentScheduleNote` has no link target**: it describes payment timing
  in prose only, since `/process` and any Working Agreement page don't
  exist yet (Phase 8). Once Phase 8 ships, revisit whether these notes
  should link to it.
- **Care Plan's tiers are monthly plan levels, not one-off scopes** — a
  reasonable fit for `ServicePackage`'s shape, but worth the owner's eyes
  once D-04 is resolved: "Standard" and "Custom" here describe an *hours
  allowance*, not a fixed deliverable, which is a slightly different shape
  than the other four services' tiers.
- Confirmed again (not fixed, out of scope): `.gitignore`'s malformed last
  line (`.DS_Storetsconfig.tsbuildinfo`) still means `tsconfig.tsbuildinfo`
  isn't actually ignored by git.

## Rollback

Revert this delivery's file set. `components/services/service-detail.tsx`
and `app/[locale]/services/page.tsx` would need their § 7.2 wiring removed
to fully roll back to the § 7.1-only state — the § 7.1 sections in both
files are untouched otherwise and don't need to move.

## Final status

PHASE: 7.2
STATUS: COMPLETE

Phase 7 (Services, Packages & Pricing Signals) is now fully complete —
both 7.1 and 7.2.

**NEXT PHASE: 8** (About, Process & Working Agreement). No new blocker
introduced by this phase; D-04 remains open and, per this phase's own
reasoning, no longer blocks anything downstream that only needs a "Price"
signal to exist — Phase 9.1's Brief Builder can read `packages`/`price`
the same way this phase's UI does, showing "Ask for a quote" until D-04
resolves.
