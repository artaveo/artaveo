# PHASE 4.1 — Art Direction & Brand Identity

## Status: PARTIAL

## Objective

Derive the design system's colour tokens and fill in the logo variants the supplied renders don't cover (flat, monochrome, mark-only), per ROAD-MAP-ARTAVEO.md § 4.1. This sub-phase does not propose new direction options — it derives from the D-12-approved mark and fills gaps.

## Scope

In scope this session: colour-token derivation and correction (§ 4.1.1), the three missing logo variants (§ 4.1.2: flat/simplified, monochrome, mark-only), and the `docs/design/art-direction.md` output the roadmap requires.

Out of scope (not started): favicon/app-icon/OG-image generation, clear-space and minimum-size rules, typography pairing, imagery/iconography/motion rules (§ 4.1.3) — all still open. Full AA contrast audit remains Phase 4.2 (P1-A); this session only fixed the one violation its own token change introduced.

## Dependencies

- **D-12** (visual direction, logo variants) — primary mark approved 10 Sep 2026. Not fully resolved: this session's derived tokens and variants, plus a temporary placeholder substitution (see Known Issues), still need the owner's confirmation before anything here is final.

## Implementation summary

**Colour tokens (§ 4.1.1).** Initially measured charcoal/gold directly from `artaveo-lockup-compact-dark.png`'s pixels (the one supplied lockup with real alpha). That measurement was later superseded: `Data/ChatGPT Image Sep 11, 2026, 01_24_12 AM.png`, a 9-panel owner reference sheet, labels the brand colours explicitly as Charcoal `#1A1A1A`, Gold `#D4A24C`, Light `#F8F9FA`. The pixel-sampled charcoal had picked up a cool tint from the 3D render's lighting; the reference sheet's charcoal is genuinely neutral (zero chroma), which matches the roadmap's original §4.1.1 estimate (`#353535`) better than this session's own measurement did. Final tokens use the reference sheet's values.

`app/globals.css` — `--brand` was still the Phase-1 scaffold blue (`oklch(0.55 0.16 256)`, both themes), never updated to the approved gold. Now `oklch(0.74 0.12 79)` light / `oklch(0.8 0.12 79)` dark. `--brand-foreground` changed from near-white to dark (gold is light — L 0.74 — so white text on it fails contrast; the old near-white value was a carry-over from when `--brand` was a medium-dark blue). `--warning` moved from hue 70 to hue 40: at hue 70 it was visually identical to the new brand gold (confirmed by rendering both as swatches side by side) — shifted toward red-orange to stay distinguishable. `--ring` was hard-coded to the same value as the old `--brand`; decoupled so focus-ring visibility doesn't depend on the brand token (gold fails the 3:1 non-text contrast a focus ring needs against light surfaces).

`components/ui/badge.tsx` — the `brand-soft` variant rendered gold text directly on a 10%-opacity gold background (contrast ≈ 2.3, fails AA). Changed to use `text-brand-foreground`, mirroring the pattern the `warning` variant already used for the same reason.

**Logo variants (§ 4.1.2).** Isolated the mark from `artaveo-lockup-compact-dark.png`'s alpha channel, traced the silhouette and gold facet separately (potrace), and composed flat two-tone SVGs — no gradients, bevels, or rim-light, matching the roadmap's instruction to flatten each facet to one solid tone while keeping the silhouette and folded-ribbon negative space. Delivered `artaveo-mark-flat.svg`, `artaveo-mark-mono-white.svg`, `artaveo-mark-mono-black.svg`. Traced mark-only (never included a wordmark), so these also satisfy the roadmap's separate "mark-only lockup" row. Legibility verified at 32px and 16px (favicon range).

