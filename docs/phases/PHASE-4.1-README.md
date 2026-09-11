# PHASE 4.1 — Art Direction & Brand Identity

## Status: PARTIAL — §4.1.1 and §4.1.2 complete from the prior session; §4.1.3 complete this session; D-12 owner sign-off still open

## Objective

Derive the design system's colour tokens and fill in the logo variants the supplied renders don't cover (flat, monochrome, mark-only), per ROAD-MAP-ARTAVEO.md § 4.1. This sub-phase does not propose new direction options — it derives from the D-12-approved mark and fills gaps.

## Scope

In scope across both sessions: colour-token derivation and correction (§ 4.1.1), the three missing logo variants (§ 4.1.2: flat/simplified, monochrome, mark-only), and — this session — favicon/app-icon/OG-image generation, clear-space and minimum-size rules, semantic-colour audit, typography pairing, and imagery/iconography/motion rules (§ 4.1.3). All three sub-sections' required output now lives in `docs/design/art-direction.md`.

Out of scope (not started): full AA contrast audit remains Phase 4.2 (P1-A) — §4.1.3 only checked semantic colours for hue-competition against the brand gold, not exhaustive contrast, and flagged two borderline pairs it found along the way for that phase to pick up.

## Dependencies

- **D-12** (visual direction, logo variants) — primary mark approved 10 Sep 2026. Not fully resolved: this session's derived tokens and variants, plus a temporary placeholder substitution (see Known Issues), still need the owner's confirmation before anything here is final.

## Implementation summary

**Colour tokens (§ 4.1.1).** Initially measured charcoal/gold directly from `artaveo-lockup-compact-dark.png`'s pixels (the one supplied lockup with real alpha). That measurement was later superseded: `Data/ChatGPT Image Sep 11, 2026, 01_24_12 AM.png`, a 9-panel owner reference sheet, labels the brand colours explicitly as Charcoal `#1A1A1A`, Gold `#D4A24C`, Light `#F8F9FA`. The pixel-sampled charcoal had picked up a cool tint from the 3D render's lighting; the reference sheet's charcoal is genuinely neutral (zero chroma), which matches the roadmap's original §4.1.1 estimate (`#353535`) better than this session's own measurement did. Final tokens use the reference sheet's values.

`app/globals.css` — `--brand` was still the Phase-1 scaffold blue (`oklch(0.55 0.16 256)`, both themes), never updated to the approved gold. Now `oklch(0.74 0.12 79)` light / `oklch(0.8 0.12 79)` dark. `--brand-foreground` changed from near-white to dark (gold is light — L 0.74 — so white text on it fails contrast; the old near-white value was a carry-over from when `--brand` was a medium-dark blue). `--warning` moved from hue 70 to hue 40: at hue 70 it was visually identical to the new brand gold (confirmed by rendering both as swatches side by side) — shifted toward red-orange to stay distinguishable. `--ring` was hard-coded to the same value as the old `--brand`; decoupled so focus-ring visibility doesn't depend on the brand token (gold fails the 3:1 non-text contrast a focus ring needs against light surfaces).

`components/ui/badge.tsx` — the `brand-soft` variant rendered gold text directly on a 10%-opacity gold background (contrast ≈ 2.3, fails AA). Changed to use `text-brand-foreground`, mirroring the pattern the `warning` variant already used for the same reason.

**Logo variants (§ 4.1.2).** Isolated the mark from `artaveo-lockup-compact-dark.png`'s alpha channel, traced the silhouette and gold facet separately (potrace), and composed flat two-tone SVGs — no gradients, bevels, or rim-light, matching the roadmap's instruction to flatten each facet to one solid tone while keeping the silhouette and folded-ribbon negative space. Delivered `artaveo-mark-flat.svg`, `artaveo-mark-mono-white.svg`, `artaveo-mark-mono-black.svg`. Traced mark-only (never included a wordmark), so these also satisfy the roadmap's separate "mark-only lockup" row. Legibility verified at 32px and 16px (favicon range).

