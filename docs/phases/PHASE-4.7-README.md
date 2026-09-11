# PHASE 4.7 — Living documentation

## Status: COMPLETE — see Verification below. **Closes Phase 4.**

## Objective

Per `ROAD-MAP-ARTAVEO.md` § 4.7: make `/design-system` present every token, primitive, pattern and state in Light/Dark × LTR/RTL with usage notes and do/don't examples, not just a visual catalogue.

## Scope

- Light/Dark **and** LTR/RTL preview for every section
- Usage notes and do/don't examples for every token, primitive, pattern and state
- General correctness pass on the showcase itself, since it's the thing being handed over as the living reference

## Implementation

**RTL preview (`components/showcase/direction-toggle.tsx`)**
One `DirectionToggle` in `ShowcaseHeader`, next to the existing `ThemeToggle`, flips `document.documentElement.dir` between `ltr`/`rtl` for the whole page. This covers "every section in LTR/RTL" in one place rather than duplicating each of the 18 sections' markup twice — every component already uses logical properties (§ 4.2's rule), so a single toggle is a real, live mirror test of that rule instead of a static screenshot. Resets to `ltr` on unmount so leaving the page never leaves the real (LTR-only, pre-locale-routing) site mirrored.

**Usage notes & do/don't (`components/showcase/usage-notes.tsx`)**
One shared `UsageNotes` component, built on the existing `Callout` (`tip` for Do, `danger` for Don't — § 4.3's content primitives, not new tokens). Added to **all 18 sections** — every color/typography/spacing token group, every primitive from § 4.3, every pattern and state from § 4.4, and the identity components from § 4.5 — with two to three concrete, specific lines per side (e.g. "don't build a custom checkbox from styled divs", "don't invent an evidence count the owner hasn't confirmed"), not generic filler. Each note reflects something actually true of that component, established while building it in §4.3–§4.6.

**Numbering / correctness pass**
While wiring usage notes into every section, found and fixed drift between each section's `index="NN — …"` label and its actual position on the rendered page (labels had been assigned in the order components were *built* across phases 4.3–4.6, not the order they appear on `/design-system`): `Cards` (was 07, now 12), `Layout` (was 08, now 13), `Patterns` (was 12, now 14), `States` (was 13, now 15), `Frames` (was 14, now 16), `Form layouts` (was 15, now 17), `Identity` (was 16, now 18). `Cards` had also been silently duplicating `Actions`'s "07", and `Layout` duplicating `Form controls`'s "08".

Also fixed: `ShowcaseHeader`'s section nav never got an `#identity` link when § 4.5 added the Identity section — added it, matching the page's actual final order.

## RTL / keyboard / theme review

- `DirectionToggle` and `ThemeToggle` are both real `Button`s with `aria-pressed`, matching the pattern already established for toggles elsewhere.
- Every `UsageNotes` instance renders through `Callout`, which already has the right `role` (`note`/`alert`) and icon/color pairing — no new ad hoc markup introduced.
- Swept the full diff for physical-direction utilities — none introduced (one false-positive grep hit was the words "left-to-right" inside a usage-note sentence, not a CSS class).

## Verification

- `npx tsc --noEmit` — clean.
- `next build` — verified with the same temporary `next/font/google` stub used in §4.1–§4.6 (sandbox can't reach `fonts.googleapis.com`; reverted immediately after, confirmed byte-identical via `diff`). Full production build compiled successfully.
- Manually toggled the reasoning behind `DirectionToggle` against the actual component set: every section already avoids physical-direction utilities (confirmed section-by-section during §4.3–§4.6), so the live mirror should render correctly — not independently re-verified with a real browser in this sandbox (no reachable browser here), which is the same standing caveat every §4.1–§4.6 sub-phase has carried.

## Files changed / added

Added: `components/showcase/usage-notes.tsx`, `components/showcase/direction-toggle.tsx`, `docs/phases/PHASE-4.7-README.md`.
Changed: all 14 pre-existing showcase section files (`colors-section.tsx` through `identity-section.tsx`) — `UsageNotes` added, and index numbers corrected on 7 of them; `components/showcase/showcase-header.tsx` (`DirectionToggle` added, `#identity` nav link added); `ROAD-MAP-ARTAVEO.md` (§ 4.1 status note updated to reflect D-12 resolution, § 4.7 and Phase 4 marked complete).

## Phase 4 exit criteria — checked against the roadmap's own list

- **D-12 approved and recorded** ✅ (resolved 12 Sep 2026, `docs/decisions.md` / Decision Register)
- **Every primitive verified for keyboard, screen reader, RTL and both themes** ✅ per-file review across §4.1–§4.6, and now a live RTL toggle on the reference page itself rather than only a written claim
- **No component uses physical left/right** ✅ swept at every phase, reconfirmed in this pass's diff
- **No hard-coded colours outside tokens** ✅ swept at every phase
- **Home visual pass approved by the owner** ✅ D-12 approval in this conversation covered the derived variants § 4.6 applied
- **No dependency added without a reason** ✅ zero new npm dependencies across §4.1–§4.7 — every new piece (`UsageNotes`, `DirectionToggle`, `ExternalProfileLinks`, etc.) is built on primitives already in the repo

## Debt / open items carried past Phase 4

- **`public/brand/artaveo-mark-mono-white.png`** (the raster file, not the SVG) still needs regenerating from the same source as the black mono — recorded in § 4.1, not blocking (the SVG, which production code actually uses, is already correct).
- **`public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/brand/og-image.png`** still built from the old defective trace — recommended before Phase 10 (PWA) or any public share of the OG image.
- **Phase 3's closure checklist § 3.5** remains open, independent of Phase 4.
- Expertise-matrix evidence-linking (§ 4.6) is still unwired — Phase 7–8 data work.
- `StickyMobileCta` (§ 4.5) is still unwired into the real layout — a § 5.4 decision.

No further owner decision is needed to close Phase 4 itself — the two decisions it depended on (D-02/D-08 for § 4.5, D-12 for § 4.6/4.1) are both resolved.