**Verification note.** `pnpm build` in this environment fails on the `next/font` Google Fonts fetch (network sandbox doesn't allow `fonts.googleapis.com`) — unrelated to these changes but means `/design-system` couldn't be visually verified end-to-end here. Token values were instead verified by converting OKLCH → sRGB and rendering static swatches directly.

## Decisions

- **D-12**: not resolved. This session produces derived tokens and variants for the owner to review, per the decision's own text. Nothing here is approved until confirmed.
- **New, unlogged decision point**: after this work was delivered, four additional AI-generated files were added to `Data/` and explicitly installed as temporary replacements for the flat/monochrome mark files, despite differing in silhouette from the D-12-approved mark (see Known Issues). This was an explicit instruction to unblock downstream work rather than wait for a corrected asset — recorded here since it means the currently-installed flat/mono files are **not** the approved design.

## Changed files

```
app/globals.css                                          --brand, --brand-foreground, --brand-muted, --warning,
                                                           --warning-foreground, --ring updated/decoupled (both themes)
components/ui/badge.tsx                                   brand-soft variant text colour fixed
docs/design/art-direction.md                              new — phase 4.1 output doc (§ 4.1 requirement)
docs/phases/PHASE-4.1-README.md                           new — this file
public/brand/artaveo-mark-flat.svg                        new — flat mark, approved-logo geometry, official colours
public/brand/artaveo-mark-mono-white.svg                  new, then overwritten with TEMP placeholder (see below)
public/brand/artaveo-mark-mono-black.svg                  new, then overwritten with TEMP placeholder (see below)
public/brand/artaveo-mark-mono-white-approved-shape-REFERENCE.svg   new — backup of the correct-shape mono white
public/brand/artaveo-mark-mono-black-approved-shape-REFERENCE.svg   new — backup of the correct-shape mono black
public/brand/artaveo-mark-flat-light.svg                  new — TEMP placeholder (see Known Issues)
public/brand/artaveo-mark-flat-dark.svg                   new — TEMP placeholder (see Known Issues)
```

## Known issues

**The four active flat/monochrome mark files do not match the D-12-approved logo's silhouette.** `public/brand/artaveo-mark-flat-light.svg`, `artaveo-mark-flat-dark.svg`, `artaveo-mark-mono-white.svg` and `artaveo-mark-mono-black.svg` were traced from four AI-generated files added to `Data/` (`Flat Gold and Charcoal A Emblem.png`, `Geometric Charcoal and Gold Ribbon Emblem.png`, `Monochrome Angular A Logo.png`, `Abstract White Ribbon A Emblem.png`), not from the approved master (`artaveo-master-reference.png`). All four add a separate, detached quadrilateral "flag" shape at the bottom-right of the "A" that the approved logo's continuous folded-ribbon silhouette does not have — this is a different design, not a flat/mono rebuild of the approved one, which is what roadmap § 4.1.2 calls for. They were installed anyway, on explicit instruction, as temporary placeholders so favicon/icon/UI work isn't blocked. Full detail, the light/dark role-assignment guess, and the exact swap-back list are in `docs/design/art-direction.md` under "Known Issues — temporary placeholder mark files."

The correct-shape files are preserved and not deleted: `artaveo-mark-flat.svg` (single flat variant) and the two `*-approved-shape-REFERENCE.svg` files.

**`--brand` supersession risk.** Two different gold values were produced in this same session (`#D6963D` measured, then `#D4A24C` official) before the codebase was ever committed with either — worth double-checking no other file still references the intermediate value if this doc is read out of order.

## New debt

- Favicon / app icons (light + dark) / Open Graph template — still not built; when they are, they must be built from the *approved-shape* files, not the current temporary flat-light/flat-dark/mono-white/mono-black.
- No formal decisions log exists yet (`docs/decisions.md`) to record the D-12 partial status and the temporary-placeholder substitution outside of these two markdown files.
- `--chart-1`/`--chart-4`/`--chart-5` and `--success`/`--info`/`--destructive` were not re-evaluated against the corrected gold hue; only the one confirmed clash (`--warning`) was fixed.

## Rollback

Revert `app/globals.css` and `components/ui/badge.tsx` to restore the Phase-1 blue brand token. Delete the `public/brand/artaveo-mark-*` files added this session to remove the logo variants; the three originally-received lockups (`artaveo-lockup-*.png`) are untouched by this phase.

## Final status

**PARTIAL.** Colour tokens corrected and reconciled against an owner-supplied reference; three of the roadmap's four still-needed logo-variant slots have both a correct-shape version and a currently-active temporary placeholder (flagged above); mark-only is satisfied as a side effect of the flat/mono work. D-12 sign-off, the placeholder swap-back, and all of § 4.1.3 (favicon/icons, clear-space, typography, imagery, iconography, motion) remain before this sub-phase can close.
