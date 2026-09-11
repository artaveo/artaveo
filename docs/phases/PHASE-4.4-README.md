# PHASE 4.4 — Patterns & States

## Status: COMPLETE — see Verification below.

## Objective

Per `ROAD-MAP-ARTAVEO.md` § 4.4: build the repeatable page-level patterns and state UI every later page assembles from, so nothing gets invented ad hoc once Phase 5+ starts building real routes.

## Scope

- **Page Header, Section Header** (promote the Home one to a shared pattern), **CTA Section**, **feature list**, **proof row without numbers**
- **State patterns**: Empty (admin/preview only), Loading (skeletons), Error (inline / section / page), Success, Rate-limited, Offline
- **Browser Frame / Device Frame**, diagram container with text alternative
- **Form layouts**: single-column and multi-step

## Implementation

**`components/ui/patterns.tsx`**
- `PageHeader` — top-of-page header for content routes (`/work`, `/about`, …): eyebrow badge, title, description, optional `meta` key/value grid (the same divided-tile grid `/design-system`'s own intro block already used) for a short set of *real* page-level facts — no invented metrics, matching the benchmark decision against vanity stats.
- `SectionHeader` — **promoted from `components/home/section-header.tsx`**, unchanged in behavior: mono eyebrow, balanced title, muted lead, optional trailing link that moves under the text on small screens (now built on `Link` from `actions.tsx` rather than a bespoke anchor). `components/home/section-header.tsx` is left as a one-line re-export so the six existing Home sections that import it don't need a mechanical path change in this pass; new call sites should import from `@/components/ui/patterns` directly.
- `CTASection` — generalised from Home's `FinalCta` ("Have a project in mind?"): title, description, one primary action, one optional secondary action, same technical-grid backdrop. `components/home/final-cta.tsx` now calls this with its original copy instead of duplicating the markup.
- `FeatureList` — icon + title + description tiles, the same shape Home's Services section already used, generalised so Services detail / About / package-comparison pages can reuse it. `variant="grid"` (divided tiles) or `variant="list"` (stacked, room for longer copy).
- `ProofRow` — a **deliberately numberless** row of qualitative claims (check icon + short factual statement), for the credibility signals the benchmark research called for without inventing stats the two real case studies can't back up.

**`components/ui/states.tsx`**
- Shared internal `StateShell` (icon, title, description, optional action, three sizes) that every state pattern below is built from, so spacing/icon-size/copy hierarchy can't drift between them — the same "one shared base, config per variant" shape `content.tsx`'s `Callout` already established for its four tones.
- `EmptyState` — explicitly documented as admin/preview/CMS-only in its own comment; the public site hides empty sections instead (already the rule for `/work`'s filters in § 6.1) rather than showing this.
- `LoadingState` — a thin `role="status"`/`aria-live="polite"` wrapper with one `sr-only` announcement, so a screen reader hears "loading" once instead of narrating every `Skeleton` block inside it individually. It owns the announcement only; the skeleton shape is passed as children using the existing `Skeleton` primitive.
- `ErrorState` — `size="inline" | "section" | "page"` for the three real placements the roadmap names (a field/card failing vs. a section vs. the whole route, which pairs with `app/error.tsx` boundaries in § 5.5). `role="alert"`, default "Try again" action.
- `SuccessState`, `RateLimitedState`, `OfflineState` — same shell, tone-appropriate icon/color and copy. `OfflineState`'s doc comment ties it explicitly to § 10's rule that the Brief Builder must never show a false success offline — this is the honest state it shows instead, with a real retry action rather than a dead end.

**`components/ui/frames.tsx`**
- `BrowserFrame` — traffic-light dots + optional LTR-pinned URL bar, wraps a screenshot/preview slot. Directly implements § 4.1.3's imagery rule: product screenshots only ever appear inside a frame with demo data, never bare.
- `DeviceFrame` — phone (default) or tablet shell with a notch bar, for mobile-context mockups.
- `DiagramContainer` — `figure`/`figcaption` with a **visible** short caption and an optional longer `textAlternative` rendered `sr-only` and wired via `aria-describedby` — one explanation for sighted readers, one for assistive tech, not two competing captions. Matches § 6.2's case-study template line: "Architecture — accessible diagram + short explanation."

**`components/ui/form-layout.tsx`**
- `FormLayout` — single-column form shell (max-width, gap rhythm, optional footer slot for the submit button). Owns layout only; `Field`/inputs stay in `form-controls.tsx`, submit-level status stays `FormMessage`.
- `MultiStepFormLayout` — the Brief Builder shape: reuses the existing `Stepper` for the header, an `sr-only` `aria-live` region announcing "Step N of M: <label>" on step change, and a Back/Next (or Submit, on the last step) footer. Current-step fields are the caller's children; this component owns only the stepper header and the nav.

**Showcase wiring** — `components/showcase/patterns-section.tsx`, `states-section.tsx`, `frames-section.tsx`, `form-layouts-section.tsx` added to `/design-system` (and its header nav) so every pattern above is visually verifiable in both themes, not just type-checked. `form-layouts-section.tsx` is the one interactive (`'use client'`) demo — it holds local step state to make the multi-step nav actually clickable.

## RTL / keyboard / theme review

- Swept every new file for physical-direction utilities (`text-left/right`, `pl-/pr-/ml-/mr-`, `left-/right-`) — none found. `BrowserFrame`'s URL bar and `DiagramContainer`'s SVG both stay `dir="ltr"`/plain markup respectively, the same convention `CodeBlock` and `Kbd` already follow for content that must never mirror.
- `SectionHeader`'s trailing-link arrow keeps the exact `rtl:rotate-180`/`group-hover:-translate-x-0.5` pairing the pre-promotion Home version had — behavior is unchanged by the move.
- Keyboard: `MultiStepFormLayout`'s Back/Next are real `Button`s (native focus/activation); `FormLayout` is a real `<form>` so native Enter-to-submit works; every `StateShell` action is a real `Button`, not a styled `<div onClick>`.
- Theme: every new file reads only semantic tokens (`bg-card`, `bg-elevated`, `border-border`, `text-muted-foreground`, the `-text` tone pairs `success-text`/`warning-text`/`destructive-text` already established in §4.1–§4.3) — no raw colors introduced. `DeviceFrame`'s border reuses `border-elevated`, confirmed against the `--color-elevated` token rather than assumed.

## Verification

- `npx tsc --noEmit` — clean.
- `next build` — verified with the same temporary `next/font/google` stub technique used in §4.1.3/§4.3 (this sandbox can't reach `fonts.googleapis.com`; stub reverted immediately after, confirmed byte-identical to the pre-session file via `diff`). Full production build compiled successfully, including all four new `/design-system` sections and the updated Home `FinalCta`/`SectionHeader` call sites.
- Not done here: manual screen-reader pass and visual regression screenshots in both themes/directions — same standing caveat every §4.1–§4.3 sub-phase carries for this sandbox (no reachable browser to visually drive). Recommend before D-12 sign-off.

## Files changed / added

Added: `components/ui/patterns.tsx`, `components/ui/states.tsx`, `components/ui/frames.tsx`, `components/ui/form-layout.tsx`, `components/showcase/patterns-section.tsx`, `components/showcase/states-section.tsx`, `components/showcase/frames-section.tsx`, `components/showcase/form-layouts-section.tsx`, `docs/phases/PHASE-4.4-README.md`.
Changed: `components/home/section-header.tsx` (now a re-export of the promoted `SectionHeader`), `components/home/final-cta.tsx` (now calls `CTASection`), `app/design-system/page.tsx` (four new sections wired in), `components/showcase/showcase-header.tsx` (nav links), `ROAD-MAP-ARTAVEO.md` (status line, § 4.4 marked complete).

## Debt / open items for § 4.5+

- The six Home sections still import `SectionHeader` from `components/home/section-header.tsx` rather than `@/components/ui/patterns` directly — cosmetic only (it's a one-line re-export, not a duplicate implementation), but worth a mechanical find-and-replace next time those files are touched for another reason, rather than as a dedicated pass.
- `EmptyState` has no live usage yet — nothing admin/preview exists before Phase 15+. It's built and demoed per the roadmap's explicit ask, but its first real call site will be the first admin list view.
- `MultiStepFormLayout` has no validation-gating between steps (no "can't advance until step N's fields are valid") — that logic belongs to whatever real form uses it (the Brief Builder, Phase 15), not to the layout primitive itself.
- No owner decision needed for this sub-phase — same reasoning as §4.2/§4.3: additive primitives and layout patterns built on already-approved tokens (D-12), not new design decisions.
