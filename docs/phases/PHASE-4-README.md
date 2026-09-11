# PHASE 4 — Brand Identity & Design System Completion

## Status: IN PROGRESS — §4.1 complete (see `PHASE-4.1-README.md`); §4.2 (token refinement & design-system audit, closes P1-A) complete this session; §4.3–4.7 not started

## Objective

§4.2's objective per ROAD-MAP-ARTAVEO.md: close audit item P1-A — verify AA contrast of every token pair in both themes, confirm one focus-ring token is used everywhere, add the missing elevation/border/shadow/radius/z-index/motion tokens, add layout tokens (container, section-spacing rhythm, reading width for prose), confirm the responsive matrix is covered, and confirm components use logical properties only (no physical left/right).

## Scope

In scope this session: the full AA contrast pass across `app/globals.css` (both themes) and every component consuming those tokens; the z-index scale; the `section-y`/`section-y-compact` spacing tokens; the `--width-prose` token; a logical-properties sweep of `components/` and `app/`; and a keyboard/RTL/theme review of the four existing primitives (Button, Badge, Card, Input) referenced in §4.3.

Out of scope (deferred to their own sub-phases): §4.3 missing primitives, §4.4 patterns & states, §4.5 identity components, §4.6 visual pass on Shell & Home, §4.7 living documentation (`/design-system` already exists as the showcase but isn't yet the formal §4.7 deliverable).

## Method

Contrast was computed directly rather than eyeballed: a script converts every `oklch()` token in `:root`/`.dark` to linear sRGB (OKLab → LMS → linear RGB per the CSS Color 4 spec) and applies the WCAG relative-luminance contrast formula, including alpha-blended tint backgrounds (e.g. `bg-success/10` composited over `--background`) since several real usages are text-on-tint, not text-on-solid.

## Findings & fixes

**Real AA failures found (small/body text, needs ≥4.5:1):**

1. `text-brand` used as a literal text/icon colour in ~15 components (labels, eyebrows, icons, hover states, inline code-highlight) — measured **2.28:1** in light theme against `--background`/`--card` (the `--brand` token's own code comment already documented this constraint; usage had drifted past it).
2. Badge `success`/`info`/`destructive` variants (`text-{color}` on `bg-{color}/10`) — light theme **3.11 / 3.52 / 4.36**, all below the 4.5:1 small-text minimum (they'd only clear the 3:1 large-text minimum).
3. Badge `warning` variant (`text-warning-foreground`, a token designed for full-fill backgrounds, applied to a 15%-tint background) — dark theme **2.01:1**, the worst single failure found.
4. Button `destructive` variant — same raw-hue-on-tint pattern as (2): light **4.36**, dark **4.22**.
5. Hero code-panel syntax highlighting (`Kw`/`Str` in `components/home/hero.tsx`) used raw `text-brand`/`text-success` directly on `bg-card`/`bg-elevated` — light theme **2.24–3.43** depending on the pair.

**Fix.** Added five new tokens (`--brand-text`, `--success-text`, `--warning-text`, `--info-text`, `--destructive-text`) in both `:root` and `.dark` — same hue as their base token, lightness solved numerically so each clears 4.5:1 against `background`/`card`/`elevated` *and* against its own 10% tint, with margin. The base tokens (`--brand`, `--success`, etc.) are unchanged and remain fill-only (chips, dots, solid badges, borders) — never used as text going forward. Updated every real usage found: `badge.tsx` (success/warning/info/destructive variants), `button.tsx` (destructive variant), `hero.tsx` (Kw/Str), `forms-section.tsx` (success alert, unchanged — already-passing `text-destructive` on flat background left as-is to avoid unnecessary churn).

**Not a failure (verified, no change needed):** `background`/`brand` and `background`/`border` flagged by the raw token-pair sweep are fill/line colours, not text — WCAG text-contrast rules don't apply to them. `success`/`info` foreground-on-solid-fill pairs (3.29/3.72 in light) are large-text-only by the roadmap's own design intent (used at ≥18px in the one place they appear as solid fills) and were left as-is.

**Focus ring.** Confirmed `--ring` is the only ring token in use — no component defines a competing ring colour. No change needed.

**z-index scale.** Found four ad-hoc raw values (`z-50` ×2, `z-100` ×2) with no defined ordering — `mobile-nav.tsx`'s backdrop+panel and `command-palette.tsx` both used `z-100`, meaning if both ever opened together the DOM-order winner would be accidental, not designed. Added an ordered scale (`--z-index-sticky` 50 → `-dropdown` 60 → `-overlay` 90 → `-modal` 100 → `-command` 110 → `-toast` 120) and repointed all four usages plus `showcase-header.tsx`. Command palette now explicitly outranks the mobile-nav/dialog layer, matching the roadmap note that it "can open above a dialog."

**Elevation / shadow / radius.** Already adequate from Phase 1 (`--shadow-xs/sm/md/lg`, `--radius-sm` → `-3xl`) — audited, no gaps found, no change made.

**Layout tokens.** Added `--width-prose: 65ch` (unused until Phase 6 articles land, but the token needed to exist for §4.2's exit criteria). Formalized section-spacing rhythm as two utilities — `section-y` (5rem → 7rem at `md`, the Home-page standard) and `section-y-compact` (3.5rem → 5rem, the showcase/dense-block standard) — replacing nine components' bespoke `py-20 md:py-28` / `py-14 md:py-20` pairs with the named utility so the rhythm can't silently drift per-component.

**Responsive matrix.** Already satisfied — Tailwind's default breakpoints (640/768/1024/1280/1536) plus the existing `--breakpoint-3xl: 120rem` (1920px) cover all seven bands in the roadmap's matrix (320–374 through ≥1920). No change needed.

**Logical properties sweep.** Found and fixed two real bugs: `button.tsx`'s icon-padding modifiers (`has-data-[icon=inline-end]:pr-*`, `has-data-[icon=inline-start]:pl-*`) used physical Tailwind utilities despite already being keyed off logical `inline-start`/`inline-end` data attributes — in RTL this would have padded the wrong side. Changed to `pe-*`/`ps-*`. `command-palette.tsx` and `layout-section.tsx` used `text-left` on real (non-code) content; changed to `text-start`. `hero.tsx`'s `text-left` on the code panel was left as-is — it's a documented, correct exception (code always reads LTR, wrapped in `dir="ltr"`).

**Primitive review (§4.3 pre-check).** Button, Badge, Card, Input reviewed for keyboard/RTL/theme correctness. Button is built on Base UI's primitive (native `<button>` semantics, keyboard-activatable, disabled-state handled natively) with a visible `focus-visible` ring — no issues beyond the contrast/logical-property bugs above, now fixed. Card and Input had no issues. Badge is a non-interactive `<span>` (no keyboard concerns); its only issues were the contrast bugs above, now fixed.

**Minor content fix.** `colors-section.tsx`'s description still called the brand accent "blue" (stale from before the Phase 4.1 gold token switch) and didn't mention the ring/brand decoupling; corrected. Also added a "-text variants" swatch row to the same page so the five new AA-safe tokens are visible in `/design-system`.

## Verification

- `npm install` + `npx @tailwindcss/cli` compiled `app/globals.css` cleanly; spot-checked that every renamed/added class (`z-sticky`, `z-modal`, `z-command`, `text-brand-text`, `text-success-text`, `text-warning-text`, `text-info-text`, `text-destructive-text`, `section-y`, `section-y-compact`) appears in the compiled output with the intended values.
- `npx tsc --noEmit` — clean, no type errors from any of the above changes.
- All new token contrast values re-verified programmatically after the final edit (not just at the design stage) — every text/tint and text/surface pair now ≥4.5:1 in both themes.
- `next build` still fails in this sandbox on the `next/font` Google Fonts fetch (`fonts.googleapis.com` isn't reachable here) — pre-existing environment limitation noted in `PHASE-4.1-README.md`, unrelated to this session's changes, so full visual/E2E verification of `/design-system` wasn't possible here.

## Files changed

`app/globals.css`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/home/hero.tsx`, `components/home/featured-work.tsx`, `components/home/final-cta.tsx`, `components/home/services.tsx`, `components/home/about-preview.tsx`, `components/home/insights-preview.tsx`, `components/home/process.tsx`, `components/home/tech-stack.tsx`, `components/home/why-artaveo.tsx`, `components/home/capability-strip.tsx`, `components/home/section-header.tsx`, `components/site/site-footer.tsx`, `components/site/site-header.tsx`, `components/site/mobile-nav.tsx`, `components/site/command-palette.tsx`, `components/showcase/showcase-header.tsx`, `components/showcase/layout-section.tsx`, `components/showcase/section.tsx`, `components/showcase/typography-section.tsx`, `components/showcase/cards-section.tsx`, `components/showcase/forms-section.tsx`, `components/showcase/colors-section.tsx`.

## Debt / open items for §4.3–4.7

- §4.3's primitive list (Dialog, Sheet, Tabs, Table, etc.) should reuse the `-text` token pattern established here for any status-coloured text they introduce, rather than reintroducing raw-hue-on-tint.
- `section-y`/`section-y-compact` are not yet applied to `site-footer.tsx`'s `py-16` — left alone since it's a single fixed value, not part of the two-step rhythm; revisit if a third spacing step turns out to be needed.
- No owner decision needed for anything in this sub-phase — all changes are corrections against already-approved tokens (D-12), not new design decisions.

---

*See `PHASE-4.1-README.md` for §4.1 (Art Direction & Brand Identity).*
