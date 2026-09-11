# Art Direction — Derived Brand System (Phase 4.1)

## Status: PARTIAL — tokens + missing logo variants delivered; owner (D-12) approval and remaining 4.1.3 items still open

## Objective

Derive the design system from the approved Artaveo mark (received 10 Sep 2026) instead of proposing new direction options: measure real colour tokens from the supplied files, fill in the logo variants the supplied renders don't cover (flat, monochrome, mark-only), and record what still blocks D-12 sign-off.

## Scope

In scope this session:
1. Verify the state of `public/brand/` against what the roadmap recorded.
2. Measure colour tokens directly from the supplied logo files (not eyeballed).
3. Build the three still-needed logo variants (§4.1.2): flat/simplified mark, monochrome mark, mark-only lockup.
4. Wire the measured brand colour into `app/globals.css` and resolve the token conflict this surfaced.

Out of scope (left for later 4.1 sessions or later phases, not started here): favicon/app-icon/OG-image files, clear-space and minimum-size rules, typography pairing, imagery rules, iconography mirroring list, motion principles, and the full AA contrast audit (P1-A, formally Phase 4.2 — this session only fixed the one concrete violation its own change introduced).

## Findings vs. the roadmap's recorded state

**`public/brand/` folder placement.** The roadmap (§4.1) flagged all three lockup files as misplaced inside `source/`. On inspection they were already correctly placed — `artaveo-lockup-full-light.png`, `-compact-dark.png`, `-compact-light.png` sit directly in `public/brand/`, and only `artaveo-master-reference.png` is in `source/`. No action needed; this line item in the roadmap is stale.

**Transparency claim.** The roadmap describes all three lockups as having "real transparency, no white/black fringe." Checked file modes directly:

| File | Mode | Real transparency? |
|---|---|---|
| `artaveo-lockup-compact-dark.png` | RGBA, alpha varies 0–255 | ✅ Yes |
| `artaveo-lockup-full-light.png` | RGB, no alpha channel | ❌ No — white background baked in |
| `artaveo-lockup-compact-light.png` | RGB, no alpha channel | ❌ No — white background baked in |

Only the compact-dark file is actually usable anywhere the background isn't white. This session used it as the source for isolating the mark (clean alpha-based crop), since the other two would require background keying with edge-fringe risk. **Open debt:** if the full-light and compact-light lockups are needed on non-white surfaces later, they should be re-exported with real alpha from source, not keyed out of the current PNGs.

## Colour tokens — measured, not estimated

Sampled directly from `artaveo-lockup-compact-dark.png` (the one file with clean alpha), classifying opaque pixels into the charcoal facets vs. the gold facet:

| Token | Hex (measured) | OKLCH |
|---|---|---|
| Charcoal — shadow facet | `#282F36` | `oklch(0.301 0.016 248)` |
| Charcoal — base facet | `#333940` | `oklch(0.342 0.015 252)` |
| Charcoal — highlight facet | `#52575F` | `oklch(0.455 0.015 260)` |
| Gold — shadow | `#B17329` | `oklch(0.608 0.117 67)` |
| Gold — base facet | `#D6963E` | `oklch(0.720 0.128 72)` |
| Gold — highlight | `#FAEDC1` | (near-white gold, rim-light only — not used as a fill token) |

**Confirms roadmap §4.1.1's estimate was close but not exact:** the measured gold (`#D6963E`, hue 72) sits inside the roadmap's guessed `#C68B4B`–`#CD9E57` range. The charcoal, however, is not neutral — it carries a consistent cool/blue hue (~250–260 in OKLCH), not the neutral tone the roadmap assumed. This is good news: Phase 1's existing `--primary` token (`oklch(0.24 0.014 262)`) already sits in that same blue-charcoal hue family, so the mark's charcoal and the site's existing neutral scale agree without needing to shift Phase 1's tokens.

