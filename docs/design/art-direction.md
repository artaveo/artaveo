# Art Direction — Derived Brand System (Phase 4.1)

## Status: PARTIAL — tokens, logo variants, and all §4.1.3 items (favicon/header wiring, clear-space, semantic colours, typography, imagery, iconography, motion) delivered; owner (D-12) approval still open

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

> **Resolved 11 Sep 2026 — see `ROAD-MAP-ARTAVEO.md` § 4.1.2.** The corrected mark PNGs (7 variants, connectivity-verified except `artaveo-mark-mono-white.png` which still has the disconnected-facet defect — its SVG was built from the verified-correct `mono-black` silhouette instead) replaced the placeholder sheet described below. All items in the "places that need to be swapped back" list further down were swapped: the four `public/brand/artaveo-mark-*.svg` files, the favicon/app-icon set, and `components/site/artaveo-mark.tsx`. Still outstanding: `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `public/brand/og-image.png` — these still reference the old trace and are new debt for a follow-up pass. The historical record below is kept as-is per the roadmap's numbering/history rule.

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

**Swap-back status (updated 11 Sep 2026):**
- ✅ `public/brand/artaveo-mark-flat-light.svg`
- ✅ `public/brand/artaveo-mark-flat-dark.svg`
- ✅ `public/brand/artaveo-mark-mono-white.svg` (built from the verified `mono-black` silhouette — the source PNG itself is still defective, SVG is correct)
- ✅ `public/brand/artaveo-mark-mono-black.svg`
- ✅ `public/artaveo-icon.svg`, `public/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/apple-icon.png`, `public/icon-{light,dark}-{16,32}x{16,32}.png`
- ❌ still on the old trace: `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/brand/og-image.png`
- ✅ `components/site/artaveo-mark.tsx` — both inline `<path>` values swapped.

## §4.1.3 — Favicon/header wiring, clear-space, semantic colours, typography, imagery, iconography, motion

Everything in this section was built and verified against a real `pnpm build` (Turbopack) plus `tsc --noEmit`, both clean — the only build warning is the pre-existing, unrelated Google Fonts fetch block in this sandbox (see "Still open" below), not anything introduced here.

### Favicon / app icons / Open Graph image — now wired into real UI

Per the roadmap's explicit instruction, these were originally built from the **temporary placeholder mark** (`artaveo-mark-mono-black.svg` / `artaveo-mark-mono-white.svg`, see "Known Issues" above), not the approved-shape reference files — deliberately, so the slot isn't left empty while the corrected mark is pending. **Resolved 11 Sep 2026:** `public/artaveo-icon.svg`, `public/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/apple-icon.png`, the four `icon-{light,dark}-{16,32}x{16,32}.png` fallbacks, and the `components/site/artaveo-mark.tsx` header/footer component now all use the corrected geometry; the "temporary" code comments were updated accordingly. `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `og-image.png` were not part of that pass and still carry the old trace.

| File | Built from | Notes |
|---|---|---|
| `public/artaveo-icon.svg` | mono-black + mono-white | Scheme-aware favicon; swaps via `prefers-color-scheme` inside the SVG. **Deliberately outside `app/`** — see the code comment in `app/layout.tsx` for why `app/icon.svg` doesn't work once `metadata.icons` is declared explicitly (verified against a clean build: the file-convention link is silently dropped, even when re-declared under the same `app/icon.svg` name in the `icons` export — moving the file out of `app/` was the only fix that worked). |
| `app/favicon.ico` | mono-black (16px) + mono-black (32px) | Multi-resolution `.ico`, auto-detected by Next's file convention. |
| `app/apple-icon.png` | mono-white on `#1A1A1A` | 180×180, opaque background (Apple ignores/mishandles alpha). |
| `public/icon-{light,dark}-{16,32}x{16,32}.png` | mono-black / mono-white | Transparent PNG fallbacks, `media`-scoped in `metadata.icons` for browsers that ignore SVG favicons. |
| `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` | mono-white on `#1A1A1A` | PWA/manifest icons, referenced from the new `app/manifest.ts`. |
| `public/brand/og-image.png` | mono-white mark + wordmark | 1200×630, static PNG (not a dynamic `next/og` route — this sandbox can't fetch the runtime font it would need; a static render was the reliable choice). Referenced from both `openGraph.images` and `twitter.images`. |

`app/layout.tsx` now exports `icons`, `manifest`, `openGraph`, and `twitter` metadata. `metadataBase` is deliberately **not** set — no production domain exists yet (D-01 open); set it once the domain lands so social crawlers resolve the image URLs as absolute rather than relative to whatever host happens to serve the build.

**The literal "A" placeholder box** in the header and footer (a `<span>` with a background colour and the letter "A") is now `components/site/artaveo-mark.tsx` — the same temporary mono mark, swapped via Tailwind's `dark:` variant (the app's `.dark`/`.light` class toggle, not a media query, since theme is a manual user choice here). Mono was chosen over the flat charcoal+gold variant deliberately: the two flat files (`-light`/`-dark`) share the *exact same* charcoal fill despite their names, so the "dark" one is invisible on a dark header — a bug in the temp asset set worth flagging now rather than silently working around later.