**Verification note.** `pnpm build` in this environment fails on the `next/font` Google Fonts fetch (network sandbox doesn't allow `fonts.googleapis.com`) — unrelated to these changes but means `/design-system` couldn't be visually verified end-to-end here. Token values were instead verified by converting OKLCH → sRGB and rendering static swatches directly.

---

**Favicon / app icons / OG image, header wiring, clear-space, semantic colours, typography, imagery, iconography, motion (§ 4.1.3, this session).** Full detail lives in `docs/design/art-direction.md` under "§4.1.3"; summary:

- Built favicon (`public/artaveo-icon.svg`, scheme-aware, plus `app/favicon.ico`), `app/apple-icon.png`, PNG fallbacks, PWA icons (`app/manifest.ts`), and a static Open Graph image (`public/brand/og-image.png`) — all from the *temporary* placeholder mono mark, per the roadmap's explicit instruction to wire it into real UI now rather than leave the slot empty. `app/layout.tsx` now exports `icons`/`manifest`/`openGraph`/`twitter` metadata.
- Replaced the literal "A" placeholder `<span>` in the header and footer with `components/site/artaveo-mark.tsx`, a theme-aware component using the same temporary mono mark.
- Verified with a real `pnpm install` + `pnpm build` (Turbopack) + `tsc --noEmit`, both clean — the Google Fonts fetch block is the only failure, and it's the pre-existing sandbox limitation noted above, not something this session introduced. (Confirmed by temporarily stubbing the three `next/font/google` calls, rebuilding successfully, and checking the rendered `<head>` for the expected icon/manifest/OG tags before reverting the stub.)
- Found and fixed a real bug along the way: Next's `metadata.icons` export and the `app/icon.svg` file-convention both target the same `<link rel="icon">` slot but don't compose — declaring `icons` explicitly drops the file-convention's link, and re-listing the same URL under the `app/icon.svg` name still gets silently dropped. Fix was moving the SVG out of `app/` entirely (`public/artaveo-icon.svg`) and referencing it as a plain path.
- Audited semantic colours (`--success`/`--info`/`--destructive`/`--chart-4`/`--chart-5`) against the corrected gold hue — the "New debt" item below turned out not to need any token change (see art-direction.md for the hue-separation numbers and rendered swatches).
- Found and fixed inconsistent icon RTL-mirroring across six components (`site-header.tsx`, `mobile-nav.tsx`, `site-footer.tsx`, `command-palette.tsx`, `buttons-section.tsx`, `cards-section.tsx`) that had the `data-icon`/mirroring pattern in some places but not others.
- Added `--ease-standard`/`--ease-emphasized` motion tokens to `app/globals.css`, plus an RTL letter-spacing safety net (the Latin "wide-tracked label" treatment used throughout — wordmark, eyebrows — breaks Arabic-script joining if it ever reaches Persian text).

**A note on the favicon-source contradiction.** This session's own "New debt" note below (from the prior session) said the favicon/icons "must be built from the *approved-shape* files, not the current temporary" ones. `ROAD-MAP-ARTAVEO.md` § 4.1.3, however, explicitly and emphatically instructs the opposite — use the named temporary files for exactly this purpose, with a one-line note wherever they're wired in. This session followed the roadmap (the more specific, more recent, bolded instruction) over the earlier debt note, and added the requested notes at every wiring point (`app/layout.tsx`'s `icons` and `openGraph` comments, `components/site/artaveo-mark.tsx`, `public/artaveo-icon.svg`). Flagging the contradiction explicitly rather than silently picking one — worth the owner's attention alongside D-12.

## Decisions

- **D-12**: not resolved. Both sessions produce derived tokens and variants for the owner to review, per the decision's own text. Nothing here is approved until confirmed.
- **New, unlogged decision point**: after § 4.1.2 was delivered, four additional AI-generated files were added to `Data/` and explicitly installed as temporary replacements for the flat/monochrome mark files, despite differing in silhouette from the D-12-approved mark (see Known Issues). This was an explicit instruction to unblock downstream work rather than wait for a corrected asset — recorded here since it means the currently-installed flat/mono files are **not** the approved design.
- **D-03** (numeral and icon-mirroring rules): this session recorded the rule text (Persian digits in prose / Latin digits in code, directional-vs-brand icon mirroring) in `docs/design/art-direction.md` for Phase 5.3 to consume. Not implemented in code yet — no Persian content exists in the codebase to apply it to.

## Changed files

```
app/globals.css                                          --brand, --brand-foreground, --brand-muted, --warning,
                                                           --warning-foreground, --ring updated/decoupled (both themes);
                                                           § 4.1.3: --ease-standard/--ease-emphasized tokens, RTL
                                                           line-height + letter-spacing safety net, ease-standard
                                                           applied to existing transitions
components/ui/badge.tsx                                   brand-soft variant text colour fixed
docs/design/art-direction.md                              new (§ 4.1.1/4.1.2), extended with §4.1.3's full output
docs/phases/PHASE-4.1-README.md                           new — this file
public/brand/artaveo-mark-flat.svg                        new — flat mark, approved-logo geometry, official colours
public/brand/artaveo-mark-mono-white.svg                  new, then overwritten with TEMP placeholder (see below)
public/brand/artaveo-mark-mono-black.svg                  new, then overwritten with TEMP placeholder (see below)
public/brand/artaveo-mark-mono-white-approved-shape-REFERENCE.svg   new — backup of the correct-shape mono white
public/brand/artaveo-mark-mono-black-approved-shape-REFERENCE.svg   new — backup of the correct-shape mono black
public/brand/artaveo-mark-flat-light.svg                  new — TEMP placeholder (see Known Issues)
public/brand/artaveo-mark-flat-dark.svg                   new — TEMP placeholder (see Known Issues)

— § 4.1.3, this session —
app/layout.tsx                                            icons/manifest/openGraph/twitter metadata added
app/manifest.ts                                            new — PWA manifest route
app/favicon.ico                                            new — built from the TEMP mono mark
app/apple-icon.png                                         new — built from the TEMP mono mark
public/apple-icon.png                                      deleted — stale v0-default placeholder
public/icon.svg                                             deleted — stale v0-default placeholder
public/artaveo-icon.svg                                    new — scheme-aware favicon, built from the TEMP mono mark
public/icon-{light,dark}-{16,32}x{16,32}.png               new/regenerated — favicon PNG fallbacks
public/icon-192.png, icon-512.png, icon-512-maskable.png   new — PWA icons
public/brand/og-image.png                                  new — static Open Graph image
components/site/artaveo-mark.tsx                           new — theme-aware header/footer mark component
components/site/site-header.tsx                            "A" placeholder → ArtaveoMark; ArrowRight RTL fix
components/site/site-footer.tsx                             "A" placeholder → ArtaveoMark; ArrowUpRight RTL fixes
components/site/mobile-nav.tsx                              ArrowRight RTL fix
components/site/command-palette.tsx                         ArrowUpRight RTL fix
components/showcase/buttons-section.tsx                     ArrowRight RTL fix
components/showcase/cards-section.tsx                       ArrowUpRight RTL fixes (×2)
```

## Known issues

**The four active flat/monochrome mark files do not match the D-12-approved logo's silhouette.** `public/brand/artaveo-mark-flat-light.svg`, `artaveo-mark-flat-dark.svg`, `artaveo-mark-mono-white.svg` and `artaveo-mark-mono-black.svg` were traced from four AI-generated files added to `Data/` (`Flat Gold and Charcoal A Emblem.png`, `Geometric Charcoal and Gold Ribbon Emblem.png`, `Monochrome Angular A Logo.png`, `Abstract White Ribbon A Emblem.png`), not from the approved master (`artaveo-master-reference.png`). All four add a separate, detached quadrilateral "flag" shape at the bottom-right of the "A" that the approved logo's continuous folded-ribbon silhouette does not have — this is a different design, not a flat/mono rebuild of the approved one, which is what roadmap § 4.1.2 calls for. They were installed anyway, on explicit instruction, as temporary placeholders so favicon/icon/UI work isn't blocked. Full detail, the light/dark role-assignment guess, and the exact swap-back list are in `docs/design/art-direction.md` under "Known Issues — temporary placeholder mark files."

The correct-shape files are preserved and not deleted: `artaveo-mark-flat.svg` (single flat variant) and the two `*-approved-shape-REFERENCE.svg` files.

**`--brand` supersession risk.** Two different gold values were produced in this same session (`#D6963D` measured, then `#D4A24C` official) before the codebase was ever committed with either — worth double-checking no other file still references the intermediate value if this doc is read out of order.

## New debt

- No formal decisions log exists yet (`docs/decisions.md`) to record the D-12 partial status and the temporary-placeholder substitution outside of these two markdown files.
- Full WCAG AA contrast audit (Phase 4.2/P1-A) — §4.1.3 found two borderline pairs while auditing hue-competition (light-theme `success`/`info` text-on-fill, 3.29:1/3.73:1, below the 4.5:1 text threshold) worth adding to that phase's list.
- `page-transition.tsx` hasn't been checked against §4.1.3's motion principles (works-without-motion, no motion-only affordances) and doesn't yet use the new `ease-emphasized` token.
- Architecture-diagram visual style (one of §4.1.3's imagery rules) is specified but has no component yet to apply it to.
- The two flat mark files (`artaveo-mark-flat-light.svg` / `-dark.svg`) share the exact same charcoal fill despite their names — the "-dark" one would be invisible on a dark surface. Not used anywhere that would expose this (this session used the mono files for anything theme-switching), but worth fixing whenever the temp files are next touched.

## Rollback

Revert `app/globals.css`, `components/ui/badge.tsx`, and `app/layout.tsx` to restore the Phase-1 blue brand token and pre-§4.1.3 metadata. Delete the `public/brand/artaveo-mark-*` files, `public/artaveo-icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `app/manifest.ts`, `components/site/artaveo-mark.tsx`, and the generated icon PNGs to remove everything added across both sessions; the three originally-received lockups (`artaveo-lockup-*.png`) are untouched throughout.

## Final status

**PARTIAL.** Colour tokens corrected and reconciled against an owner-supplied reference; all four of the roadmap's logo-variant slots are filled (correct-shape versions preserved, temporary placeholders now wired into real, visible UI); all of § 4.1.3 (favicon/icons, header wiring, clear-space, semantic-colour audit, typography, imagery, iconography, motion) is delivered and documented in `docs/design/art-direction.md`. What remains: D-12 owner sign-off, the placeholder swap-back once a corrected mark arrives, and the small follow-ups listed under "New debt" above.
