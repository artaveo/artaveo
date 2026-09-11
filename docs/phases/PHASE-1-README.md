# PHASE 1 — Design System Foundation

## Status: ✅ COMPLETE (built pre-roadmap, with v0) — audit item P1-A now CLOSED, see below

This file is a retroactive record, added when §4.2 closed the one open item against this phase. Per `ROAD-MAP-ARTAVEO.md` § 5, Phase 1's historical status is preserved as-is; this file documents what was delivered and closes its only outstanding debt item, it does not re-litigate the phase.

## Delivered

Per `ROAD-MAP-ARTAVEO.md` § 5: OKLCH colour tokens for light/dark (`app/globals.css`), brand colour, typography with Geist / Geist Mono / Vazirmatn, spacing, radius, Button / Badge / Card / Input primitives, and a showcase page for colours, typography, spacing, layout, buttons, cards and forms (`/design-system`).

## Audit item P1-A — CLOSED in Phase 4.2

`ROAD-MAP-ARTAVEO.md` § 6.4 flagged this phase as "built with v0 — audit pending": the token set had never had a formal AA-contrast, focus-ring, RTL, or `lang="fa"` verification pass. That pass was P1-A, scheduled for § 4.2.

**Result:** run in Phase 4.2 (see `docs/phases/PHASE-4-README.md` for the full method and findings). Summary — the audit found and fixed real AA failures, most from token drift after Phase 1 rather than from Phase 1's original values: `--brand` used directly as text/icon colour in ~15 components (2.28:1, needed 4.5:1), three Badge status variants on tint backgrounds, and the Button `destructive` variant. Five new `-text` tokens were added to correct these without changing the Phase-1-approved fill tokens. Focus ring: confirmed `--ring` is the only ring token in use, no drift found. RTL: two physical-property bugs found in `button.tsx` (fixed to logical `ps-*`/`pe-*`).

`lang="fa"` → Vazirmatn: verified in `components/site/language-switcher.tsx` — switching sets both `document.documentElement.lang = 'fa'` and `dir = 'rtl'` together, and the font rule in `app/globals.css` keys off `:where([dir='rtl']) body` (not a `[lang='fa']` selector directly), so Vazirmatn does load whenever the switcher sets `lang="fa"`. Real locale routing with a server-set `lang`/`dir` (no client-side flip) is still Phase 5 work, not this audit's scope.

Full detail, numbers, and the complete list of files touched: `docs/phases/PHASE-4-README.md`.