### Clear-space and minimum-size rules

Measured against the current mark (mono-black, at a 1000×1000 render, trimmed to ink): the mark's own silhouette fills its full viewBox width and **81.4% of its viewBox height** — i.e., a roughly 1.23:1 (wide-ish) shape, not a square. Clear-space and minimum-size rules below are expressed as a ratio of the mark's own measured height (call it `H`) rather than fixed pixels, so they carry over automatically once the approved-shape mark replaces the temporary one (its proportions will differ slightly).

- **Clear space, mark alone:** ≥ 0.25×`H` of empty space on all four sides before any other UI element, text, or the artwork's own container edge.
- **Clear space, mark + wordmark lockup:** ≥ the wordmark type's cap-height on all sides (matches common lockup practice and scales automatically with the type size actually used, e.g. the header's `text-sm`).
- **Minimum size, mark-only:** 32px height. Verified by rendering both sizes used in this codebase: at 32px (`public/icon-light-32x32.png`) the ribbon-fold negative-space detail that makes the mark distinctive is legible; at 16px (`public/icon-light-16x16.png`) that detail is lost and the mark reads as a plain solid triangle. **16px is acceptable only where the mark is functioning as a coloured dot** (browser-tab favicon slot, alongside dozens of other tabs) — not for an app icon, print, or anywhere the ribbon-fold detail is doing brand-recognition work.
- **Minimum size, mark + wordmark lockup:** the current header treatment (`size-7` mark ≈ 28px + gap + `text-sm tracking-[0.2em]` wordmark) is the tested floor; going narrower starts crowding the wordmark's own letter-spacing.

### Semantic colours vs. the corrected gold — audited, no change needed

`--warning` was already shifted from hue 70 → 40 in an earlier session specifically to stop clashing with gold (hue 79). This session checked the three tokens that earlier session flagged as *not* re-evaluated — `--success` (hue 150), `--info` (hue 240), `--destructive` (hue 27) — against the corrected gold:

- Hue separation from gold (79°): success 71° apart, destructive 52° apart, info ~161° apart. All comfortably clear of the ~30–40° range where two colours start reading as "the same hue, different mood."
- Rendered as flat swatches (brand/success/warning/info/destructive, both themes) side by side: gold, green, orange-red, blue, red — visually distinct with no pairwise competition.
- `--chart-4` (hue 300) and `--chart-5` (hue 260, near-neutral) — the two other tokens the earlier session flagged as unevaluated — are equally far from gold; no change needed there either.

