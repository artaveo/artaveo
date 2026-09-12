# Phase 6.3 — Case study: Pezhohesh Complex Portal

**Status:** ✅ COMPLETE
**Date:** 12 September 2026

## Objective
Fill in the § 6.1 case-study template with real, verified content for the
Pezhohesh Complex Portal project.

## Scope
Content only — no changes to the template, components, or infrastructure
built in § 6.1. Implemented in the same session as Phase 6.2 (per the
recommendation in `PHASE-6.3-content-brief.md`), but tracked as its own
roadmap sub-phase and its own completion record, per § 6.2/6.3's
"independent sub-phases" note.

## Dependencies
- D-06 (publication consent) — resolved 12 Sep 2026: Zakir confirmed he
  owns the Pezhohesh Complex institute itself and built the portal for
  it — no separate external client relationship.
- § 6.1 case-study template and `Project` type fields (already built).

## Decisions
See `docs/phases/PHASE-6.3-content-brief.md` for the two Decision Record
cards used in the "Key Decisions" section (excluding `/admin` from the
service-worker's offline navigation fallback; not duplicating the
existing localStorage stale-while-revalidate layer with a Workbox
runtime-caching rule).

## Implementation summary
Added all optional case-study fields to the `pazhuhesh-portal` entry in
`lib/home-content.ts`: `status` (`'live'` — confirmed directly by Zakir,
12 Sep 2026; the field had never been set before this phase), `year`,
`context`, `problemAndGoals`, `constraints` (4 items), `architecture`,
`keyDecisions` (2 Decision Record cards), `engineeringHighlight`,
`dataIntegrityAndSecurity`, `responsiveAndRtl`, `quality`,
`currentStatusAndNext`, `lessonsLearned`. Every field is `{ en, fa }`,
written from scratch for Persian readers, per § 16.2.

All content is sourced from, and verified against, the real
`pezhohesh-portal` repository (`README.md`, `docs/admin-panel-roadmap.md`,
`vite.config.js`, `sql/phase3_admin_roles_and_rls.sql` — see the
companion content brief and `docs/content/claims-ledger.md` for the
evidence trail). No invented clients, metrics, dates, or outcomes.

## Changed files
- `lib/home-content.ts` — `pazhuhesh-portal` project entry extended.
- `docs/content/claims-ledger.md` — new claims-ledger entries for this
  case study.
- `docs/phases/PHASE-6.3-content-brief.md` — the content-drafting brief
  this phase implements (kept as historical record of sourcing).
- `ROAD-MAP-ARTAVEO.md` — § 6.3 and § 8.3 phase-index status updated;
  D-06 marked resolved for this project.

## Database changes / migrations
None — this phase is content-only.

## Tests
No automated test suite exists for this project yet (tracked debt,
unrelated to this phase).

## Manual verification
- `node scripts/check-content-placeholders.mjs` — passes.
- `npx tsc --noEmit` — zero errors.
- `next build` (Turbopack) — compiles successfully; both
  `/en/work/pazhuhesh-portal` and `/fa/work/pazhuhesh-portal` prerender.
  Verified with the same temporary `next/font/google` stub as § 6.2,
  reverted immediately after — `layout.tsx` diffs clean.
- `next start` smoke test: fetched `/fa/work/pazhuhesh-portal` and
  confirmed the new sections (زمینه/Context, تصمیم‌های کلیدی/Key
  Decisions, etc.) render with the correct Persian copy; a second smoke
  test after the `status: 'live'` addition confirmed the "Live" status
  badge renders on `/en/work/pazhuhesh-portal`.
- en/fa: verified above. LTR/RTL: verified above. Light/dark and full
  accessibility/security review not independently re-run (content-only
  change, no component/styling touched).

## Known issues
- No `Portfoli`-style screenshot folder was found in the `pezhohesh-portal`
  repo during this review; `public/images` was not audited for real
  student/staff PII. No screenshot was used as `coverImage`.
- No live demo URL found in repo docs — `Links` section omits it.

## New debt
- Confirm and set the project's `status` field.
- Screenshot/`public/images` review for D-06 compliance before using any
  as `coverImage`.
- Re-verify claims ledger if source repo advances past commit `0ae2484`.

## Rollback
Revert the `pazhuhesh-portal` entry in `lib/home-content.ts` to its
pre-phase state (only `id` through `published` fields) if this content
needs to be pulled. No database or infra changes to roll back.

## Final status
PHASE: 6.3
STATUS: COMPLETE

IMPLEMENTED:
- Full bilingual case-study content for Pezhohesh Complex Portal across
  all § 6.1 template sections.

VERIFIED:
- typecheck · placeholder guard · build · smoke test (en/fa render)
- content truth check (claims ledger against real source repo)

FILES CHANGED:
- lib/home-content.ts
- docs/content/claims-ledger.md
- docs/phases/PHASE-6.3-content-brief.md (brief, pre-existing from mother chat)
- docs/phases/PHASE-6.3-README.md (this file)
- ROAD-MAP-ARTAVEO.md

DATABASE / MIGRATIONS:
- None

KNOWN ISSUES:
- No screenshot folder reviewed for D-06 compliance
- No live demo URL

NEW DEBT:
- Screenshot/public-images review before using any as coverImage
- Re-verify claims ledger if source repo advances past commit 0ae2484

DECISIONS NEEDED:
- None open for this phase (status confirmed live by Zakir, 12 Sep 2026)

ARTIFACT: artaveo-phase-6.2-6.3-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: Phase 7 (Services, Packages & Pricing Signals)