**AA check on the gold (per roadmap's own warning, verified with real contrast math):**

| Pair | Contrast ratio |
|---|---|
| Gold on white | 2.53 |
| Gold on near-black | 7.09 |

Confirms the roadmap's caution: gold fails AA (needs ≥4.5 for text, ≥3 for large text/UI) as a text or fill colour on light surfaces. It only works as light-on-dark, or as a small accent (icon, border, underline) on light surfaces — never as the text colour itself on a light background.

## `app/globals.css` changes

`--brand` was still the v0 scaffold blue (`oklch(0.55 0.16 256)`, both themes) — never updated to the approved gold. Changed:

- **`--brand`** → `oklch(0.72 0.128 72)` light / `oklch(0.78 0.13 72)` dark (measured gold).
- **`--brand-foreground`** → `oklch(0.25 0.05 70)` light / `oklch(0.2 0.05 70)` dark — **dark**, not light. The old value (`oklch(0.985 ...)`, near-white) was correct for the old blue (medium-dark, L 0.55) but would fail badly against the new gold (light, L 0.72). Dark-theme `--brand-foreground` was already dark before this change and needed no fix — same "light chip, dark text" pattern this now applies to light theme too.
- **`--brand-muted`** → `oklch(0.95 0.035 72)` light / `oklch(0.32 0.06 72)` dark.
- **`--warning`** → moved from hue 70 to hue 40 (light: `oklch(0.7 0.18 40)`, dark: `oklch(0.76 0.18 40)`). At hue 70, `--warning` was visually indistinguishable from the new gold brand accent (both land in the same amber family — confirmed by rendering both as swatches). Shifted toward red-orange so a warning badge and a brand accent don't read as the same colour. `--chart-3`, which mirrored `--warning`, was moved the same way.
- **`--ring`** deliberately **not** changed. It was hard-coded to the same value as the old `--brand`; decoupled so it keeps its own accessible blue-charcoal value regardless of what `--brand` becomes — gold fails the 3:1 non-text contrast minimum a focus ring needs against light surfaces, so tying focus visibility to the brand accent would have made keyboard focus harder to see.

**Component fix required by the above:** `components/ui/badge.tsx`'s `brand-soft` variant rendered gold text (`text-brand`) directly on a 10%-opacity gold-tinted background — contrast ≈2.3, well under AA. Changed to `text-brand-foreground`, mirroring the pattern the `warning` variant already used for exactly this reason. This is the one contrast fix made in this pass; the systematic pair-by-pair audit is still Phase 4.2 (P1-A).

Verification note: `pnpm build` in this sandbox fails on the `next/font` Google Fonts fetch (`fonts.googleapis.com` is outside the sandbox's network allowlist) — unrelated to these changes. Token values were instead verified by converting each OKLCH value to sRGB and rendering static swatches directly (see contrast table above); the design-system page itself should be checked visually in an environment with normal network access before this is signed off.

## Logo variants delivered (§4.1.2)

Built from `artaveo-lockup-compact-dark.png`'s alpha channel: isolated the mark, traced the silhouette and the gold facet separately (potrace), and composed flat vector fills — no gradients, bevels, or rim-light, per the roadmap's instruction to flatten each facet to one solid tone while keeping the silhouette and the folded-ribbon negative space.

| File | Description |
|---|---|
| `public/brand/artaveo-mark-flat.svg` | Flat/simplified mark — charcoal `#2C3239` + gold `#D6963D` (matches `--brand` exactly), two solid fills, no wordmark |
| `public/brand/artaveo-mark-mono-white.svg` | Monochrome, pure white — for dark surfaces |
| `public/brand/artaveo-mark-mono-black.svg` | Monochrome, near-black (`#151515`) — for light surfaces |

The rim-light sliver visible in the original render (a thin highlight along one edge, separate from the main gold facet) was deliberately excluded from the flat trace — it's a lighting artifact of the 3D render, not a structural facet, and the roadmap explicitly calls for removing rim-light glow in the flat version.

Because these were traced mark-only (the wordmark was never part of the crop), they also satisfy the roadmap's separate "mark-only lockup" row — no further cropping needed.

**Tested at UI sizes:** both monochrome variants stay legible as a recognisable "A" at 32px and 16px (favicon range); the negative-space triangle (the ribbon fold) starts to merge with the outer strokes at 16px but the shape doesn't collapse into a blob.

## Update — owner reference sheet supersedes the measured colours

`Data/ChatGPT Image Sep 11, 2026, 01_24_12 AM.png` — a 9-panel brand reference sheet (main logo dark/light, flat/simple version, monochrome white/black, icon-only, compact lockup, favicon examples on six backgrounds, and a labelled brand-colour swatch) — turned up in the repo after the above was written. It labels the brand colours explicitly:

| | Hex | OKLCH |
|---|---|---|
| Charcoal | `#1A1A1A` | `oklch(0.218 0.000 90)` — genuinely neutral, zero chroma |
| Gold | `#D4A24C` | `oklch(0.743 0.119 79)` |
| Light | `#F8F9FA` | `oklch(0.982 0.002 248)` |

**This supersedes the colours measured earlier in this document.** The earlier charcoal (`#333940`, hue ~250–260) was sampled from the glossy 3D render's shaded facets — that cool tint turns out to be the render engine's lighting, not the brand's intended flat colour. This sheet's charcoal is genuinely neutral (chroma 0), which actually matches the roadmap's original §4.1.1 guess (`#353535`) better than this document's own pixel-sampling did. The gold barely moves (`#D6963D` measured → `#D4A24C` official, ~2% difference).

**What changed as a result:**
- `artaveo-mark-flat.svg` — fills updated: charcoal `#2C3239` → `#1A1A1A`, gold `#D6963D` → `#D4A24C`.
- `artaveo-mark-mono-black*.svg` — near-black fill unified to `#1A1A1A` instead of a separately-eyeballed `#151515`.
- `app/globals.css` — `--brand` (light `oklch(0.74 0.12 79)`, dark `oklch(0.8 0.12 79)`) and `--brand-foreground`/`--brand-muted` recomputed at hue 79 instead of 72. The AA finding (gold fails as text/fill on white, needs a dark foreground) still holds — contrast is ~2.3 vs white either way — so the `--ring`/`badge.tsx` fixes from before are unaffected.
- `--warning` (hue 40) stays clearly separated from the corrected gold hue (79 vs 40) — no clash, no change needed.

**Not resolved by this:** the sheet is an AI-generated mockup (per its filename), not a vector deliverable — this session adopted its *colour values* (explicit labelled numbers) but kept the traced *geometry* from the approved master render, not this sheet's raster icon. **Still needs the owner's confirmation (D-12)** — it isn't certain this sheet reflects a final decision rather than one exploration among others.

## Known Issues — temporary placeholder mark files (do not treat as final)

Four additional files were added to `Data/` after the above (`Flat Gold and Charcoal A Emblem.png`, `Geometric Charcoal and Gold Ribbon Emblem.png`, `Monochrome Angular A Logo.png`, `Abstract White Ribbon A Emblem.png`). Compared against the D-12-approved master (`artaveo-master-reference.png`), all four share **a different silhouette from the approved mark**: they add a separate, detached quadrilateral "flag" shape at the bottom-right of the "A" that does not exist in the approved logo's continuous folded-ribbon silhouette. This is a different design, not a flat/mono rebuild of the approved one — the roadmap's §4.1.2 is explicit that none of the logo-system rows should be a new design.

**Per explicit instruction, these were still traced and installed as working placeholders** (official `#1A1A1A` / `#D4A24C` colours applied, approved-logo geometry not used) so favicon/icon/UI work isn't blocked waiting for a corrected asset:

| File | Source | Role |
|---|---|---|
| `public/brand/artaveo-mark-flat-light.svg` | `Data/Flat Gold and Charcoal A Emblem.png` | **TEMP** — flat mark, light-surface use |
| `public/brand/artaveo-mark-flat-dark.svg` | `Data/Geometric Charcoal and Gold Ribbon Emblem.png` | **TEMP** — flat mark, dark-surface use |
| `public/brand/artaveo-mark-mono-white.svg` | `Data/Abstract White Ribbon A Emblem.png` | **TEMP** — overwrote the approved-shape version |
| `public/brand/artaveo-mark-mono-black.svg` | `Data/Monochrome Angular A Logo.png` | **TEMP** — overwrote the approved-shape version |

The role assignment (which of the two colour files is "-light" vs "-dark") was my own labelling guess to match the requested four names — not stated anywhere in the source files, so confirm/correct it before it propagates further.

The pre-existing, approved-shape versions were **not deleted** — they're kept as:
- `public/brand/artaveo-mark-mono-white-approved-shape-REFERENCE.svg`
- `public/brand/artaveo-mark-mono-black-approved-shape-REFERENCE.svg`
- `public/brand/artaveo-mark-flat.svg` (single flat mark, correct silhouette — the flat-light/flat-dark split doesn't exist yet in the correct geometry)

**When the corrected replacement arrives, these are the places that need to be swapped back** (nothing currently downstream consumes the temp files yet, since favicon/app-icon generation is still an open 4.1.3 item — but flag this if that work starts before the swap happens):
- `public/brand/artaveo-mark-flat-light.svg`
- `public/brand/artaveo-mark-flat-dark.svg`
- `public/brand/artaveo-mark-mono-white.svg`
- `public/brand/artaveo-mark-mono-black.svg`
- any favicon / app-icon / Open Graph asset built from the four files above, once that work happens

## Post-delivery fix — `brand-soft` badge unreadable in dark theme

Caught visually on the live site (Hero's "Available for new projects" badge and Featured Work's category tag, both `<Badge variant="brand-soft">`): readable in light theme, unreadable in dark theme. Root cause: `brand-soft`'s background is a **translucent** tint (`bg-brand/10`, 10% opacity over whatever's behind it), so its effective colour follows the page background per theme — light-ish in light theme, dark-ish in dark theme. Its text was `text-brand-foreground`, which this document deliberately fixed earlier to always be **dark** (correct for the *solid* `brand` badge, whose background is always light gold in both themes). Paired with a translucent background, that "always dark" text works in light theme (dark text on a light-tinted background) but fails in dark theme (dark text on a dark-tinted background) — measured contrast **1.05:1**, effectively invisible.

**Fix:** `brand-soft` now uses `text-foreground` — the token that already flips correctly per theme (dark in light theme, light in dark theme) — instead of `text-brand-foreground`. Measured contrast is now 16.4:1 (light theme) and 15.6:1 (dark theme). The small `bg-brand` dot inside the badge still carries the actual brand colour; only the label text changed. `success`/`info`/`destructive`'s soft variants use the same translucent-background pattern but keep `text-{color}` (not `text-{color}-foreground`) directly — checked their contrast in both themes (3.1–7.0:1) and none reproduce this failure, because those base colours (unlike gold) are mid-toned enough to still work as literal text against both a light-tinted and a dark-tinted background. Gold's own lightness (L 0.74–0.8) is what makes it need this special-cased fix — nothing else on the token list needs the same change.

## Still open in 4.1 (not attempted this session)

- Favicon / app icons (light+dark) / Open Graph template built from the new flat/mono SVGs.
- Clear-space and minimum-size rules per lockup variant.
- Semantic-colour cohesion beyond the warning/brand fix above (success/info/destructive weren't re-evaluated against the new gold).
- Typography pairing (Latin display face + Persian face matched in optical size).
- Imagery rules, iconography RTL-mirroring list, motion principles.
- Optional "Full — Dark" lockup (not blocking).
- D-12 owner sign-off on everything above.

## Decisions touched

- **D-12**: not resolved by this session. This produces the derived tokens and remaining variants for the owner to review, per the decision's own text ("Phase 4.1 derives tokens and missing variants from it instead of proposing options from scratch; the owner approves the derived light-theme wordmark, the simplified mark and the favicon in 4.1"). Nothing here should be treated as approved until the owner confirms.
