# Phase 6.1 — `/work` index, case study template & shared infrastructure

**Status:** ✅ complete (engine/template only — see "What's deferred" below)
**Date:** 12 September 2026

## What this phase delivered

Builds the reusable Work engine described in roadmap § 6.1: the `/work`
index and the `/work/[slug]` case study template, both real routes for the
first time (they previously only existed as link targets from Home). No
per-project decision gate applies to this sub-phase — D-06 (publication
consent) blocks § 6.2 / § 6.3's actual case-study content, not this
infrastructure.

### Status vocabulary unified
- `ProjectStatus` (`types/content.ts`) extended from three states to the
  full honest vocabulary: `live | in-development | private | archived |
  concept`.
- `components/ui/tag.tsx`'s `StatusBadge` (already built in § 4.3, ahead of
  this phase) now imports `ProjectStatus` from `types/content.ts` instead
  of duplicating it, and exports `statusVariant` as the single color
  mapping. It accepts an optional `label` override so public, bilingual
  pages can pass a translated string while the internal design-system
  showcase keeps its English-only default.
- `components/home/featured-work.tsx` (Home's "Featured work" section)
  switched from its own three-state, untranslated badge mapping to
  `StatusBadge` + the new `ProjectStatus` message namespace — so Home and
  `/work` now render identical status colors and both are translated.

### Content layer
- `lib/home-content.ts`: added `getAllProjects()` (all published projects,
  featured-first) and `getProjectBySlug(slug)` — `/work` and
  `/work/[slug]`'s only read path, per the existing selector-function
  convention.
- `lib/site.ts`: added `WORK_FILTER_THRESHOLD = 6` — the config value the
  roadmap calls for ("filters appear only when there are enough projects to
  need them … threshold recorded in config; with two projects, no
  filters").
- `types/content.ts`: `Project` gained a `role` field (now filled in for
  both real projects — factual: sole developer, end to end) and a set of
  optional case-study body fields (`context`, `problemAndGoals`,
  `constraints`, `architecture`, `keyDecisions`, `engineeringHighlight`,
  `dataIntegrityAndSecurity`, `responsiveAndRtl`, `quality`,
  `currentStatusAndNext`, `lessonsLearned`, `relatedServiceSlug`) plus a new
  `DecisionRecord` type for the Key Decisions cards. Every one of these is
  optional and independently gated in the template — see "What's deferred".

### `/work` index (`app/[locale]/work/page.tsx`)
- `PageHeader` (already built in § 4.4) for the title/description.
- `components/work/work-grid.tsx` — the responsive grid (1 / 2 / 3
  columns), featured-first, plus category/technology filters that only
  render once `projects.length >= WORK_FILTER_THRESHOLD`. Filter options are
  derived from the projects actually present, so a selection can never
  produce an empty grid — no empty-results state was needed (`EmptyState`
  stays admin/CMS-only per its existing doc comment).
- `components/work/project-card.tsx` — the grid tile: `BrowserFrame`
  thumbnail (reused from § 4.1, not re-implemented), category + status
  badges, title, summary, up to five tech badges.

### Case study template (`app/[locale]/work/[slug]/page.tsx`)
- `components/work/case-study.tsx` renders every section from the roadmap's
  template — Hero + Snapshot, Context, Problem & Goals, Constraints, My
  Role & Scope, Architecture, Key Decisions, Engineering Highlight, Data
  Integrity & Security, Responsive & RTL, Quality, Current Status & Next,
  Lessons Learned, Links, Next Project — each gated on its own optional
  `Project` field so the template works today (two mostly-empty case
  studies) and needs no changes once § 6.2 / § 6.3 fill the fields in.
- Real facts render now: category/status/year, title, summary, role, tech
  stack, the cover screenshot (real image or a clearly-labelled
  placeholder, same convention as Home), the already-verified `highlights`
  list, and real `liveUrl` / `githubUrl` links. A plain notice
  (`CaseStudy.pendingNotice`) explains that the deeper write-up is still
  being verified against the code, instead of the page silently looking
  unfinished or — worse — inventing content to fill the gap.
- `generateStaticParams` pre-renders both real slugs in both locales;
  `notFound()` on an unknown slug reuses the existing per-locale
  not-found screen (§ 5.2). Verified against a production build: `/en/work`,
  `/fa/work`, and all four locale × slug combinations render and prerender
  correctly.

### Messages
- New `ProjectStatus` namespace (5 keys) shared by Home and `/work`.
- New `Work` namespace (index page + grid + filters).
- New `CaseStudy` namespace (template section headings + snapshot labels +
  the pending-write-up notice).
- `FeaturedWork`'s old `statusInDevelopment` / `statusLive` / `statusArchived`
  keys removed — superseded by `ProjectStatus`.
- All of the above written in both `en` and `fa` (neutral vocabulary per
  D-03; Latin technology names still wrapped in `LatinTerm` inside Persian
  prose).

## What's deferred (by design, not oversight)

- **§ 6.2 (Transportation System) and § 6.3 (Pazhuhesh Complex Portal)** —
  writing the actual Context / Problem & Goals / Constraints / Architecture
  / Key Decisions / Engineering Highlight / Data Integrity & Security /
  Responsive & RTL / Quality / Current Status & Next / Lessons Learned
  content. Doing this honestly means re-verifying each claim against the
  real codebases and stays gated behind **D-06** (publication consent —
  what may be shown, demo-data-only screenshots, no customer PII). Until
  D-06 resolves, both case study pages intentionally show only the
  already-verified fields plus the pending notice — never invented
  narrative.
- Real project screenshots (`coverImage`) — still pending, same
  placeholder convention as Home's Featured Work section.

## Verification

- `pnpm build` equivalent (`next build`, font stub applied per the
  established sandbox workaround, reverted afterward) — compiles clean,
  prerenders `/work` and all four `/work/[slug]` combinations.
- `tsc --noEmit` — zero errors against the real `app/[locale]/layout.tsx`.
- `node scripts/check-content-placeholders.mjs` — passes.
- Manual `next start` smoke test — `/en/work`, `/en/work/transportation-system`,
  `/fa/work/pazhuhesh-portal` all render correctly.
- **Known environment note:** requesting an unknown slug under
  `/work/[slug]` in a plain `next start` (no CDN/edge in front) returns the
  correct not-found page content but with an HTTP 200 rather than 404 —
  visible via the `x-nextjs-prerender` / `x-nextjs-cache: STALE` response
  headers. This reproduces independently of this phase's code (the
  catch-all `/en/not-found` route correctly returns 404) and appears to be
  a `next start`-without-a-CDN quirk around cached fallback shells for
  `generateStaticParams` routes on Next 16.3.3/Turbopack, not a bug in
  `notFound()` usage here. Worth re-checking once deployed behind the real
  hosting platform's edge layer.