**Conclusion: no token changes.** The existing success/info/destructive/chart-4/chart-5 values already sit comfortably alongside the corrected gold; only warning ever needed the fix it already got. (A full WCAG contrast pass for every text/background pairing — as opposed to this hue-competition check — remains Phase 4.2/P1-A's job, not this section's; two pairs measured here as a side effect, light-theme `success`-text-on-`success`-fill at 3.29:1 and `info`-text-on-`info`-fill at 3.73:1, are below the 4.5:1 AA text threshold and should be on that phase's list.)

### Typography pairing

- **Latin display/label face:** Geist Mono, uppercase, wide tracking (`tracking-widest` / `tracking-[0.2em]`) — not a new font import. This formalizes a pattern the codebase already used everywhere before this session (the wordmark itself, every section eyebrow, nav microcopy) into an explicit rule: it's the direct echo of the wordmark's own "geometric, wide-tracked" character the roadmap asked for, so no new typeface was needed. **Reserved for short labels only** — never body copy, never a full sentence.
- **Latin text face:** Geist Sans — body copy, headings, UI chrome. Unchanged, already the site default.
- **Persian face:** Vazirmatn, applied via `:where([dir='rtl']) body`. This session added `line-height: 1.7` to that same rule (was inheriting Tailwind's Latin-tuned default) — Vazirmatn's taller x-height and heavier diacritics need more vertical room at the same font-size than Geist Sans does.
- **The Latin display treatment must never apply to Persian text** — letter-spacing breaks Arabic-script letter joining, so a tracked-out Persian eyebrow wouldn't just look different, it would render as disconnected, wrong-shaped letterforms. Added a safety net in `globals.css`: `:where([dir='rtl']) * { letter-spacing: normal !important; }`. This is deliberately blunt (an unconditional reset, not a scoped exception) because Persian content doesn't exist in the codebase yet (Phase 5.3) — when it lands, any component that still carries a `tracking-*` utility inside an RTL subtree needs to fail safe automatically rather than depend on every future author remembering the rule.
- **Numerals (per D-03, recorded here for Phase 5.3 to consume, not implemented yet — no Persian content exists to apply it to):** Persian digits in prose for the `fa` locale; Latin digits in code, IDs, technical values, URLs, and e-mail addresses regardless of locale.
- **The wordmark itself is Latin-only and never mirrors/reflows in RTL** — added `dir="ltr"` explicitly to all five places it renders (`site-header.tsx`, `site-footer.tsx`, `mobile-nav.tsx`, `showcase-header.tsx`, `design-system/page.tsx`). Unicode's bidi algorithm already keeps a Latin run's internal character order correct inside RTL flow, so this wasn't fixing visibly broken output — it's a defensive pin against bidi edge cases (adjacent punctuation/numbers reordering unpredictably) once real Persian copy surrounds it in Phase 5.

### Imagery rules

- Product screenshots only inside a consistent frame (browser/device chrome), populated with **demo data only** (per D-06) — never real client data.
- Architecture diagrams in one consistent visual style: line-based, charcoal/gold, echoing the mark's own facet geometry — not generic colourful boxes-and-arrows clip art. (No diagram component exists yet to enforce this against — flagging the rule now so the first one built follows it, rather than setting a precedent to unwind later.)
- No stock photography of people, anywhere. The site's whole positioning (`siteConfig.description`: "the work of one independent full-stack developer") is undercut by a generic "smiling team" stock photo.
- No AI-generated images depicting fictional products, people, or team members standing in for real work. Real case studies (with D-06 consent) or real diagrams/screenshots only.
- The one deliberate exception is the Open Graph image itself: brand typography + the mark on a flat colour field is compositional graphic design, not photography or a fictional product shot, so it doesn't conflict with the rule above.

### Iconography

One set only — `lucide-react` (confirmed: nothing else is imported anywhere in `components/` or `app/`). Rules, formalized from the sizes/patterns already in use across the codebase (not a new scale invented from scratch):

- **Stroke width:** library default (2) at every size in use. Never overridden per-instance — a mixed-stroke icon set would read as inconsistent next to the mark's own uniform facet lines.
- **Size scale:** `size-3` (12px, inline meta links), `size-3.5` (14px, breadcrumb separators / footer link arrows), `size-4`/default (16px, standard button and nav icons), `size-5` (20px, larger accents). Pick from this scale rather than an arbitrary pixel value.
- **RTL mirroring list** (per D-03/§5.3: "directional icons mirror, brand/media icons never do") — this session found and fixed several inconsistent spots where the pattern existed in some components but not others (`site-header.tsx`, `mobile-nav.tsx`, `site-footer.tsx`, `command-palette.tsx`, and the showcase gallery's `buttons-section.tsx`/`cards-section.tsx` all had at least one `ArrowRight`/`ArrowUpRight` missing its RTL class):
  - **Forward-action arrows** (`ArrowRight`, "continue/go") → `rtl:rotate-180`.
  - **External/away arrows** (`ArrowUpRight`, external links and "view case study" links) → `rtl:-scale-x-100`, not `rotate-180` — a rotated arrow would point down-left in RTL, which reads wrong for "opens elsewhere"; a horizontally-flipped one still points up and away, which is the intent.
  - **Step/breadcrumb separators** (`ChevronRight`) → `rtl:rotate-180` (breadcrumb.tsx already had this right — no fix needed there).
  - **Leading, non-directional icons** (`Code`, `Plus`, `LoaderCircle`, `Search`, used via `data-icon="inline-start"`) → never mirror.
  - **The Artaveo mark itself and any future social-platform icons** → never mirror, per the same D-03 rule.
  - `data-icon="inline-start"`/`"inline-end"` are logical (start/end), already correct in both directions for spacing/order; only the icon's own glyph sometimes additionally needs an explicit `rtl:` class, and only when it's genuinely directional.

### Motion principles

Two easing curves, added as real theme tokens in `app/globals.css` (`--ease-standard`, `--ease-emphasized` under `@theme inline`, which Tailwind v4 turns into `ease-standard`/`ease-emphasized` utilities):

- **`ease-standard`** (`cubic-bezier(0.4, 0, 0.2, 1)`) — the default for ordinary UI transitions: colour, opacity, small transforms on hover/focus/state change. Applied to the header's existing `transition-colors` and to the theme-toggle body transition (previously plain `ease`).
- **`ease-emphasized`** (`cubic-bezier(0.2, 0, 0, 1)`) — reserved for entrance/emphasis motion (page transitions, command palette / sheet opening) where a snappier deceleration should read as more intentional. Not yet applied anywhere — `page-transition.tsx` should adopt it as a follow-up rather than inventing a third curve.
- **Durations:** reuse Tailwind's existing scale rather than inventing custom values — `duration-150` for micro-interactions (hover colour/opacity), the implicit ~200ms default for standard state changes, 300ms+ reserved for whole-surface changes (the theme swap already uses `0.3s`).
- **What may animate:** colour, opacity, and transform (translate/scale/rotate) only. Layout-triggering properties (width, height, top, left) should use transform instead, for performance.
- **What must not animate:** the mark's rim-light/glow is explicitly a *static* design detail, not a hover effect — a future request to "make the logo shine on hover" goes against this principle and should be pushed back on, not implemented.
- **Reduced motion:** already enforced globally (`@media (prefers-reduced-motion: reduce)` collapses all animation/transition durations to ~0.01ms). The corollary principle: **the design must stand without motion** — nothing should be motion-only. A control that only reveals itself via an animated hover has no static affordance and fails this rule; not audited component-by-component this session, flagged as a follow-up (in particular, `page-transition.tsx` hasn't been checked against it).



Caught visually on the live site (Hero's "Available for new projects" badge and Featured Work's category tag, both `<Badge variant="brand-soft">`): readable in light theme, unreadable in dark theme. Root cause: `brand-soft`'s background is a **translucent** tint (`bg-brand/10`, 10% opacity over whatever's behind it), so its effective colour follows the page background per theme — light-ish in light theme, dark-ish in dark theme. Its text was `text-brand-foreground`, which this document deliberately fixed earlier to always be **dark** (correct for the *solid* `brand` badge, whose background is always light gold in both themes). Paired with a translucent background, that "always dark" text works in light theme (dark text on a light-tinted background) but fails in dark theme (dark text on a dark-tinted background) — measured contrast **1.05:1**, effectively invisible.

**Fix:** `brand-soft` now uses `text-foreground` — the token that already flips correctly per theme (dark in light theme, light in dark theme) — instead of `text-brand-foreground`. Measured contrast is now 16.4:1 (light theme) and 15.6:1 (dark theme). The small `bg-brand` dot inside the badge still carries the actual brand colour; only the label text changed. `success`/`info`/`destructive`'s soft variants use the same translucent-background pattern but keep `text-{color}` (not `text-{color}-foreground`) directly — checked their contrast in both themes (3.1–7.0:1) and none reproduce this failure, because those base colours (unlike gold) are mid-toned enough to still work as literal text against both a light-tinted and a dark-tinted background. Gold's own lightness (L 0.74–0.8) is what makes it need this special-cased fix — nothing else on the token list needs the same change.

## Still open in 4.1 (not attempted this session)

- Optional "Full — Dark" lockup (not blocking).
- Full WCAG AA contrast audit for every text/background pair (Phase 4.2/P1-A's job) — §4.1.3 only checked hue-competition against gold, and incidentally found two borderline pairs (light-theme `success`/`info` text-on-fill, 3.29:1 / 3.73:1) worth putting on that list.
- `page-transition.tsx` hasn't been checked against §4.1.3's "must work with motion off" / "no motion-only affordances" rules, and doesn't yet use the new `ease-emphasized` token.
- D-12 owner sign-off on everything in this document, including §4.1.3.

## Decisions touched

- **D-12**: not resolved by this session. This produces the derived tokens and remaining variants for the owner to review, per the decision's own text ("Phase 4.1 derives tokens and missing variants from it instead of proposing options from scratch; the owner approves the derived light-theme wordmark, the simplified mark and the favicon in 4.1"). Nothing here should be treated as approved until the owner confirms.
- **D-03**: §4.1.3's typography section records the numeral rule (Persian digits in prose, Latin digits in code/IDs/technical values) and the icon-mirroring rule (directional icons mirror, brand/media icons never do) for Phase 5.3 to consume — not implemented yet, since no Persian content exists in the codebase to apply either rule to.
